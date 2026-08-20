"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MemberAccessGuard } from "@/components/member-access-guard"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { translateRole } from "@/lib/utils"

interface Organization {
  id: string
  slug: string
}

interface Member {
  id: string
  role: string
  user: {
    id: string
    email: string
    name: string | null
    image: string | null
  }
}

interface Invitation {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

const fetchOrganizations = async (): Promise<Organization[]> => {
  const response = await fetch("/api/organizations")
  if (!response.ok) throw new Error("Error getting organizations")
  return response.json()
}

const fetchMembers = async (orgId: string): Promise<Member[]> => {
  const response = await fetch(`/api/organizations/by-id/${orgId}/members`)
  if (!response.ok) throw new Error("Error fetching members")
  return response.json()
}

const fetchInvitations = async (orgId: string): Promise<Invitation[]> => {
  const response = await fetch(`/api/organizations/by-id/${orgId}/invitations`)
  if (!response.ok) throw new Error("Error fetching invitations")
  return response.json()
}

const inviteMember = async ({
  orgId,
  email,
  role,
}: {
  orgId: string
  email: string
  role: "ADMIN" | "MEMBER"
}) => {
  const response = await fetch(`/api/organizations/by-id/${orgId}/invitations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || "Error al enviar invitación")
  }

  return response.json()
}

const removeMember = async ({ orgId, memberId }: { orgId: string; memberId: string }) => {
  const response = await fetch(`/api/organizations/by-id/${orgId}/members/${memberId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || "Error al eliminar miembro")
  }

  return response.json()
}

export default function TeamPage() {
  const params = useParams()
  const orgSlug = params.org as string

  return (
    <MemberAccessGuard orgSlug={orgSlug} allowedRoles={["OWNER", "ADMIN"]}>
      <TeamPageContent orgSlug={orgSlug} />
    </MemberAccessGuard>
  )
}

function TeamPageContent({ orgSlug }: { orgSlug: string }) {
  const queryClient = useQueryClient()

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER")

  // Get organization
  const { data: organizations } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  })

  const currentOrg = organizations?.find((o) => o.slug === orgSlug)
  const orgId = currentOrg?.id

  // Fetch members
  const { data: members = [], isLoading: isLoadingMembers } = useQuery({
    queryKey: ["members", orgId],
    queryFn: () => fetchMembers(orgId!),
    enabled: !!orgId,
  })

  // Fetch invitations
  const { data: invitations = [], isLoading: isLoadingInvitations } = useQuery({
    queryKey: ["invitations", orgId],
    queryFn: () => fetchInvitations(orgId!),
    enabled: !!orgId,
  })

  const isLoading = isLoadingMembers || isLoadingInvitations

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: inviteMember,
    onSuccess: () => {
      toast.success("Invitación enviada exitosamente")
      setIsInviteDialogOpen(false)
      setInviteEmail("")
      setInviteRole("MEMBER")
      queryClient.invalidateQueries({ queryKey: ["invitations", orgId] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: () => {
      toast.success("Miembro eliminado exitosamente")
      queryClient.invalidateQueries({ queryKey: ["members", orgId] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return

    inviteMutation.mutate({ orgId, email: inviteEmail, role: inviteRole })
  }

  const handleRemoveMember = (memberId: string) => {
    if (!orgId) return
    if (!confirm("¿Estás seguro de que quieres eliminar este miembro?")) return

    removeMutation.mutate({ orgId, memberId })
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">Cargando equipo...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Equipo</h1>
          <p className="text-muted-foreground">Administra los miembros y permisos de tu organización</p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>Invitar miembro</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar nuevo miembro</DialogTitle>
              <DialogDescription>
                Envía una invitación por email para añadir un nuevo miembro al equipo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={inviteMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <select
                  id="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={inviteMutation.isPending}
                >
                  <option value="MEMBER">Miembro</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteDialogOpen(false)}
                  disabled={inviteMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  {inviteMutation.isPending ? "Enviando..." : "Enviar invitación"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Miembros ({members.length})</CardTitle>
            <CardDescription>Usuarios activos en tu organización</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{member.user.name || member.user.email}</p>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {translateRole(member.role)}
                    </span>
                    {member.role !== "OWNER" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invitaciones pendientes ({invitations.length})</CardTitle>
            <CardDescription>Invitaciones que aún no han sido aceptadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay invitaciones pendientes</p>
              ) : (
                invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expira: {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                      {translateRole(invitation.role)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

