import type {
  CreateIntegrationPayload,
  LogsFilters,
  LogsResponse,
  OrganizationCategory,
  SlackIntegration,
} from "./types"

const handleResponse = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    const message = (error as { error?: string }).error ?? fallbackMessage
    throw new Error(message)
  }

  return response.json()
}

export const fetchIntegrations = async (organizationId: string): Promise<SlackIntegration[]> => {
  const response = await fetch(`/api/organizations/${organizationId}/integrations/slack`, {
    cache: "no-store",
  })

  return handleResponse(response, "No se pudieron obtener las integraciones de Slack")
}

export const createIntegration = async (
  organizationId: string,
  payload: CreateIntegrationPayload,
): Promise<SlackIntegration> => {
  const response = await fetch(`/api/organizations/${organizationId}/integrations/slack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  return handleResponse(response, "No se pudo crear la integración de Slack")
}

export const updateIntegration = async (
  organizationId: string,
  integrationId: string,
  payload: Record<string, unknown>,
): Promise<SlackIntegration> => {
  const response = await fetch(
    `/api/organizations/${organizationId}/integrations/slack/${integrationId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  )

  return handleResponse(response, "No se pudo actualizar la integración de Slack")
}

export const deleteIntegration = async (
  organizationId: string,
  integrationId: string,
): Promise<{ success: true }> => {
  const response = await fetch(
    `/api/organizations/${organizationId}/integrations/slack/${integrationId}`,
    { method: "DELETE" },
  )

  return handleResponse(response, "No se pudo eliminar la integración de Slack")
}

export const fetchCategories = async (
  organizationId: string,
): Promise<OrganizationCategory[]> => {
  const response = await fetch(`/api/organizations/${organizationId}/categories`, {
    cache: "no-store",
  })

  return handleResponse(response, "No se pudieron obtener las categorías")
}

export const fetchLogs = async (
  organizationId: string,
  integrationId: string,
  filters: LogsFilters,
  page: number,
  pageSize: number,
): Promise<LogsResponse> => {
  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("pageSize", String(pageSize))

  if (filters.from) params.set("from", filters.from)
  if (filters.to) params.set("to", filters.to)
  if (filters.slackUserId) params.set("slackUserId", filters.slackUserId)
  if (filters.slackChannelId) params.set("slackChannelId", filters.slackChannelId)

  const response = await fetch(
    `/api/organizations/${organizationId}/integrations/slack/${integrationId}/logs?${params.toString()}`,
    { cache: "no-store" },
  )

  return handleResponse(response, "No se pudieron obtener los registros")
}

export const fetchManifest = async (
  organizationId: string,
  integrationId: string,
): Promise<Record<string, unknown>> => {
  const response = await fetch(
    `/api/organizations/${organizationId}/integrations/slack/${integrationId}/manifest`,
    { cache: "no-store" },
  )

  return handleResponse(response, "No se pudo generar el manifest")
}

