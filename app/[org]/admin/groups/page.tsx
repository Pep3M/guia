'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Users, Settings, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useOrganization } from '@/lib/hooks/use-organization'
import Link from 'next/link'

interface Group {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count: {
    members: number
    categoryAccess: number
  }
}

const fetchGroups = async (orgId: string): Promise<Group[]> => {
  const response = await fetch(`/api/organizations/${orgId}/groups`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error fetching groups')
  }
  return response.json()
}

const createGroup = async (orgId: string, data: { name: string; description?: string | null }) => {
  const response = await fetch(`/api/organizations/${orgId}/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error creating group')
  }

  return response.json()
}

const deleteGroup = async (orgId: string, groupId: string) => {
  const response = await fetch(`/api/organizations/${orgId}/groups/${groupId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error deleting group')
  }

  return response.json()
}

export default function GroupsPage() {
  const params = useParams()
  const router = useRouter()
  const orgSlug = params.org as string
  const queryClient = useQueryClient()
  const { data: organization, isLoading: loadingOrg } = useOrganization(orgSlug)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['groups', organization?.id],
    queryFn: () => fetchGroups(organization!.id),
    enabled: !!organization?.id,
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string | null }) =>
      createGroup(organization!.id, data),
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ['groups', organization?.id] })
      setIsCreateDialogOpen(false)
      toast.success('Grupo creado exitosamente')
      // Navigate to the new group detail page
      router.push(`/${orgSlug}/admin/groups/${newGroup.id}`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => deleteGroup(organization!.id, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', organization?.id] })
      setDeletingGroupId(null)
      toast.success('Grupo eliminado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const isLoading = loadingOrg || loadingGroups

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <p className="text-sm text-gray-500">Cargando grupos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Grupos</h1>
          <p className="mt-2 text-sm md:text-base text-gray-600">
            Organiza usuarios en grupos y gestiona su acceso a categorías en {organization?.name}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Grupo
            </Button>
          </DialogTrigger>
          <CreateGroupDialog
            onSubmit={(data) => {
              createMutation.mutate(data)
            }}
            isPending={createMutation.isPending}
          />
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">No hay grupos creados</p>
            <p className="mt-2 text-sm text-gray-400">Crea tu primer grupo para organizar usuarios y gestionar acceso</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingGroupId(group.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {group.description && (
                  <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                )}
                <div className="flex items-center gap-4 mb-4">
                  <Badge variant="secondary">
                    <Users className="mr-1 h-3 w-3" />
                    {group._count.members} miembro{group._count.members !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="secondary">
                    {group._count.categoryAccess} categoría{group._count.categoryAccess !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <Link href={`/${orgSlug}/admin/groups/${group.id}`}>
                  <Button variant="outline" className="w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Gestionar
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingGroupId} onOpenChange={(open) => !open && setDeletingGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el grupo y todos sus miembros perderán el acceso asociado.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingGroupId && deleteMutation.mutate(deletingGroupId)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                'Eliminar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CreateGroupDialog({ onSubmit, isPending }: { onSubmit: (data: { name: string; description?: string | null }) => void; isPending: boolean }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
    })
    setName('')
    setDescription('')
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nuevo Grupo</DialogTitle>
        <DialogDescription>Crea un nuevo grupo para organizar usuarios y gestionar acceso a categorías</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Equipo de Ventas"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción opcional del grupo"
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onSubmit({ name: '', description: null })}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear'
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}

