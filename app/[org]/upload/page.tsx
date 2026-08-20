'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, File, Loader2, CheckCircle, XCircle, Trash2, Clock, HardDrive, Tag, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { useUploadNotifications } from '@/lib/contexts/upload-notification-context'
import { nanoid } from 'nanoid'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

interface Organization {
  id: string
  slug: string
}

interface Category {
  id: string
  name: string
  color: string | null
}

interface KnowledgeSource {
  id: string
  fileName: string
  fileType: string
  status: string
  errorMessage?: string
  fileSizeBytes?: string | number | null
  createdAt: string
  categories?: Array<{
    category: {
      id: string
      name: string
      color: string | null
    }
  }>
  _count: {
    chunks: number
  }
}

interface OrganizationWithRole extends Organization {
  role: string
}

interface UploadDocumentParams {
  file: File
  orgId: string
  categoryIds: string[]
  allowOverwrite?: boolean
}

interface OverwriteRequestState {
  file: File
  orgId: string
  categoryIds: string[]
  notificationId: string
  message: string
}

type PerformUploadParams = UploadDocumentParams & {
  notificationId?: string
}

class UploadConflictError extends Error {
  details: { fileName: string; message: string }

  constructor(details: { fileName: string; message: string }) {
    super(details.message)
    this.name = 'UploadConflictError'
    this.details = details
  }
}

const fetchOrganizations = async (): Promise<OrganizationWithRole[]> => {
  const response = await fetch('/api/organizations')
  if (!response.ok) throw new Error('Error getting organizations')
  return response.json()
}

const fetchKnowledgeSources = async (orgId: string): Promise<KnowledgeSource[]> => {
  const response = await fetch(`/api/knowledge?organizationId=${orgId}`)
  if (!response.ok) throw new Error('Error fetching sources')
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

const uploadDocument = async ({
  file,
  orgId,
  categoryIds,
  allowOverwrite = false,
}: UploadDocumentParams) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('organizationId', orgId)
  formData.append('allowOverwrite', allowOverwrite ? 'true' : 'false')
  if (categoryIds.length > 0) {
    formData.append('categoryIds', JSON.stringify(categoryIds))
  }

  const response = await fetch('/api/knowledge/upload', {
    method: 'POST',
    body: formData,
  })

  if (response.status === 409) {
    const conflict = await response.json()
    if (conflict?.requiresOverwrite) {
      throw new UploadConflictError({
        fileName: conflict.fileName ?? file.name,
        message:
          conflict.message ??
          'Ya existe un archivo con este nombre. Confirma si deseas sobrescribirlo.',
      })
    }

    throw new Error(conflict?.error || 'Conflicto al subir el archivo')
  }

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al subir el archivo')
  }

  return response.json()
}

