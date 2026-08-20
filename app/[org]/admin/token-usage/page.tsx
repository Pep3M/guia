"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Search, Calendar } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import Link from "next/link"
import { useOrganization } from "@/lib/hooks/use-organization"

interface TokenUsageData {
  period: string
  page: number
  limit: number
  total: number
  totalPages: number
  data: Array<{
    userId: string
    tokensTotal: number
    costTotal: number
    requestCount: number
    user: {
      id: string
      name: string | null
      email: string
    }
  }>
}

const fetchTokenUsage = async (orgId: string, period: string, page: number = 1): Promise<TokenUsageData> => {
  const response = await fetch(
    `/api/organizations/${orgId}/admin/token-usage?period=${period}&page=${page}&limit=20`
  )
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error fetching token usage")
  }
  return response.json()
}

export default function TokenUsagePage() {
  const params = useParams()
  const orgSlug = params.org as string

  const { data: organization, isLoading: loadingOrg } = useOrganization(orgSlug)
  const [period, setPeriod] = useState<"day" | "month">("month")
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")

  const { data: usage, isLoading: loadingUsage, error } = useQuery({
    queryKey: ["owner-token-usage", organization?.id, period, page],
    queryFn: () => fetchTokenUsage(organization!.id, period, page),
    enabled: !!organization?.id,
  })

  const isLoading = loadingOrg || loadingUsage

  const formatTokens = (tokens: number) => {
    if (tokens >= 1_000_000) {
      return `${(tokens / 1_000_000).toFixed(2)}M`
    }
    if (tokens >= 1_000) {
      return `${(tokens / 1_000).toFixed(2)}K`
    }
    return tokens.toLocaleString()
  }

  // Filter by search query
  const filteredData = usage?.data.filter((item) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.user.name?.toLowerCase().includes(query) ||
      item.user.email.toLowerCase().includes(query)
    )
  })

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Cargando uso de tokens...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Error al cargar el uso de tokens</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  if (!usage) return null

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">
          Uso de Tokens
        </h1>
        <p className="mt-2 text-sm md:text-base text-muted-foreground">
          Consumo de tokens por usuario en {organization?.name}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select
            value={period}
            onValueChange={(value) => {
              setPeriod(value as "day" | "month")
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoy</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Consumo por Usuario</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Total: {usage.total} usuarios · {formatTokens(usage.data.reduce((acc, u) => acc + u.tokensTotal, 0))} tokens
          </p>
        </CardHeader>
        <CardContent>
          {filteredData && filteredData.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                        Usuario
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                        Tokens
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                        Requests
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item) => (
                      <tr key={item.userId} className="border-b hover:bg-muted">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-foreground">
                              {item.user.name || item.user.email}
                            </p>
                            {item.user.name && (
                              <p className="text-sm text-muted-foreground">{item.user.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {formatTokens(item.tokensTotal)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {item.requestCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/${orgSlug}/admin/token-usage/${item.userId}`}
                          >
                            <Button variant="ghost" size="sm">
                              Ver detalle
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {usage.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {usage.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(usage.totalPages, p + 1))}
                      disabled={page === usage.totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No hay datos de uso de tokens</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

