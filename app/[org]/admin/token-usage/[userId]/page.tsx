"use client"

import { useParams } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft, TrendingUp, BarChart3, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useOrganization } from "@/lib/hooks/use-organization"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface UserTokenUsageDetail {
  user: {
    id: string
    name: string | null
    email: string
  }
  usage: {
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
    historical: Array<{
      date: string
      tokens: number
      cost: number
      requests: number
    }>
    byOperation: Array<{
      operation: string
      tokens: number
      cost: number
      requests: number
    }>
  }
  limits: {
    dailyTokenLimit: number | null
    monthlyTokenLimit: number | null
  }
}

const fetchUserTokenUsage = async (orgId: string, userId: string): Promise<UserTokenUsageDetail> => {
  const response = await fetch(
    `/api/organizations/${orgId}/admin/token-usage/${userId}`
  )
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error fetching user token usage")
  }
  return response.json()
}

export default function UserTokenUsageDetailPage() {
  const params = useParams()
  const orgSlug = params.org as string
  const userId = params.userId as string
  const queryClient = useQueryClient()

  const { data: organization, isLoading: loadingOrg } = useOrganization(orgSlug)

  const { data: userUsage, isLoading: loadingUsage, error } = useQuery({
    queryKey: ["owner-user-token-usage", organization?.id, userId],
    queryFn: () => fetchUserTokenUsage(organization!.id, userId),
    enabled: !!organization?.id && !!userId,
  })

  const [dailyLimit, setDailyLimit] = useState<string>("")
  const [monthlyLimit, setMonthlyLimit] = useState<string>("")
  const [isEditing, setIsEditing] = useState(false)

  const isLoading = loadingOrg || loadingUsage

  // Initialize form values when data loads
  useEffect(() => {
    if (userUsage && !isEditing) {
      const newDailyLimit = userUsage.limits.dailyTokenLimit?.toString() || ""
      const newMonthlyLimit = userUsage.limits.monthlyTokenLimit?.toString() || ""
      
      // Only update if values are different to avoid unnecessary re-renders
      setDailyLimit((prev) => {
        if (prev !== newDailyLimit) return newDailyLimit
        return prev
      })
      setMonthlyLimit((prev) => {
        if (prev !== newMonthlyLimit) return newMonthlyLimit
        return prev
      })
    }
  }, [userUsage, isEditing])

  const updateLimitsMutation = useMutation({
    mutationFn: async ({
      dailyTokenLimit,
      monthlyTokenLimit,
    }: {
      dailyTokenLimit: number | null
      monthlyTokenLimit: number | null
    }) => {
      const response = await fetch(
        `/api/organizations/${organization!.id}/admin/token-usage/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dailyTokenLimit, monthlyTokenLimit }),
        }
      )
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al actualizar límites")
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["owner-user-token-usage", organization?.id, userId],
      })
      setIsEditing(false)
      toast.success("Límites actualizados", {
        description: "Los límites de tokens han sido actualizados correctamente.",
      })
    },
    onError: (error: Error) => {
      toast.error("Error", {
        description: error.message,
      })
    },
  })

  const handleSave = () => {
    const daily = dailyLimit.trim() === "" ? null : parseInt(dailyLimit, 10)
    const monthly = monthlyLimit.trim() === "" ? null : parseInt(monthlyLimit, 10)

    // Validation
    if (daily !== null && (isNaN(daily) || daily < 0)) {
      toast.error("Error de validación", {
        description: "El límite diario debe ser un número positivo o estar vacío.",
      })
      return
    }

    if (monthly !== null && (isNaN(monthly) || monthly < 0)) {
      toast.error("Error de validación", {
        description: "El límite mensual debe ser un número positivo o estar vacío.",
      })
      return
    }

    if (daily !== null && monthly !== null && daily > monthly) {
      toast.error("Error de validación", {
        description: "El límite diario no puede ser mayor que el límite mensual.",
      })
      return
    }

    updateLimitsMutation.mutate({ dailyTokenLimit: daily, monthlyTokenLimit: monthly })
  }

  const handleCancel = () => {
    setDailyLimit(userUsage?.limits.dailyTokenLimit?.toString() || "")
    setMonthlyLimit(userUsage?.limits.monthlyTokenLimit?.toString() || "")
    setIsEditing(false)
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

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando detalles de uso...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Error al cargar los detalles</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  if (!userUsage) return null

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-4">
        <Link href={`/${orgSlug}/admin/token-usage`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Uso de Tokens - {userUsage.user.name || userUsage.user.email}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{userUsage.user.email}</p>
        </div>
      </div>

      {/* Usage Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Uso Diario
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tokens:</span>
              <span className="font-semibold text-lg">
                {formatTokens(userUsage.usage.daily.tokensTotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Requests:</span>
              <span className="font-semibold text-lg">
                {userUsage.usage.daily.requestCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Uso Mensual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Tokens:</span>
              <span className="font-semibold text-lg">
                {formatTokens(userUsage.usage.monthly.tokensTotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Requests:</span>
              <span className="font-semibold text-lg">
                {userUsage.usage.monthly.requestCount}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Token Limits Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Límites de Tokens
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Establece límites diarios y mensuales de tokens para este usuario. Deja vacío para sin límite.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dailyLimit">Límite Diario (tokens)</Label>
                <Input
                  id="dailyLimit"
                  type="number"
                  min="0"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Sin límite"
                />
                {userUsage.limits.dailyTokenLimit && !isEditing && (
                  <p className="text-xs text-muted-foreground">
                    Actual: {formatTokens(userUsage.limits.dailyTokenLimit)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyLimit">Límite Mensual (tokens)</Label>
                <Input
                  id="monthlyLimit"
                  type="number"
                  min="0"
                  value={monthlyLimit}
                  onChange={(e) => setMonthlyLimit(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Sin límite"
                />
                {userUsage.limits.monthlyTokenLimit && !isEditing && (
                  <p className="text-xs text-muted-foreground">
                    Actual: {formatTokens(userUsage.limits.monthlyTokenLimit)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>Editar Límites</Button>
              ) : (
                <>
                  <Button
                    onClick={handleSave}
                    disabled={updateLimitsMutation.isPending}
                  >
                    {updateLimitsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      "Guardar"
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage by Operation */}
      {userUsage.usage.byOperation.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Uso por Operación (Este mes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userUsage.usage.byOperation.map((op) => (
                <div
                  key={op.operation}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-semibold text-foreground capitalize">
                      {op.operation === "embedding" ? "Embeddings" : "Chat"}
                    </p>
                    <p className="text-sm text-muted-foreground">{op.requests} requests</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {formatTokens(op.tokens)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

