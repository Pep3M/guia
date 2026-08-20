"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, FileText, Zap, Users, Loader2 } from "lucide-react"
import { useOrganization } from "@/lib/hooks/use-organization"
import { Progress } from "@/components/ui/progress"

interface OrganizationStats {
  organization: {
    id: string
    name: string
    slug: string
  }
  stats: {
    members: number
    documents: number
    chunks: number
    conversations: number
    monthlyConversations: number
    totalStorageBytes: number
  }
  limits: {
    organization: {
      monthlyTokenLimit: number | null
      dailyTokenLimit: number | null
    }
  }
  tokenUsage: {
    daily: {
      tokensTotal: number
      costTotal: number
      requestCount: number
    }
    monthly: {
      tokensTotal: number
      costTotal: number
      requestCount: number
    }
  }
}

const fetchOrganizationStats = async (orgId: string): Promise<OrganizationStats> => {
  const response = await fetch(`/api/organizations/${orgId}/stats`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error fetching stats")
  }
  return response.json()
}

const formatTokens = (tokens: number) => {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(2)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(2)}K`
  }
  return tokens.toLocaleString()
}

export function DashboardStats() {
  const params = useParams()
  const orgSlug = params.org as string

  const { data: organization, isLoading: loadingOrg } = useOrganization(orgSlug)

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ["organization-stats", organization?.id],
    queryFn: () => fetchOrganizationStats(organization!.id),
    enabled: !!organization?.id,
    refetchInterval: 30000, // Refetch cada 30 segundos
  })

  const isLoading = loadingOrg || loadingStats

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-8 w-8 rounded-lg bg-gray-200" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) return null

  // Format storage helper
  const formatStorage = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`
    }
    return `${bytes} B`
  }

  // Calculate progress percentages
  const monthlyTokenUsage = stats.tokenUsage.monthly.tokensTotal
  const monthlyTokenLimit = stats.limits.organization.monthlyTokenLimit
  const tokenProgress = monthlyTokenLimit !== null && monthlyTokenLimit > 0
    ? Math.min((monthlyTokenUsage / monthlyTokenLimit) * 100, 100)
    : null

  const totalStorageBytes = stats.stats.totalStorageBytes
  const monthlyConversations = stats.stats.monthlyConversations

  const statsData = [
    {
      title: "Miembros",
      value: stats.stats.members,
      subtitle: "Total en la organización",
      icon: Users,
      showProgress: false,
    },
    {
      title: "Almacenamiento",
      value: formatStorage(totalStorageBytes),
      subtitle: `${formatStorage(totalStorageBytes)} utilizados`,
      icon: FileText,
      showProgress: false,
    },
    {
      title: "Conversaciones (Mensual)",
      value: monthlyConversations,
      subtitle: `${monthlyConversations.toLocaleString()} este mes`,
      icon: MessageSquare,
      showProgress: false,
    },
    {
      title: "Tokens (Mensual)",
      value: formatTokens(monthlyTokenUsage),
      subtitle: monthlyTokenLimit !== null
        ? `${formatTokens(monthlyTokenUsage)} / ${formatTokens(monthlyTokenLimit)} del límite`
        : `${formatTokens(monthlyTokenUsage)} este mes`,
      icon: Zap,
      showProgress: tokenProgress !== null,
      progress: tokenProgress,
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsData.map((stat, index) => {
        const Icon = stat.icon
        return (
          <Card
            key={stat.title}
            className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:border-primary/50"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
              {stat.showProgress && stat.progress !== null && stat.progress !== undefined && (
                <div className="mt-3 space-y-1">
                  <Progress 
                    value={stat.progress} 
                    className="h-2"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {stat.progress.toFixed(1)}% utilizado
                    </span>
                    {stat.progress >= 90 && stat.progress < 100 && (
                      <span className="text-xs text-orange-600 font-medium">
                        Límite cercano
                      </span>
                    )}
                    {stat.progress >= 100 && (
                      <span className="text-xs text-red-600 font-medium">
                        Límite alcanzado
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </Card>
        )
      })}
    </div>
  )
}
