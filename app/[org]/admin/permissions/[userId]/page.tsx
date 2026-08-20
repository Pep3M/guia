"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft, Shield, AlertCircle, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import Link from "next/link"
import { useOrganization } from "@/lib/hooks/use-organization"

interface UserPermissionDetail {
  user: {
    id: string
    name: string | null
    email: string
    canUploadDocuments: boolean
    canCreateConversations: boolean
    canInviteUsers: boolean
  }
  role: string
  globalPermissions: {
    canUploadDocuments: boolean
    canCreateConversations: boolean
    canInviteUsers: boolean
  }
  orgOverrides: {
    canUploadDocuments: boolean | null
    canCreateConversations: boolean | null
    canInviteUsers: boolean | null
  } | null
  resolvedPermissions: {
    canUploadDocuments: boolean
    canCreateConversations: boolean
    canInviteUsers: boolean
    source: {
      canUploadDocuments: "global" | "organization"
      canCreateConversations: "global" | "organization"
      canInviteUsers: "global" | "organization"
    }
  }
}

const fetchUserPermissions = async (orgId: string, userId: string): Promise<UserPermissionDetail> => {
  const response = await fetch(
    `/api/organizations/${orgId}/admin/permissions/${userId}`
  )
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error fetching user permissions")
  }
  return response.json()
}

