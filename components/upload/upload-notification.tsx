'use client'

import { useEffect } from 'react'
import { useUploadNotifications } from '@/lib/contexts/upload-notification-context'
import { Card } from '@/components/ui/card'
import { X, CheckCircle, XCircle, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const UploadNotification = () => {
  const { notifications, removeNotification } = useUploadNotifications()

  // Auto-remove completed notifications after 4 seconds, errors after 8 seconds
  useEffect(() => {
    const completedIds = notifications
      .filter((n) => n.status === 'completed')
      .map((n) => n.id)
    
    const errorIds = notifications
      .filter((n) => n.status === 'error')
      .map((n) => n.id)

    if (completedIds.length > 0) {
      const timer = setTimeout(() => {
        completedIds.forEach((id) => removeNotification(id))
      }, 4000) // 4 seconds for success

      return () => clearTimeout(timer)
    }
    
    if (errorIds.length > 0) {
      const timer = setTimeout(() => {
        errorIds.forEach((id) => removeNotification(id))
      }, 8000) // 8 seconds for errors (user might want to read the error)

      return () => clearTimeout(timer)
    }
  }, [notifications, removeNotification])

  if (notifications.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <Card
          key={notification.id}
          className="p-4 shadow-lg border-l-4 animate-in slide-in-from-bottom-5"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {notification.status === 'uploading' && (
                <Upload className="h-5 w-5 text-blue-500 animate-pulse" />
              )}
              {notification.status === 'processing' && (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              )}
              {notification.status === 'completed' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {notification.status === 'error' && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-medium truncate">{notification.fileName}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeNotification(notification.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {notification.status === 'uploading' && '📤 Subiendo archivo al servidor...'}
                {notification.status === 'processing' && '🔄 Procesando documento y generando embeddings...'}
                {notification.status === 'completed' && '✅ Documento procesado correctamente. Ya está disponible para usar.'}
                {notification.status === 'error' && `❌ Error: ${notification.errorMessage || 'Error desconocido'}`}
              </p>
              {(notification.status === 'uploading' || notification.status === 'processing') && (
                <div className="relative h-1 w-full overflow-hidden rounded-full bg-primary/20">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-shimmer" style={{ width: '200%', animation: 'shimmer 2s infinite' }} />
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