const deleteDocument = async ({ id, orgId }: { id: string; orgId: string }) => {
  const response = await fetch(`/api/knowledge?id=${id}&organizationId=${orgId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Error al eliminar')
  }

  return response.json()
}

const updateDocumentCategories = async ({ id, categoryIds }: { id: string; categoryIds: string[] }) => {
  const response = await fetch(`/api/knowledge/${id}/categories`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoryIds }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Error al actualizar categorías')
  }

  return response.json()
}

const formatFileSize = (bytes: number | string | null | undefined): string => {
  if (!bytes) return 'Desconocido'
  const size = typeof bytes === 'string' ? BigInt(bytes) : BigInt(bytes)
  const kb = Number(size) / 1024
  const mb = kb / 1024
  const gb = mb / 1024

  if (gb >= 1) return `${gb.toFixed(2)} GB`
  if (mb >= 1) return `${mb.toFixed(2)} MB`
  if (kb >= 1) return `${kb.toFixed(2)} KB`
  return `${Number(size)} bytes`
}

export default function UploadPage() {
  const params = useParams()
  const router = useRouter()
  const orgSlug = params.org as string
  const queryClient = useQueryClient()
  const { addNotification, updateNotification } = useUploadNotifications()

  const previousSourcesRef = useRef<KnowledgeSource[]>([])
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set())
  const notificationIdMapRef = useRef<Map<string, string>>(new Map()) // Maps knowledge source ID to notification ID
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [editingCategoriesSourceId, setEditingCategoriesSourceId] = useState<string | null>(null)
  const [overwriteRequest, setOverwriteRequest] = useState<OverwriteRequestState | null>(null)

  // Get organization ID and check permissions
  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
  })

  const currentOrg = organizations?.find((o) => o.slug === orgSlug)
  const orgId = currentOrg?.id

  // Check granular permissions for current user
  const { data: userPermissions } = useQuery({
    queryKey: ['user-permissions', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      const response = await fetch(`/api/organizations/${orgId}/my-permissions`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error fetching permissions')
      }
      return response.json()
    },
    enabled: !!orgId,
  })

  // Check if user has permission to upload
  useEffect(() => {
    if (userPermissions && !userPermissions.permissions.canUploadDocuments) {
      toast.error('No tienes permisos para subir documentos. Contacta a un administrador.')
      router.push(`/${orgSlug}/dashboard`)
    }
  }, [userPermissions, orgSlug, router])

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories', orgId],
    queryFn: () => fetchCategories(orgId!),
    enabled: !!orgId,
  })

  // Fetch knowledge sources with categories
  const {
    data: sources = [],
    isLoading: loading,
  } = useQuery({
    queryKey: ['knowledge-sources', orgId],
    queryFn: () => fetchKnowledgeSources(orgId!),
    enabled: !!orgId,
    refetchInterval: (query) => {
      const data = query.state.data as KnowledgeSource[] | undefined
      const hasProcessing = data?.some(
        (s) => s.status === 'processing' || s.status === 'pending'
      )
      return hasProcessing ? 2000 : false
    },
  })

  // Check for status changes and update notifications
  useEffect(() => {
    const previousSources = previousSourcesRef.current
    
    // Process each source to check for status changes
    sources.forEach((newSource) => {
      const oldSource = previousSources.find((s) => s.id === newSource.id)
      const notificationId = notificationIdMapRef.current.get(newSource.id)
      
      // Only update if we have a notification tracking this source
      if (notificationId) {
        if (!oldSource) {
          // New source that we're tracking - update notification based on current status
          if (newSource.status === 'completed') {
            updateNotification(notificationId, 'completed')
            setUploadingFiles((prev) => {
              const next = new Set(prev)
              next.delete(newSource.id)
              return next
            })
          } else if (newSource.status === 'error') {
            updateNotification(notificationId, 'error', newSource.errorMessage)
            setUploadingFiles((prev) => {
              const next = new Set(prev)
              next.delete(newSource.id)
              return next
            })
          } else if (newSource.status === 'processing') {
            updateNotification(notificationId, 'processing')
            setUploadingFiles((prev) => {
              const next = new Set(prev)
              if (!next.has(newSource.id)) {
                next.add(newSource.id)
              }
              return next
            })
          }
        } else if (oldSource.status !== newSource.status) {
          // Status changed - update notification
          if (newSource.status === 'completed') {
            updateNotification(notificationId, 'completed')
            setUploadingFiles((prev) => {
              const next = new Set(prev)
              next.delete(newSource.id)
              return next
            })
          } else if (newSource.status === 'error') {
            updateNotification(notificationId, 'error', newSource.errorMessage)
            setUploadingFiles((prev) => {
              const next = new Set(prev)
              next.delete(newSource.id)
              return next
            })
          } else if (newSource.status === 'processing') {
            updateNotification(notificationId, 'processing')
          }
        }
      }
    })
    
    // Update ref at the end
    previousSourcesRef.current = sources
  }, [sources, updateNotification])

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
  })

  const performUpload = useCallback(
    async ({
      file,
      orgId,
      categoryIds,
      allowOverwrite = false,
      notificationId,
    }: PerformUploadParams) => {
      if (!orgId) {
        toast.error('Error: Organización no encontrada')
        return
      }

      const resolvedNotificationId = notificationId ?? nanoid()
      const isReusedNotification = Boolean(notificationId)

      if (!isReusedNotification) {
        addNotification({
          id: resolvedNotificationId,
          fileName: file.name,
          status: 'uploading',
        })
      } else {
        updateNotification(resolvedNotificationId, 'uploading')
      }

      setUploadingFiles((prev) => {
        const next = new Set(prev)
        next.add(resolvedNotificationId)
        return next
      })

      try {
        const data = await uploadMutation.mutateAsync({
          file,
          orgId,
          categoryIds,
          allowOverwrite,
        })

        if (data?.id) {
          notificationIdMapRef.current.set(data.id, resolvedNotificationId)

          if (data.status === 'completed') {
            updateNotification(resolvedNotificationId, 'completed')
            setUploadingFiles((prev) => {
              const next = new Set(prev)
              next.delete(resolvedNotificationId)
              next.delete(data.id)
              return next
            })
            queryClient.invalidateQueries({ queryKey: ['knowledge-sources', orgId] })
            setSelectedCategories(new Set())
          } else {
            updateNotification(resolvedNotificationId, 'processing')
            setUploadingFiles((prev) => {
              const next = new Set(prev)
              next.delete(resolvedNotificationId)
              next.add(data.id)
              return next
            })
            queryClient.invalidateQueries({ queryKey: ['knowledge-sources', orgId] })
          }
        } else {
          updateNotification(resolvedNotificationId, 'error', 'No se recibió ID del documento')
          setUploadingFiles((prev) => {
            const next = new Set(prev)
            next.delete(resolvedNotificationId)
            return next
          })
        }
      } catch (error) {
        if (error instanceof UploadConflictError) {
          updateNotification(resolvedNotificationId, 'error', error.details.message)
          toast.warning(error.details.message)
          setOverwriteRequest({
            file,
            orgId,
            categoryIds,
            notificationId: resolvedNotificationId,
            message: error.details.message,
          })
        } else {
          const message = error instanceof Error ? error.message : 'Error al subir el archivo'
          updateNotification(resolvedNotificationId, 'error', message)
          toast.error(message)
        }

        setUploadingFiles((prev) => {
          const next = new Set(prev)
          next.delete(resolvedNotificationId)
          return next
        })
      }
    },
    [
      addNotification,
      updateNotification,
      uploadMutation,
      queryClient,
      setSelectedCategories,
      setOverwriteRequest,
      toast,
    ]
  )

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      toast.success('Documento eliminado')
      queryClient.invalidateQueries({ queryKey: ['knowledge-sources', orgId] })
    },
    onError: () => {
      toast.error('Error al eliminar')
    },
  })

  // Update categories mutation
  const updateCategoriesMutation = useMutation({
    mutationFn: updateDocumentCategories,
    onSuccess: () => {
      toast.success('Categorías actualizadas')
      queryClient.invalidateQueries({ queryKey: ['knowledge-sources', orgId] })
      setEditingCategoriesSourceId(null)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Error al actualizar categorías')
    },
  })

  const isUploadPending = uploadMutation.isPending

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (!orgId) {
        toast.error('Error: Organización no encontrada')
        return
      }

      if (overwriteRequest) {
        toast.warning('Confirma o cancela la sobrescritura pendiente antes de continuar.')
        return
      }

      if (uploadingFiles.size > 0 || isUploadPending) {
        toast.warning('Ya hay un archivo subiéndose. Por favor espera a que termine.')
        return
      }

      const selectedCategoryIds = Array.from(selectedCategories)

      acceptedFiles.forEach((file) => {
        void performUpload({
          file,
          orgId,
          categoryIds: selectedCategoryIds,
        })
      })
    },
    [
      orgId,
      overwriteRequest,
      uploadingFiles,
      isUploadPending,
      selectedCategories,
      performUpload,
      toast,
    ]
  )
  const isUploading = uploadingFiles.size > 0 || isUploadPending || !!overwriteRequest

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: isUploading,
  })

  const handleDeleteClick = (id: string) => {
    setDeleteDocumentId(id)
  }

  const handleConfirmDelete = () => {
    if (!orgId || !deleteDocumentId) return
    deleteMutation.mutate({ id: deleteDocumentId, orgId })
    setDeleteDocumentId(null)
  }

  const handleCancelOverwrite = () => {
    setOverwriteRequest(null)
  }

  const handleConfirmOverwrite = useCallback(() => {
    if (!overwriteRequest) {
      return
    }

    const { file, orgId: overwriteOrgId, categoryIds, notificationId } = overwriteRequest
    setOverwriteRequest(null)

    void performUpload({
      file,
      orgId: overwriteOrgId,
      categoryIds,
      allowOverwrite: true,
      notificationId,
    })
  }, [overwriteRequest, performUpload])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
    }
  }

  // Don't render if user doesn't have permission (they'll be redirected)
  if (userPermissions && !userPermissions.permissions.canUploadDocuments) {
    return (
      <div className="container mx-auto max-w-6xl py-8">
        <div className="text-center">
          <p className="text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Base de Conocimiento</h1>
            <p className="text-muted-foreground mt-2">Sube y gestiona tus documentos para el asistente IA</p>
          </div>
          {sources.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {formatFileSize(
                  sources.reduce((total, source) => {
                    if (!source.fileSizeBytes) return total
                    const size = typeof source.fileSizeBytes === 'string' 
                      ? Number(BigInt(source.fileSizeBytes)) 
                      : Number(source.fileSizeBytes)
                    return total + size
                  }, 0)
                )}
              </span>
            </div>
          )}
        </div>

        {/* Category Selection */}
        {categories.length > 0 && (
          <Card className="p-4">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Categorías (opcional)</Label>
              <p className="text-sm text-muted-foreground">
                Selecciona las categorías para este documento. Puedes seleccionar múltiples.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={selectedCategories.has(category.id)}
                      onCheckedChange={(checked) => {
                        setSelectedCategories((prev) => {
                          const next = new Set(prev)
                          if (checked) {
                            next.add(category.id)
                          } else {
                            next.delete(category.id)
                          }
                          return next
                        })
                      }}
                      disabled={isUploading}
                    />
                    <Label
                      htmlFor={`category-${category.id}`}
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      {category.color && (
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      <span className="text-sm">{category.name}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Upload Zone */}
        <Card
          {...getRootProps()}
          className={`relative overflow-hidden transition-all ${
            isUploading
              ? 'cursor-not-allowed opacity-50'
              : isDragActive
              ? 'cursor-pointer border-accent border-2 bg-accent/5'
              : 'cursor-pointer border-dashed border-2'
          }`}
        >
          <input {...getInputProps()} />
          <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 border border-accent/20">
                {isUploading ? (
                  <Loader2 className="h-8 w-8 text-accent animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-accent" />
                )}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Subir Documentos</h3>
              {isUploading ? (
                <p className="text-sm text-muted-foreground max-w-md">
                  Subiendo archivo... Por favor espera a que termine.
                </p>
              ) : isDragActive ? (
                <p className="text-sm text-muted-foreground max-w-md">Suelta el archivo aquí...</p>
              ) : (
                <p className="text-sm text-muted-foreground max-w-md">
                  Arrastra y suelta tus archivos aquí, o haz clic para seleccionar. Soporta PDF, TXT y MD (máx. 10MB).
                </p>
              )}
            </div>
            {!isUploading && (
              <Button className="mt-2">
                <Upload className="mr-2 h-4 w-4" />
                Seleccionar Archivos
              </Button>
            )}
          </div>
        </Card>

        {/* Knowledge Sources List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Documentos Cargados</h2>

          {loading ? (
            <Card className="p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">Cargando documentos...</p>
            </Card>
          ) : sources.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No hay documentos cargados aún
            </Card>
          ) : (
            <div className="space-y-2">
              {sources.map((source) => (
                <Card key={source.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {getStatusIcon(source.status)}
                      <File className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{source.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          {source.status === 'completed' && `✅ ${source._count.chunks} chunks procesados`}
                          {source.status === 'processing' && '🔄 Procesando documento...'}
                          {source.status === 'pending' && '⏳ En cola para procesar...'}
                          {source.status === 'error' && `❌ Error: ${source.errorMessage || 'Unknown'}`}
                        </p>
                        {source.categories && source.categories.length > 0 && (
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {source.categories.map((cat) => (
                              <Badge key={cat.category.id} variant="secondary" className="text-xs">
                                {cat.category.color && (
                                  <div
                                    className="h-2 w-2 rounded-full mr-1"
                                    style={{ backgroundColor: cat.category.color }}
                                  />
                                )}
                                {cat.category.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-xs text-muted-foreground">
                            Subido: {new Date(source.createdAt).toLocaleString('es-ES')}
                          </p>
                          {source.fileSizeBytes && (
                            <p className="text-xs text-muted-foreground">
                              Tamaño: {formatFileSize(source.fileSizeBytes)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCategoriesSourceId(source.id)}
                        disabled={updateCategoriesMutation.isPending}
                        title="Editar categorías"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(source.id)}
                        disabled={deleteMutation.isPending}
                        title="Eliminar documento"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overwrite Confirmation Dialog */}
      <AlertDialog
        open={!!overwriteRequest}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelOverwrite()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Sobrescribir archivo existente?</AlertDialogTitle>
            <AlertDialogDescription>
              {overwriteRequest?.message ??
                'Ya existe un archivo con este nombre. Si sobrescribes, se reemplazará el contenido anterior.'}
              {overwriteRequest?.file && (
                <span className="block mt-2 font-medium text-foreground">
                  Archivo: {overwriteRequest.file.name}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelOverwrite} disabled={isUploadPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmOverwrite}
              disabled={isUploadPending}
            >
              {isUploadPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sobrescribiendo...
                </>
              ) : (
                'Sobrescribir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDocumentId} onOpenChange={(open) => !open && setDeleteDocumentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el documento y todos sus chunks asociados.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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

      {/* Edit Categories Dialog */}
      {editingCategoriesSourceId && (
        <EditCategoriesDialog
          source={sources.find((s) => s.id === editingCategoriesSourceId)!}
          categories={categories}
          onSubmit={(categoryIds) => {
            updateCategoriesMutation.mutate({
              id: editingCategoriesSourceId,
              categoryIds,
            })
          }}
          onClose={() => setEditingCategoriesSourceId(null)}
          isPending={updateCategoriesMutation.isPending}
        />
      )}
    </div>
  )
}

function EditCategoriesDialog({
  source,
  categories,
  onSubmit,
  onClose,
  isPending,
}: {
  source: KnowledgeSource
  categories: Category[]
  onSubmit: (categoryIds: string[]) => void
  onClose: () => void
  isPending: boolean
}) {
  const currentCategoryIds = new Set(
    source.categories?.map((cat) => cat.category.id) || []
  )
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    currentCategoryIds
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(Array.from(selectedCategories))
  }

  return (
    <Dialog open={!!source} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Categorías</DialogTitle>
          <DialogDescription>
            Selecciona las categorías para: {source.fileName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay categorías disponibles. Crea categorías desde el panel de administración.
              </p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-category-${category.id}`}
                      checked={selectedCategories.has(category.id)}
                      onCheckedChange={(checked) => {
                        setSelectedCategories((prev) => {
                          const next = new Set(prev)
                          if (checked) {
                            next.add(category.id)
                          } else {
                            next.delete(category.id)
                          }
                          return next
                        })
                      }}
                      disabled={isPending}
                    />
                    <Label
                      htmlFor={`edit-category-${category.id}`}
                      className="flex items-center gap-2 cursor-pointer flex-1"
                    >
                      {category.color && (
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      <span className="text-sm">{category.name}</span>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
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

