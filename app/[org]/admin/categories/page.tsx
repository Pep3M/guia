'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
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
import { Loader2, Plus, Edit, Trash2, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { useOrganization } from '@/lib/hooks/use-organization'

interface Category {
  id: string
  name: string
  description: string | null
  color: string | null
  createdAt: string
  updatedAt: string
  _count: {
    sourceCategories: number
  }
}

const fetchCategories = async (orgId: string): Promise<Category[]> => {
  const response = await fetch(`/api/organizations/${orgId}/categories`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error fetching categories')
  }
  return response.json()
}

const createCategory = async (orgId: string, data: { name: string; description?: string | null; color?: string | null }) => {
  const response = await fetch(`/api/organizations/${orgId}/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error creating category')
  }

  return response.json()
}

const updateCategory = async (orgId: string, categoryId: string, data: { name?: string; description?: string | null; color?: string | null }) => {
  const response = await fetch(`/api/organizations/${orgId}/categories/${categoryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error updating category')
  }

  return response.json()
}

const deleteCategory = async (orgId: string, categoryId: string) => {
  const response = await fetch(`/api/organizations/${orgId}/categories/${categoryId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error deleting category')
  }

  return response.json()
}

export default function CategoriesPage() {
  const params = useParams()
  const orgSlug = params.org as string
  const queryClient = useQueryClient()
  const { data: organization, isLoading: loadingOrg } = useOrganization(orgSlug)

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null)

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories', organization?.id],
    queryFn: () => fetchCategories(organization!.id),
    enabled: !!organization?.id,
  })

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string | null; color?: string | null }) =>
      createCategory(organization!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', organization?.id] })
      setIsCreateDialogOpen(false)
      toast.success('Categoría creada exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: string; data: { name?: string; description?: string | null; color?: string | null } }) =>
      updateCategory(organization!.id, categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', organization?.id] })
      setEditingCategory(null)
      toast.success('Categoría actualizada exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => deleteCategory(organization!.id, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', organization?.id] })
      setDeletingCategoryId(null)
      toast.success('Categoría eliminada exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const isLoading = loadingOrg || loadingCategories

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <p className="text-sm text-gray-500">Cargando categorías...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Categorías</h1>
          <p className="mt-2 text-sm md:text-base text-gray-600">
            Organiza tus documentos por categorías en {organization?.name}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Categoría
            </Button>
          </DialogTrigger>
          <CreateCategoryDialog
            onSubmit={(data) => {
              createMutation.mutate(data)
            }}
            isPending={createMutation.isPending}
          />
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Tag className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-gray-500">No hay categorías creadas</p>
            <p className="mt-2 text-sm text-gray-400">Crea tu primera categoría para organizar tus documentos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    {category.color && (
                      <div
                        className="h-4 w-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                    <CardTitle className="text-lg">{category.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingCategory(category)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingCategoryId(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {category.description && (
                  <p className="text-sm text-gray-600 mb-3">{category.description}</p>
                )}
                <Badge variant="secondary">
                  {category._count.sourceCategories} documento{category._count.sourceCategories !== 1 ? 's' : ''}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          onSubmit={(data) => {
            updateMutation.mutate({ categoryId: editingCategory.id, data })
          }}
          onClose={() => setEditingCategory(null)}
          isPending={updateMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCategoryId} onOpenChange={(open) => !open && setDeletingCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la categoría. Los documentos seguirán existiendo pero perderán esta categorización.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCategoryId && deleteMutation.mutate(deletingCategoryId)}
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

function CreateCategoryDialog({ onSubmit, isPending }: { onSubmit: (data: { name: string; description?: string | null; color?: string | null }) => void; isPending: boolean }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#3b82f6')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      color: color || null,
    })
    setName('')
    setDescription('')
    setColor('#3b82f6')
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nueva Categoría</DialogTitle>
        <DialogDescription>Crea una nueva categoría para organizar tus documentos</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Recursos Humanos"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción opcional de la categoría"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <div className="flex items-center gap-2">
            <Input
              id="color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-20"
            />
            <Input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#3b82f6"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onSubmit({ name: '', description: null, color: null })}>
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

function EditCategoryDialog({
  category,
  onSubmit,
  onClose,
  isPending,
}: {
  category: Category
  onSubmit: (data: { name?: string; description?: string | null; color?: string | null }) => void
  onClose: () => void
  isPending: boolean
}) {
  const [name, setName] = useState(category.name)
  const [description, setDescription] = useState(category.description || '')
  const [color, setColor] = useState(category.color || '#3b82f6')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('El nombre es requerido')
      return
    }
    onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      color: color || null,
    })
  }

  return (
    <Dialog open={!!category} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Categoría</DialogTitle>
          <DialogDescription>Modifica los detalles de la categoría</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Recursos Humanos"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descripción</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional de la categoría"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-color">Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="edit-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-20"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3b82f6"
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
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

