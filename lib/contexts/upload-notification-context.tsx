'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface UploadNotification {
  id: string
  fileName: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  errorMessage?: string
  createdAt: number
}

interface UploadNotificationContextType {
  notifications: UploadNotification[]
  addNotification: (notification: Omit<UploadNotification, 'createdAt'>) => void
  updateNotification: (id: string, status: UploadNotification['status'], errorMessage?: string) => void
  removeNotification: (id: string) => void
  clearCompleted: () => void
}

const UploadNotificationContext = createContext<UploadNotificationContextType | undefined>(undefined)

export const UploadNotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<UploadNotification[]>([])

  const addNotification = useCallback((notification: Omit<UploadNotification, 'createdAt'>) => {
    setNotifications((prev) => [
      ...prev,
      {
        ...notification,
        createdAt: Date.now(),
      },
    ])
  }, [])

  const updateNotification = useCallback(
    (id: string, status: UploadNotification['status'], errorMessage?: string) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status, errorMessage } : n))
      )
    },
    []
  )

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setNotifications((prev) =>
      prev.filter((n) => n.status !== 'completed' && n.status !== 'error')
    )
  }, [])

  return (
    <UploadNotificationContext.Provider
      value={{
        notifications,
        addNotification,
        updateNotification,
        removeNotification,
        clearCompleted,
      }}
    >
      {children}
    </UploadNotificationContext.Provider>
  )
}

export const useUploadNotifications = () => {
  const context = useContext(UploadNotificationContext)
  if (context === undefined) {
    throw new Error('useUploadNotifications must be used within an UploadNotificationProvider')
  }
  return context
}

