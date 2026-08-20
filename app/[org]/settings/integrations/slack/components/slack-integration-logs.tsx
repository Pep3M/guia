"use client"

import { useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { fetchLogs } from "../api"
import type { LogsFilters, SlackIntegration } from "../types"

interface SlackIntegrationLogsProps {
  organizationId?: string
  integrations: SlackIntegration[]
  selectedIntegrationId: string | null
  onSelectIntegration: (integrationId: string) => void
}

const buildFilters = (filters: LogsFilters) => ({
  from: filters.from ?? "",
  to: filters.to ?? "",
  slackUserId: filters.slackUserId ?? "",
  slackChannelId: filters.slackChannelId ?? "",
})

const formatDateTime = (date: string) => new Date(date).toLocaleString()

export const SlackIntegrationLogs = ({
  organizationId,
  integrations,
  selectedIntegrationId,
  onSelectIntegration,
}: SlackIntegrationLogsProps) => {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<LogsFilters>({})

  useEffect(() => {
    if (!selectedIntegrationId && integrations.length > 0) {
      onSelectIntegration(integrations[0].id)
    }
  }, [integrations, selectedIntegrationId, onSelectIntegration])

  useEffect(() => {
    setPage(1)
  }, [selectedIntegrationId])

  const { data, isFetching } = useQuery({
    queryKey: [
      "slackIntegrationLogs",
      organizationId,
      selectedIntegrationId,
      page,
      filters.from,
      filters.to,
      filters.slackUserId,
      filters.slackChannelId,
    ],
    queryFn: () =>
      fetchLogs(organizationId!, selectedIntegrationId!, filters, page, 20),
    enabled: Boolean(organizationId && selectedIntegrationId),
  })

  const logs = data?.data ?? []
  const pagination = data?.pagination

  const hasIntegrations = integrations.length > 0
  const filterValues = useMemo(() => buildFilters(filters), [filters])

  return (
    <Card id="slack-logs-section" className="border-border/70">
      <CardHeader className="space-y-1">
        <CardTitle>Registros de actividad</CardTitle>
        <CardDescription>
          Consulta cómo interactúan los usuarios con cada bot. Filtra por fecha, usuario o canal para
          investigar respuestas específicas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="select-integration">Integración</Label>
            <select
              id="select-integration"
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={selectedIntegrationId ?? ""}
              onChange={(event) => onSelectIntegration(event.target.value || "")}
            >
              {integrations.map((integration) => (
                <option key={integration.id} value={integration.id}>
                  {integration.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="logs-from">Desde</Label>
            <Input
              id="logs-from"
              type="date"
              value={filterValues.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value || undefined }))}
              disabled={!hasIntegrations}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="logs-to">Hasta</Label>
            <Input
              id="logs-to"
              type="date"
              value={filterValues.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value || undefined }))}
              disabled={!hasIntegrations}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="logs-user">Usuario Slack</Label>
            <Input
              id="logs-user"
              value={filterValues.slackUserId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, slackUserId: event.target.value || undefined }))
              }
              placeholder="ID de usuario Slack (U...)"
              disabled={!hasIntegrations}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="logs-channel">Canal Slack</Label>
            <Input
              id="logs-channel"
              value={filterValues.slackChannelId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, slackChannelId: event.target.value || undefined }))
              }
              placeholder="ID de canal (C...)"
              disabled={!hasIntegrations}
            />
          </div>
        </div>

        <Separator />

        {isFetching ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando registros...
          </div>
        ) : logs.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No hay registros para los filtros seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead>Pregunta</TableHead>
                    <TableHead>Respuesta / Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const responseText =
                      log.error ?? log.answer ?? "Sin respuesta"
                    const showTooltip = Boolean(
                      responseText && responseText !== "Sin respuesta"
                    )
                    const isError = Boolean(log.error)

                    return (
                      <TableRow key={log.id} className="align-top">
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </TableCell>
                        <TableCell className="max-w-[160px] break-words text-xs">
                          {log.slackUserName
                            ? `${log.slackUserName} (${log.slackUserId ?? "N/D"})`
                            : log.slackUserId ?? "Anónimo"}
                        </TableCell>
                        <TableCell className="max-w-[140px] break-words text-xs text-muted-foreground">
                          {log.slackChannel ?? log.slackChannelId ?? "Privado"}
                        </TableCell>
                        <TableCell className="max-w-xs break-words text-xs">
                          {log.question}
                        </TableCell>
                        <TableCell className="max-w-xs text-xs">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={`block truncate ${
                                  isError ? "text-destructive" : ""
                                }`}
                              >
                                {responseText}
                              </span>
                            </TooltipTrigger>
                            {showTooltip ? (
                              <TooltipContent className="max-w-sm whitespace-pre-wrap text-xs">
                                {responseText}
                              </TooltipContent>
                            ) : null}
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-end gap-3 text-sm">
            <span className="text-muted-foreground">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

