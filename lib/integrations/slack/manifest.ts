import type { Category, SlackIntegration, SlackIntegrationCategory } from '@prisma/client'

export type SlackIntegrationWithCategories = SlackIntegration & {
  categories: Array<
    SlackIntegrationCategory & {
      category: Category
    }
  >
}

const resolveBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  if (process.env.APP_URL) {
    return process.env.APP_URL
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
}

export const buildSlackManifest = (integration: SlackIntegrationWithCategories) => {
  const baseUrl = resolveBaseUrl().replace(/\/$/, '')
  const knowledgeSummary =
    integration.categories.length > 0
      ? integration.categories.map(({ category }) => category.name).join(', ')
      : 'Información curada de tu organización en GUÍA'

  const displayName = integration.name.length > 75 ? integration.name.slice(0, 72) + '...' : integration.name

  return {
    display_information: {
      name: displayName,
      description: integration.description ?? knowledgeSummary,
    },
    features: {
      bot_user: {
        display_name: displayName,
        always_online: false,
      },
    },
    oauth_config: {
      scopes: {
        bot: [
          'app_mentions:read',
          'chat:write',
          'chat:write.public',
          'files:write',
          'commands',
          'users:read',
          'users:read.email',
        ],
      },
    },
    settings: {
      interactivity: {
        is_enabled: false,
      },
      event_subscriptions: {
        request_url: `${baseUrl}/api/integrations/slack/events`,
        bot_events: ['app_mention'],
      },
      org_deploy_enabled: false,
      socket_mode_enabled: false,
      token_rotation_enabled: false,
    },
  }
}

