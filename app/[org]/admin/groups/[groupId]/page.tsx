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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Loader2, ArrowLeft, Plus, X, Users, Tag, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useOrganization } from '@/lib/hooks/use-organization'
import Link from 'next/link'

interface GroupMember {
  id: string
  userId: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface CategoryAccess {
  id: string
  categoryId: string
  category: {
    id: string
    name: string
    color: string | null
  }
}

interface GroupDetail {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  members: GroupMember[]
  categoryAccess: CategoryAccess[]
}

interface Member {
  id: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface Category {
  id: string
  name: string
  color: string | null
}

const fetchGroup = async (orgId: string, groupId: string): Promise<GroupDetail> => {
  const response = await fetch(`/api/organizations/${orgId}/groups/${groupId}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error fetching group')
  }
  return response.json()
}

const fetchMembers = async (orgId: string): Promise<Member[]> => {
  const response = await fetch(`/api/organizations/by-id/${orgId}/members`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error fetching members')
  }
  return response.json()
}

const fetchCategories = async (orgId: string): Promise<Category[]> => {
  const response = await fetch(`/api/organizations/${orgId}/categories`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error fetching categories')
  }
  return response.json()
}

const addMember = async (orgId: string, groupId: string, userId: string) => {
  const response = await fetch(`/api/organizations/${orgId}/groups/${groupId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error adding member')
  }

  return response.json()
}

const removeMember = async (orgId: string, groupId: string, userId: string) => {
  const response = await fetch(`/api/organizations/${orgId}/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error removing member')
  }

  return response.json()
}

const addCategoryAccess = async (orgId: string, groupId: string, categoryId: string) => {
  const response = await fetch(`/api/organizations/${orgId}/groups/${groupId}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoryId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error adding category access')
  }

  return response.json()
}

const removeCategoryAccess = async (orgId: string, groupId: string, categoryId: string) => {
  const response = await fetch(`/api/organizations/${orgId}/groups/${groupId}/categories/${categoryId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error removing category access')
  }

  return response.json()
}

const updateGroup = async (orgId: string, groupId: string, data: { name?: string; description?: string | null }) => {
  const response = await fetch(`/api/organizations/${orgId}/groups/${groupId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error updating group')
  }

  return response.json()
}

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orgSlug = params.org as string
  const groupId = params.groupId as string
  const queryClient = useQueryClient()
  const { data: organization, isLoading: loadingOrg } = useOrganization(orgSlug)

  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  const { data: group, isLoading: loadingGroup } = useQuery({
    queryKey: ['group', organization?.id, groupId],
    queryFn: () => fetchGroup(organization!.id, groupId),
    enabled: !!organization?.id && !!groupId,
  })

  const { data: members = [] } = useQuery({
    queryKey: ['members', organization?.id],
    queryFn: () => fetchMembers(organization!.id),
    enabled: !!organization?.id,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', organization?.id],
    queryFn: () => fetchCategories(organization!.id),
    enabled: !!organization?.id,
  })

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => addMember(organization!.id, groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', organization?.id, groupId] })
      setIsAddMemberDialogOpen(false)
      setSelectedUserId('')
      toast.success('Miembro agregado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeMember(organization!.id, groupId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', organization?.id, groupId] })
      toast.success('Miembro removido exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const addCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => addCategoryAccess(organization!.id, groupId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', organization?.id, groupId] })
      setIsAddCategoryDialogOpen(false)
      setSelectedCategoryId('')
      toast.success('Acceso a categoría agregado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const removeCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => removeCategoryAccess(organization!.id, groupId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', organization?.id, groupId] })
      toast.success('Acceso a categoría removido exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateGroupMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string | null }) =>
      updateGroup(organization!.id, groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', organization?.id, groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups', organization?.id] })
      setIsEditDialogOpen(false)
      toast.success('Grupo actualizado exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const isLoading = loadingOrg || loadingGroup

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <p className="text-sm text-gray-500">Cargando grupo...</p>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Grupo no encontrado</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Get members not in the group
  const groupMemberIds = new Set(group.members.map((m) => m.userId))
  const availableMembers = members.filter((m) => !groupMemberIds.has(m.user.id))

  // Get categories not in the group
  const groupCategoryIds = new Set(group.categoryAccess.map((ca) => ca.categoryId))
  const availableCategories = categories.filter((c) => !groupCategoryIds.has(c.id))

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-4">
        <Link href={`/${orgSlug}/admin/groups`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{group.name}</h1>
          {group.description && (
            <p className="mt-2 text-sm md:text-base text-gray-600">{group.description}</p>
          )}
        </div>
        <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
          <Settings className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Members Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Miembros ({group.members.length})
              </CardTitle>
              <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={availableMembers.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Miembro</DialogTitle>
                    <DialogDescription>Selecciona un miembro de la organización para agregar al grupo</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Miembro</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un miembro" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableMembers.map((member) => (
                            <SelectItem key={member.user.id} value={member.user.id}>
                              {member.user.name || member.user.email} ({member.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddMemberDialogOpen(false)
                          setSelectedUserId('')
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => {
                          if (selectedUserId) {
                            addMemberMutation.mutate(selectedUserId)
                          }
                        }}
                        disabled={!selectedUserId || addMemberMutation.isPending}
                      >
                        {addMemberMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Agregando...
                          </>
                        ) : (
                          'Agregar'
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {group.members.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay miembros en este grupo</p>
            ) : (
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{member.user.name || member.user.email}</p>
                      <p className="text-sm text-gray-500">{member.user.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMemberMutation.mutate(member.userId)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Categorías ({group.categoryAccess.length})
              </CardTitle>
              <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={availableCategories.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar Acceso a Categoría</DialogTitle>
                    <DialogDescription>Selecciona una categoría para dar acceso al grupo</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Categoría</Label>
                      <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              <div className="flex items-center gap-2">
                                {category.color && (
                                  <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: category.color }}
                                  />
                                )}
                                {category.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddCategoryDialogOpen(false)
                          setSelectedCategoryId('')
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => {
                          if (selectedCategoryId) {
                            addCategoryMutation.mutate(selectedCategoryId)
                          }
                        }}
                        disabled={!selectedCategoryId || addCategoryMutation.isPending}
                      >
                        {addCategoryMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Agregando...
                          </>
                        ) : (
                          'Agregar'
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {group.categoryAccess.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No hay categorías asignadas</p>
            ) : (
              <div className="space-y-2">
                {group.categoryAccess.map((access) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      {access.category.color && (
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: access.category.color }}
                        />
                      )}
                      <p className="font-medium">{access.category.name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCategoryMutation.mutate(access.categoryId)}
                      disabled={removeCategoryMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      {isEditDialogOpen && (
        <EditGroupDialog
          group={group}
          onSubmit={(data) => {
            updateGroupMutation.mutate(data)
          }}
          onClose={() => setIsEditDialogOpen(false)}
          isPending={updateGroupMutation.isPending}
        />
      )}
    </div>
  )
}

function EditGroupDialog({
  group,
  onSubmit,
  onClose,
  isPending,
}: {
  group: GroupDetail
  onSubmit: (data: { name?: string; description?: string | null }) => void
  onClose: () => void
  isPending: boolean
}) {
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description || '')

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
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Grupo</DialogTitle>
          <DialogDescription>Modifica los detalles del grupo</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Equipo de Ventas"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descripción</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional del grupo"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

