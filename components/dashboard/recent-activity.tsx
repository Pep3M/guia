"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { MessageSquare, FileUp, Users } from "lucide-react"
import { useOrganization } from "@/lib/hooks/use-organization"

interface Activity {
  type: "conversation" | "document" | "membership"
  id: string
  user: {
    id: string
    name: string
    email: string
  } | null
  message: string
  createdAt: string
  metadata: {
    title?: string
    fileName?: string
    status?: string
    role?: string
  }
}

const fetchRecentActivity = async (orgId: string): Promise<{ activities: Activity[] }> => {
  const response = await fetch(`/api/organizations/${orgId}/recent-activity`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error fetching recent activity")
  }
  return response.json()
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "conversation":
      return MessageSquare
    case "document":
      return FileUp
    case "membership":
      return Users
    default:
      return MessageSquare
  }
}

const getActivityColors = (type: string) => {
  switch (type) {
    case "conversation":
      return {
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
      }
    case "document":
      return {
        color: "text-green-500",
        bgColor: "bg-green-500/10",
      }
    case "membership":
      return {
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
      }
    default:
      return {
        color: "text-gray-500",
        bgColor: "bg-gray-500/10",
      }
  }
}

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "hace unos segundos"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} minuto${minutes !== 1 ? "s" : ""}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} hora${hours !== 1 ? "s" : ""}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} día${days !== 1 ? "s" : ""}`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `hace ${weeks} semana${weeks !== 1 ? "s" : ""}`
  const months = Math.floor(days / 30)
  return `hace ${months} mes${months !== 1 ? "es" : ""}`
}

export function RecentActivity() {
  const params = useParams()
  const orgSlug = params.org as string

  const { data: organization, isLoading: loadingOrg } = useOrganization(orgSlug)

  const { data: activityData, isLoading: loadingActivity } = useQuery({
    queryKey: ["recent-activity", organization?.id],
    queryFn: () => fetchRecentActivity(organization!.id),
    enabled: !!organization?.id,
    refetchInterval: 30000, // Refetch cada 30 segundos
  })

  const isLoading = loadingOrg || loadingActivity

  if (isLoading) {
    return (
      <Card className="col-span-full lg:col-span-1">
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimas acciones en tu organización</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const activities = activityData?.activities || []

  if (activities.length === 0) {
    return (
      <Card className="col-span-full lg:col-span-1">
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>Últimas acciones en tu organización</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">No hay actividad reciente</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full lg:col-span-1">
      <CardHeader>
        <CardTitle>Actividad Reciente</CardTitle>
        <CardDescription>Últimas acciones en tu organización</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {activities.map((activity) => {
            const Icon = getActivityIcon(activity.type)
            const colors = getActivityColors(activity.type)
            const userName = activity.user?.name || "Usuario"
            
            // Construir mensaje con información adicional si está disponible
            const displayMessage =
              activity.type === "document" && activity.metadata.fileName
                ? `subió ${activity.metadata.fileName}`
                : activity.type === "conversation" && activity.metadata.title
                ? `inició: "${activity.metadata.title}"`
                : activity.type === "membership" && activity.metadata.role
                ? `se unió como ${activity.metadata.role}`
                : activity.message

            return (
              <HoverCard key={`${activity.type}-${activity.id}`}>
                <HoverCardTrigger asChild>
                  <div className="flex items-start gap-3 group hover:bg-muted/50 p-2 rounded-lg transition-colors -mx-2 cursor-pointer">
                    <div className={`${colors.bgColor} p-2 rounded-lg`}>
                      <Icon className={`h-4 w-4 ${colors.color}`} />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium leading-none">{userName}</p>
                      <p className="text-sm text-muted-foreground truncate">{displayMessage}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.createdAt)}</p>
                    </div>
                  </div>
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className={`${colors.bgColor} p-2 rounded-lg`}>
                        <Icon className={`h-4 w-4 ${colors.color}`} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">{userName}</p>
                        {activity.user?.email && (
                          <p className="text-xs text-muted-foreground">{activity.user.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="border-t pt-2 space-y-2">
                      <p className="text-sm font-medium">Acción:</p>
                      <p className="text-sm text-muted-foreground break-words">{displayMessage}</p>
                      {activity.type === "conversation" && activity.metadata.title && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Conversación:</p>
                          <p className="text-xs text-muted-foreground break-words">{activity.metadata.title}</p>
                        </div>
                      )}
                      {activity.type === "document" && activity.metadata.status && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Estado:</p>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              activity.metadata.status === "completed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : activity.metadata.status === "processing"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : activity.metadata.status === "error"
                                ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                            }`}
                          >
                            {activity.metadata.status === "completed"
                              ? "Completado"
                              : activity.metadata.status === "processing"
                              ? "Procesando"
                              : activity.metadata.status === "error"
                              ? "Error"
                              : "Pendiente"}
                          </span>
                        </div>
                      )}
                      {activity.type === "membership" && activity.metadata.role && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Rol:</p>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {activity.metadata.role}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="border-t pt-2">
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </HoverCardContent>
              </HoverCard>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
