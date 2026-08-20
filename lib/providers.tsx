"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/components/theme-provider"
import { useState } from "react"
import { SidebarProvider } from "@/hooks/use-sidebar"
import { UploadNotificationProvider } from "@/lib/contexts/upload-notification-context"
import { UploadNotification } from "@/components/upload/upload-notification"

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  )

  return (
    <ThemeProvider defaultTheme="system" storageKey="ai-rag-theme">
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <UploadNotificationProvider>
            {children}
            <UploadNotification />
          </UploadNotificationProvider>
        </SidebarProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