const updatePermission = async (
  orgId: string,
  userId: string,
  permission: "canUploadDocuments" | "canCreateConversations" | "canInviteUsers",
  value: boolean | null
) => {
  const response = await fetch(`/api/organizations/${orgId}/admin/permissions/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ [permission]: value }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error updating permission")
  }

  return response.json()
}

const deleteOrgOverrides = async (orgId: string, userId: string) => {
  const response = await fetch(`/api/organizations/${orgId}/admin/permissions/${userId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error deleting overrides")
  }

  return response.json()
}

export default function UserPermissionsDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgSlug = params.org as string
  const userId = params.userId as string
  const queryClient = useQueryClient()

  const { data: organization, isLoading: loadingOrg } = useOrganization(orgSlug)

  const { data: userPerms, isLoading: loadingPerms, error } = useQuery({
    queryKey: ["owner-user-permissions", organization?.id, userId],
    queryFn: () => fetchUserPermissions(organization!.id, userId),
    enabled: !!organization?.id && !!userId,
  })

  const updateMutation = useMutation({
    mutationFn: ({
      permission,
      value,
    }: {
      permission: "canUploadDocuments" | "canCreateConversations" | "canInviteUsers"
      value: boolean | null
    }) => updatePermission(organization!.id, userId, permission, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-user-permissions"] })
      queryClient.invalidateQueries({ queryKey: ["owner-permissions"] })
      toast.success("Permiso actualizado correctamente")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar permiso")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrgOverrides(organization!.id, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-user-permissions"] })
      queryClient.invalidateQueries({ queryKey: ["owner-permissions"] })
      toast.success("Overrides eliminados, usando permisos globales")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar overrides")
    },
  })

  const isLoading = loadingOrg || loadingPerms

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <p className="text-sm text-gray-500">Cargando permisos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Error al cargar permisos</p>
          <p className="text-sm text-gray-500">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  if (!userPerms) return null

  const hasOverrides = userPerms.orgOverrides !== null

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-4">
        <Link href={`/${orgSlug}/admin/permissions`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Permisos - {userPerms.user.name || userPerms.user.email}
          </h1>
          <p className="mt-1 text-sm text-gray-600">{userPerms.user.email}</p>
        </div>
        <Badge variant="outline" className="ml-auto">
          {userPerms.role}
        </Badge>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Información de Permisos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600">
            Los permisos se resuelven en este orden:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 ml-4">
            <li>Permisos específicos de la organización (si existen)</li>
            <li>Permisos globales del usuario</li>
          </ol>
          {hasOverrides && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Este usuario tiene overrides específicos de la
                organización. Puedes eliminarlos para volver a usar los permisos globales.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permissions Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Permisos Actuales (en desarrollo)</CardTitle>
            {hasOverrides && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                Eliminar Overrides
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Documents */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="upload-docs">Subir documentos</Label>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      userPerms.resolvedPermissions.source.canUploadDocuments ===
                      "organization"
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {userPerms.resolvedPermissions.source.canUploadDocuments ===
                    "organization"
                      ? "Organización"
                      : "Global"}
                  </Badge>
                  {userPerms.resolvedPermissions.canUploadDocuments ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              <Switch
                id="upload-docs"
                checked={userPerms.resolvedPermissions.canUploadDocuments}
                onCheckedChange={(checked) =>
                  updateMutation.mutate({
                    permission: "canUploadDocuments",
                    value: checked,
                  })
                }
                disabled={updateMutation.isPending || userPerms.role === "OWNER" || !userPerms.globalPermissions.canUploadDocuments}
              />
            </div>
            <div className="ml-4 text-sm text-gray-600 space-y-1">
              <p>
                <strong>Global:</strong>{" "}
                {userPerms.globalPermissions.canUploadDocuments ? "Permitido" : "Bloqueado"}
              </p>
              {userPerms.orgOverrides?.canUploadDocuments !== null && (
                <p>
                  <strong>Organización:</strong>{" "}
                  {userPerms.orgOverrides?.canUploadDocuments
                    ? "Permitido"
                    : "Bloqueado"}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                <strong>Resultado:</strong>{" "}
                {userPerms.resolvedPermissions.canUploadDocuments
                  ? "Permitido"
                  : "Bloqueado"}{" "}
                (usando{" "}
                {userPerms.resolvedPermissions.source.canUploadDocuments ===
                "organization"
                  ? "permisos de organización"
                  : "permisos globales"}
                )
              </p>
            </div>
          </div>

          {/* Create Conversations */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="create-conversations">Crear conversaciones</Label>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      userPerms.resolvedPermissions.source.canCreateConversations ===
                      "organization"
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {userPerms.resolvedPermissions.source.canCreateConversations ===
                    "organization"
                      ? "Organización"
                      : "Global"}
                  </Badge>
                  {userPerms.resolvedPermissions.canCreateConversations ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              <Switch
                id="create-conversations"
                checked={userPerms.resolvedPermissions.canCreateConversations}
                onCheckedChange={(checked) =>
                  updateMutation.mutate({
                    permission: "canCreateConversations",
                    value: checked,
                  })
                }
                disabled={updateMutation.isPending || userPerms.role === "OWNER" || !userPerms.globalPermissions.canCreateConversations}
              />
            </div>
            <div className="ml-4 text-sm text-gray-600 space-y-1">
              <p>
                <strong>Global:</strong>{" "}
                {userPerms.globalPermissions.canCreateConversations
                  ? "Permitido"
                  : "Bloqueado"}
              </p>
              {userPerms.orgOverrides?.canCreateConversations !== null && (
                <p>
                  <strong>Organización:</strong>{" "}
                  {userPerms.orgOverrides?.canCreateConversations
                    ? "Permitido"
                    : "Bloqueado"}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                <strong>Resultado:</strong>{" "}
                {userPerms.resolvedPermissions.canCreateConversations
                  ? "Permitido"
                  : "Bloqueado"}{" "}
                (usando{" "}
                {userPerms.resolvedPermissions.source.canCreateConversations ===
                "organization"
                  ? "permisos de organización"
                  : "permisos globales"}
                )
              </p>
            </div>
          </div>

          {/* Invite Users */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="invite-users">Invitar usuarios</Label>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      userPerms.resolvedPermissions.source.canInviteUsers ===
                      "organization"
                        ? "default"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {userPerms.resolvedPermissions.source.canInviteUsers ===
                    "organization"
                      ? "Organización"
                      : "Global"}
                  </Badge>
                  {userPerms.resolvedPermissions.canInviteUsers ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              <Switch
                id="invite-users"
                checked={userPerms.resolvedPermissions.canInviteUsers}
                onCheckedChange={(checked) =>
                  updateMutation.mutate({
                    permission: "canInviteUsers",
                    value: checked,
                  })
                }
                disabled={updateMutation.isPending || userPerms.role === "OWNER" || !userPerms.globalPermissions.canInviteUsers}
              />
            </div>
            <div className="ml-4 text-sm text-gray-600 space-y-1">
              <p>
                <strong>Global:</strong>{" "}
                {userPerms.globalPermissions.canInviteUsers ? "Permitido" : "Bloqueado"}
              </p>
              {userPerms.orgOverrides?.canInviteUsers !== null && (
                <p>
                  <strong>Organización:</strong>{" "}
                  {userPerms.orgOverrides?.canInviteUsers ? "Permitido" : "Bloqueado"}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                <strong>Resultado:</strong>{" "}
                {userPerms.resolvedPermissions.canInviteUsers ? "Permitido" : "Bloqueado"}{" "}
                (usando{" "}
                {userPerms.resolvedPermissions.source.canInviteUsers === "organization"
                  ? "permisos de organización"
                  : "permisos globales"}
                )
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

