export interface OrganizationCategory {
  id: string
  name: string
  color: string | null
}

export interface SlackIntegrationCategory {
  id: string
  name: string
  color: string | null
}

export interface SlackIntegrationCredentialsStatus {
  hasClientId: boolean
  hasClientSecret: boolean
  hasSigningSecret: boolean
  hasBotToken: boolean
}

export interface SlackIntegration {
  id: string
  organizationId: string
  name: string
  description: string | null
  slug: string
  slackTeamId: string | null
  slackTeamName: string | null
  slackAppId: string | null
  slackBotUserId: string | null
  slackBotUserName: string | null
  defaultThread: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  categories: SlackIntegrationCategory[]
  credentialsStatus: SlackIntegrationCredentialsStatus
}

export interface SlackIntegrationLog {
  id: string
  integrationId: string
  organizationId: string
  slackTeamId: string | null
  slackChannelId: string | null
  slackChannel: string | null
  slackUserId: string | null
  slackUserName: string | null
  question: string
  answer: string | null
  error: string | null
  tokensInput: number | null
  tokensOutput: number | null
  responseTimeMs: number | null
  createdAt: string
}

export interface LogsPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface LogsFilters {
  from?: string
  to?: string
  slackUserId?: string
  slackChannelId?: string
}

export interface LogsResponse {
  data: SlackIntegrationLog[]
  pagination: LogsPagination
  filters: LogsFilters
}

export interface CreateIntegrationPayload {
  name: string
  description?: string | null
  categoryIds?: string[]
}

export interface UpdateIntegrationPayload {
  integrationId: string
  data: Record<string, unknown>
}

