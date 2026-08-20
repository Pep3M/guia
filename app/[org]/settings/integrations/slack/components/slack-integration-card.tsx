"use client"

import { ActivitySquare, Download, KeyRound, Layers, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import type { SlackIntegration } from "../types"

interface SlackIntegrationCardProps {
  integration: SlackIntegration
  onCopyManifest: (integration: SlackIntegration) => void
  onOpenCredentials: (integration: SlackIntegration) => void
  onOpenCategories: (integration: SlackIntegration) => void
  onViewLogs: (integration: SlackIntegration) => void
  onDelete: (integration: SlackIntegration) => void
}

export const SlackIntegrationCard = ({
  integration,
  onCopyManifest,
  onOpenCredentials,
  onOpenCategories,
  onViewLogs,
  onDelete,
}: SlackIntegrationCardProps) => {
  const credentialsComplete =
    integration.credentialsStatus.hasClientId &&
    integration.credentialsStatus.hasClientSecret &&
    integration.credentialsStatus.hasSigningSecret &&
    integration.credentialsStatus.hasBotToken

  return (
    <Card className="border-border/70">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-xl">{integration.name}</CardTitle>
          <CardDescription className="mt-1 text-sm">
            {integration.description ?? "Sin descripción"}
          </CardDescription>
        </div>
        <Badge variant={integration.isActive ? "default" : "secondary"}>
          {integration.isActive ? "Activo" : "Inactivo"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={credentialsComplete ? "default" : "secondary"}>
            {credentialsComplete ? "Credenciales completas" : "Credenciales pendientes"}
          </Badge>
          {integration.slackTeamId && (
            <Badge variant="outline">Team ID: {integration.slackTeamId}</Badge>
          )}
          {integration.slackBotUserId && (
            <Badge variant="outline">Bot: {integration.slackBotUserId}</Badge>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Categorías asociadas</p>
          {integration.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin categorías asignadas</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {integration.categories.map((category) => (
                <Badge key={category.id} variant="secondary">
                  {category.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onCopyManifest(integration)}>
            <Download className="mr-2 h-4 w-4" />
            Manifest
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenCredentials(integration)}>
            <KeyRound className="mr-2 h-4 w-4" />
            Credenciales
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenCategories(integration)}>
            <Layers className="mr-2 h-4 w-4" />
            Categorías
          </Button>
          <Button variant="outline" size="sm" onClick={() => onViewLogs(integration)}>
            <ActivitySquare className="mr-2 h-4 w-4" />
            Ver registros
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(integration)}
            className="ml-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

