"use client"

import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Loader2 } from "lucide-react"
import { useOrganization } from "@/lib/hooks/use-organization"

const fetchOrganizationStats = async (orgId: string) => {
  const response = await fetch(`/api/organizations/${orgId}/stats`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error fetching stats")
  }
  return response.json()
}

export function UsageChart() {
  const params = useParams()
  const orgSlug = params.org as string

  const { data: organization, isLoading: loadingOrg } = useOrganization(orgSlug)

  const { data: stats, isLoading: loadingData } = useQuery({
    queryKey: ["organization-stats", organization?.id],
    queryFn: () => fetchOrganizationStats(organization!.id),
    enabled: !!organization?.id,
    refetchInterval: 30000,
  })

  const isLoading = loadingOrg || loadingData

  // Format data for chart (last 30 days)
  const formattedData =
    stats?.tokenUsage?.historical?.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString("es-ES", {
        month: "short",
        day: "numeric",
      }),
      tokens: item.tokens,
      requests: item.requests,
    })) || []

  if (isLoading) {
    return (
      <Card className="col-span-full lg:col-span-2">
        <CardHeader>
          <CardTitle>Resumen de Uso</CardTitle>
          <CardDescription>Conversaciones mensuales y consumo de tokens</CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="flex h-[280px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Resumen de Uso</CardTitle>
        <CardDescription>Consumo de tokens (últimos 30 días)</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {formattedData.length > 0 ? (
          <div className="w-full min-w-0 overflow-hidden">
            <ChartContainer
              config={{
                tokens: {
                  label: "Tokens",
                  color: "hsl(var(--chart-1))",
                },
                requests: {
                  label: "Requests",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[280px] sm:h-[300px] md:h-[320px] lg:h-[350px] xl:h-[400px] [&_.recharts-responsive-container]:!aspect-auto [&_.recharts-responsive-container]:w-full [&_.recharts-responsive-container]:!max-w-full"
            >
              <AreaChart
                data={formattedData}
                margin={{
                  top: 8,
                  right: 8,
                  left: 5,
                  bottom: 8,
                }}
              >
                <defs>
                  <linearGradient id="fillTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  className="text-xs"
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={4}
                  className="text-xs"
                  width={50}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="tokens"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#fillTokens)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        ) : (
          <div className="flex h-[280px] items-center justify-center text-gray-500">
            <p className="text-sm">No hay datos disponibles</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
