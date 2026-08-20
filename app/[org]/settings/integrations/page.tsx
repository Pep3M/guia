"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { MessageSquare, PlugZap, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type IntegrationOption = {
  id: string
  name: string
  description: string
  href: (orgSlug: string) => string
  icon: LucideIcon
  highlights: string[]
  status?: "beta" | "available"
}

const integrationOptions: IntegrationOption[] = [
  {
    id: "slack",
    name: "Slack",
    description:
      "Crea asistentes en tus canales para compartir conocimiento, responder dudas y automatizar workflows.",
    href: (orgSlug) => `/${orgSlug}/settings/integrations/slack`,
    icon: MessageSquare,
    highlights: [
      "Bots conectados a tu base de conocimiento",
      "Asignación de categorías detallada",
      "Registros de actividad y métricas clave",
    ],
    status: "available",
  },
]

const IntegrationsPage = () => {
  const params = useParams()
  const orgSlug = (params as { org?: string })?.org

  if (!orgSlug) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
          <PlugZap className="h-4 w-4" />
          Organización no encontrada
        </span>
        <p className="text-sm text-muted-foreground">
          No pudimos cargar las integraciones porque falta el identificador de la organización.
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-6 md:px-6 lg:px-8">
      <div className="space-y-2">
        <Badge variant="outline" className="w-fit gap-2 border-dashed text-xs uppercase tracking-widest">
          <PlugZap className="h-3 w-3" aria-hidden="true" />
          Integraciones disponibles
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">Centro de integraciones</h1>
        <p className="text-sm text-muted-foreground">
          Conecta tus herramientas favoritas para potenciar la colaboración y mantener la información de tu equipo
          siempre actualizada.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {integrationOptions.map((integration) => {
          const Icon = integration.icon
          const statusLabel = integration.status === "beta" ? "Beta" : "Disponible"

          return (
            <Card
              key={integration.id}
              className="flex h-full flex-col justify-between border-border/60 transition-colors hover:border-primary"
            >
              <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{integration.name}</CardTitle>
                      <CardDescription>{integration.description}</CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={integration.status === "beta" ? "secondary" : "outline"}
                    className={cn(
                      integration.status === "beta" && "border-yellow-500/60 bg-yellow-500/10 text-yellow-700",
                    )}
                  >
                    {statusLabel}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {integration.highlights.map((highlight) => (
                    <li key={highlight} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-3">
                  <Button asChild className="gap-2" aria-label={`Ir a la integración de ${integration.name}`}>
                    <Link href={integration.href(orgSlug)}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span>Gestionar {integration.name}</span>
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    aria-label={`Ver documentación de ${integration.name}`}
                  >
                    <Link href={integration.href(orgSlug)}>
                      <span>Ver detalles</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default IntegrationsPage

