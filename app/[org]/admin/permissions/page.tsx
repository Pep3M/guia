"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Shield, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useState } from "react"
import Link from "next/link"
import { useOrganization } from "@/lib/hooks/use-organization"

interface UserPermissions {
  userId: string
  user: {
    id: string
    name: string | null
    email: string
    canUploadDocuments: boolean
    canCreateConversations: boolean
    canInviteUsers: boolean
  }
  role: string
  permissions: {
    canUploadDocuments: boolean
    canCreateConversations: boolean
    canInviteUsers: boolean
    source: {
      canUploadDocuments: "global" | "organization"
      canCreateConversations: "global" | "organization"
      canInviteUsers: "global" | "organization"
    }
  }
  orgOverrides: {
    canUploadDocuments: boolean | null
    canCreateConversations: boolean | null
    canInviteUsers: boolean | null
  } | null
}

interface PermissionsData {
  users: UserPermissions[]
}

const fetchPermissions = async (orgId: string): Promise<PermissionsData> => {
  const response = await fetch(`/api/organizations/${orgId}/admin/permissions`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error fetching permissions")
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

export default function PermissionsPage() {
  const params = useParams()
  const orgSlug = params.org as string
  const queryClient = useQueryClient()

  const { data: organization, isLoading: loadingOrg } = useOrganization(orgSlug)
  const [searchQuery, setSearchQuery] = useState("")

  const { data: permissionsData, isLoading: loadingPermissions, error } = useQuery({
    queryKey: ["owner-permissions", organization?.id],
    queryFn: () => fetchPermissions(organization!.id),
    enabled: !!organization?.id,
  })

  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      permission,
      value,
    }: {
      userId: string
      permission: "canUploadDocuments" | "canCreateConversations" | "canInviteUsers"
      value: boolean | null
    }) => updatePermission(organization!.id, userId, permission, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-permissions"] })
      toast.success("Permiso actualizado correctamente")
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar permiso")
    },
  })

  const isLoading = loadingOrg || loadingPermissions

  // Filter by search query
  const filteredUsers = permissionsData?.users.filter((user) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.user.name?.toLowerCase().includes(query) ||
      user.user.email.toLowerCase().includes(query)
    )
  })

  const getPermissionSource = (
    permission: "canUploadDocuments" | "canCreateConversations" | "canInviteUsers",
    user: UserPermissions
  ): "global" | "organization" => {
    return user.permissions.source[permission]
  }

  const getCurrentPermissionValue = (
    permission: "canUploadDocuments" | "canCreateConversations" | "canInviteUsers",
    user: UserPermissions
  ): boolean => {
    return user.permissions[permission]
  }

  const handlePermissionToggle = (
    userId: string,
    permission: "canUploadDocuments" | "canCreateConversations" | "canInviteUsers",
    currentValue: boolean,
    source: "global" | "organization"
  ) => {
    // If source is global, create org override with opposite value
    // If source is organization, update the override (or set to null to revert)
    if (source === "global") {
      updateMutation.mutate({ userId, permission, value: !currentValue })
    } else {
      // If it's an org override, we can toggle it or set to null to revert to global
      updateMutation.mutate({ userId, permission, value: !currentValue })
    }
  }

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

  if (!permissionsData) return null

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Permisos de Usuarios
        </h1>
        <p className="mt-2 text-sm md:text-base text-gray-600">
          Gestiona permisos granulares para usuarios de {organization?.name}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Permissions Table */}
      <div className="space-y-4">
        {filteredUsers && filteredUsers.length > 0 ? (
          filteredUsers.map((userPerms) => (
            <Card key={userPerms.userId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {userPerms.user.name || userPerms.user.email}
                      <Badge variant="outline">{userPerms.role}</Badge>
                    </CardTitle>
                    <p className="mt-1 text-sm text-gray-500">
                      {userPerms.user.email}
                    </p>
                  </div>
                  <Link
                    href={`/${orgSlug}/admin/permissions/${userPerms.userId}`}
                  >
                    <Button variant="outline" size="sm">
                      Ver detalle
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Upload Documents */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`upload-${userPerms.userId}`}>
                      Subir documentos
                    </Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">
                        {getCurrentPermissionValue("canUploadDocuments", userPerms)
                          ? "Permitido"
                          : "Bloqueado"}
                      </p>
                      <Badge
                        variant={
                          getPermissionSource("canUploadDocuments", userPerms) ===
                          "organization"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {getPermissionSource("canUploadDocuments", userPerms) ===
                        "organization"
                          ? "Org"
                          : "Global"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    id={`upload-${userPerms.userId}`}
                    checked={getCurrentPermissionValue("canUploadDocuments", userPerms)}
                    onCheckedChange={() =>
                      handlePermissionToggle(
                        userPerms.userId,
                        "canUploadDocuments",
                        getCurrentPermissionValue("canUploadDocuments", userPerms),
                        getPermissionSource("canUploadDocuments", userPerms)
                      )
                    }
                    disabled={updateMutation.isPending || userPerms.role === "OWNER" || !userPerms.user.canUploadDocuments}
                  />
                </div>

                {/* Create Conversations */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`conversations-${userPerms.userId}`}>
                      Crear conversaciones
                    </Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">
                        {getCurrentPermissionValue("canCreateConversations", userPerms)
                          ? "Permitido"
                          : "Bloqueado"}
                      </p>
                      <Badge
                        variant={
                          getPermissionSource("canCreateConversations", userPerms) ===
                          "organization"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {getPermissionSource("canCreateConversations", userPerms) ===
                        "organization"
                          ? "Org"
                          : "Global"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    id={`conversations-${userPerms.userId}`}
                    checked={getCurrentPermissionValue("canCreateConversations", userPerms)}
                    onCheckedChange={() =>
                      handlePermissionToggle(
                        userPerms.userId,
                        "canCreateConversations",
                        getCurrentPermissionValue("canCreateConversations", userPerms),
                        getPermissionSource("canCreateConversations", userPerms)
                      )
                    }
                    disabled={updateMutation.isPending || userPerms.role === "OWNER" || !userPerms.user.canCreateConversations}
                  />
                </div>

                {/* Invite Users */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={`invite-${userPerms.userId}`}>
                      Invitar usuarios
                    </Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-500">
                        {getCurrentPermissionValue("canInviteUsers", userPerms)
                          ? "Permitido"
                          : "Bloqueado"}
                      </p>
                      <Badge
                        variant={
                          getPermissionSource("canInviteUsers", userPerms) ===
                          "organization"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {getPermissionSource("canInviteUsers", userPerms) === "organization"
                          ? "Org"
                          : "Global"}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    id={`invite-${userPerms.userId}`}
                    checked={getCurrentPermissionValue("canInviteUsers", userPerms)}
                    onCheckedChange={() =>
                      handlePermissionToggle(
                        userPerms.userId,
                        "canInviteUsers",
                        getCurrentPermissionValue("canInviteUsers", userPerms),
                        getPermissionSource("canInviteUsers", userPerms)
                      )
                    }
                    disabled={updateMutation.isPending || userPerms.role === "OWNER" || !userPerms.user.canInviteUsers}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No se encontraron usuarios</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

