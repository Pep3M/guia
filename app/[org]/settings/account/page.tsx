"use client"

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { compressAvatarFile } from "@/lib/account/client-image"
import { useSession } from "@/lib/auth/auth-client"

interface OrganizationSummary {
  id: string
  name: string
  slug: string
  role: string
}

interface AvatarResponse {
  imageUrl: string
  remaining: number
  dailyLimit: number
  uploadsToday?: number
}

const fetchOrganizations = async (): Promise<OrganizationSummary[]> => {
  const response = await fetch("/api/organizations")

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || "Error al obtener las organizaciones")
  }

  return response.json()
}

const updateUserProfile = async (payload: { name?: string }): Promise<void> => {
  const response = await fetch("/api/auth/update-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || data?.error) {
    throw new Error(data?.error || "No se pudo actualizar el perfil")
  }
}

const changePassword = async (payload: { currentPassword: string; newPassword: string }): Promise<void> => {
  const response = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
      revokeOtherSessions: true,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || data?.error) {
    throw new Error(data?.error || "No se pudo cambiar la contraseña")
  }
}

const uploadAvatar = async (formData: FormData): Promise<AvatarResponse> => {
  const response = await fetch("/api/account/avatar", {
    method: "POST",
    body: formData,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || data?.error) {
    const errorMessage = data?.error || "No se pudo actualizar el avatar"
    const error = new Error(errorMessage)
    ;(error as any).payload = data
    throw error
  }

  return data as AvatarResponse
}

const leaveOrganization = async (orgId: string) => {
  const response = await fetch(`/api/organizations/${orgId}/membership`, {
    method: "DELETE",
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok || data?.error) {
    throw new Error(data?.error || "No se pudo abandonar la organización")
  }
}

const getAvatarInitials = (value?: string | null): string => {
  if (!value) {
    return "U"
  }

  return value
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join("")
    .slice(0, 2) || "U"
}

export default function AccountSettingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session, refetch: refetchSession } = useSession()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState<string>(session?.user?.name ?? "")
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(session?.user?.image ?? undefined)
  const [remainingUploads, setRemainingUploads] = useState<number | undefined>()
  const [dailyLimit, setDailyLimit] = useState<number | undefined>()
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | undefined>()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  useEffect(() => {
    refetchSession()
  }, [refetchSession])

  useEffect(() => {
    setDisplayName(session?.user?.name ?? "")
    if (!pendingAvatarFile) {
      setAvatarUrl(session?.user?.image ?? undefined)
    }
  }, [session?.user?.name, session?.user?.image, pendingAvatarFile])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
    }
  }, [avatarPreviewUrl])

  const organizationsQuery = useQuery({
    queryKey: ["account-organizations"],
    queryFn: fetchOrganizations,
  })

  const updateProfileMutation = useMutation({
    mutationFn: async ({ name, avatarFile }: { name?: string; avatarFile?: File | null }) => {
      let avatarResponse: AvatarResponse | undefined

      if (avatarFile) {
        const formData = new FormData()
        formData.append("avatar", avatarFile, avatarFile.name)
        avatarResponse = await uploadAvatar(formData)
      }

      if (typeof name !== "undefined") {
        await updateUserProfile({ name })
      }

      return avatarResponse
    },
    onSuccess: async (avatarResponse) => {
      if (avatarResponse) {
        setAvatarUrl(avatarResponse.imageUrl)
        setRemainingUploads(avatarResponse.remaining)
        setDailyLimit(avatarResponse.dailyLimit)
      }

      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl)
        setAvatarPreviewUrl(undefined)
      }
      setPendingAvatarFile(null)

      toast.success("Perfil actualizado correctamente")
      await refetchSession()
      await queryClient.invalidateQueries({ queryKey: ["account-organizations"] })
      router.refresh()
    },
    onError: (error: Error) => {
      const payload = (error as any)?.payload

      if (payload?.remaining === 0 && typeof payload?.dailyLimit !== "undefined") {
        toast.error(`Has alcanzado el límite diario de ${payload.dailyLimit} cambios de avatar.`)
      } else {
        toast.error(error.message)
      }

      if (pendingAvatarFile) {
        setPendingAvatarFile(null)
        if (avatarPreviewUrl) {
          URL.revokeObjectURL(avatarPreviewUrl)
        }
        setAvatarPreviewUrl(undefined)
        setAvatarUrl(session?.user?.image ?? undefined)
      }
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      toast.success("Contraseña actualizada")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const leaveOrganizationMutation = useMutation({
    mutationFn: leaveOrganization,
    onSuccess: async () => {
      toast.success("Has abandonado la organización")
      await queryClient.invalidateQueries({ queryKey: ["account-organizations"] })
      router.refresh()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const compressed = await compressAvatarFile(file)
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
      const previewUrl = URL.createObjectURL(compressed)
      setPendingAvatarFile(compressed)
      setAvatarPreviewUrl(previewUrl)
      setAvatarUrl(previewUrl)
      toast.info("Avatar listo para guardar")
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo preparar el avatar"
      toast.error(message)
    } finally {
      event.target.value = ""
    }
  }

  const handleProfileSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = displayName.trim()
    const nameChanged = trimmedName !== (session?.user?.name ?? "")

    if (!nameChanged && !pendingAvatarFile) {
      toast.info("No hay cambios para guardar")
      return
    }

    updateProfileMutation.mutate({
      name: nameChanged ? trimmedName : undefined,
      avatarFile: pendingAvatarFile,
    })
  }

  const handlePasswordSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    })
  }

  const organizations = useMemo(() => organizationsQuery.data ?? [], [organizationsQuery.data])
  const isLoadingOrganizations = organizationsQuery.isLoading

  // const renderRemainingUploads = () => {
  //   if (typeof dailyLimit === "undefined" || typeof remainingUploads === "undefined") {
  //     return null
  //   }

  //   if (!Number.isFinite(dailyLimit)) {
  //     return <p className="text-xs text-muted-foreground">Subidas ilimitadas disponibles</p>
  //   }

  //   return (
  //     <p className="text-xs text-muted-foreground">
  //       Cambios restantes hoy: {Math.max(remainingUploads, 0)} / {dailyLimit}
  //     </p>
  //   )
  // }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Mi Cuenta</h1>
        <p className="text-muted-foreground">Gestiona tu información personal, seguridad y organizaciones</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Actualiza tu nombre y foto de perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName || session?.user?.email || "Usuario"} /> : null}
                <AvatarFallback>{getAvatarInitials(displayName || session?.user?.email)}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <Button type="button" variant="outline" onClick={handleOpenFilePicker}>
                  Cambiar avatar
                </Button>
                {typeof dailyLimit !== "undefined" && typeof remainingUploads !== "undefined" ? (
                  Number.isFinite(dailyLimit) ? (
                    <p className="text-xs text-muted-foreground">
                      Cambios restantes hoy: {Math.max(remainingUploads, 0)} / {dailyLimit}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Subidas ilimitadas disponibles</p>
                  )
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4" aria-label="Actualizar perfil">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Tu nombre"
                  disabled={updateProfileMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={session?.user?.email ?? ""} disabled readOnly />
              </div>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
            <CardDescription>Cambia tu contraseña para mantener tu cuenta segura</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4" aria-label="Cambiar contraseña">
              <div className="space-y-2">
                <Label htmlFor="current-password">Contraseña actual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={changePasswordMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={changePasswordMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={changePasswordMutation.isPending}
                />
              </div>
              <Button type="submit" disabled={changePasswordMutation.isPending}>
                {changePasswordMutation.isPending ? "Guardando..." : "Actualizar contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizaciones</CardTitle>
          <CardDescription>Gestiona tu pertenencia a organizaciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingOrganizations ? (
            <p className="text-sm text-muted-foreground">Cargando organizaciones...</p>
          ) : organizations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Actualmente no perteneces a ninguna organización.</p>
          ) : (
            <ul className="space-y-3">
              {organizations.map((organization) => (
                <li key={organization.id} className="flex flex-col gap-2 rounded-md border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{organization.name}</p>
                    <p className="text-xs text-muted-foreground">Rol: {organization.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        const confirmed = window.confirm("¿Seguro que deseas abandonar esta organización?")
                        if (!confirmed) {
                          return
                        }
                        leaveOrganizationMutation.mutate(organization.id)
                      }}
                      disabled={leaveOrganizationMutation.isPending}
                    >
                      {leaveOrganizationMutation.isPending ? "Procesando..." : "Abandonar"}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
