export const buildFallbackManifest = (integrationName: string) => {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://your-domain.com")

  return {
    display_information: {
      name: integrationName,
      description: "Bot de conocimiento de GUÍA para tu organización",
    },
    features: {
      bot_user: {
        display_name: integrationName,
        always_online: false,
      },
      slash_commands: [
        {
          command: "/guia",
          description: "Consultas rápidas a la base de conocimiento de tu organización",
        },
      ],
    },
    oauth_config: {
      scopes: {
        bot: ["chat:write", "files:write", "chat:write.public", "app_mentions:read"],
      },
    },
    settings: {
      event_subscriptions: {
        request_url: `${baseUrl}/api/integrations/slack/events`,
        bot_events: ["app_mention"],
      },
      interactivity: {
        is_enabled: false,
      },
      org_deploy_enabled: false,
      socket_mode_enabled: false,
      token_rotation_enabled: false,
    },
  }
}

