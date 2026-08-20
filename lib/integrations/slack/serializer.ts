import type {
  Category,
  SlackIntegration,
  SlackIntegrationCategory,
} from '@prisma/client'

export type SlackIntegrationWithRelations = SlackIntegration & {
  categories: Array<
    SlackIntegrationCategory & {
      category: Category
    }
  >
}

export const sanitizeSlackIntegration = (integration: SlackIntegrationWithRelations) => ({
  id: integration.id,
  organizationId: integration.organizationId,
  name: integration.name,
  description: integration.description,
  slug: integration.slug,
  slackTeamId: integration.slackTeamId,
  slackTeamName: integration.slackTeamName,
  slackAppId: integration.slackAppId,
  slackBotUserId: integration.slackBotUserId,
  slackBotUserName: integration.slackBotUserName,
  defaultThread: integration.defaultThread,
  isActive: integration.isActive,
  createdAt: integration.createdAt,
  updatedAt: integration.updatedAt,
  categories: integration.categories.map(({ category }) => ({
    id: category.id,
    name: category.name,
    color: category.color,
  })),
  credentialsStatus: {
    hasClientId: Boolean(integration.slackClientId),
    hasClientSecret: Boolean(integration.slackClientSecret),
    hasSigningSecret: Boolean(integration.slackSigningSecret),
    hasBotToken: Boolean(integration.slackBotToken),
  },
})

