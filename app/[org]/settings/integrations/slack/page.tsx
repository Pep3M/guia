'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Plus, ShieldQuestion } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrganization } from '@/lib/hooks/use-organization'

import { fetchCategories, fetchIntegrations } from './api'
import {
  DeleteIntegrationDialog,
  EditCategoriesDialog,
  EditCredentialsDialog,
  SlackIntegrationCard,
  SlackIntegrationGuide,
  SlackIntegrationLogs,
  SlackIntegrationWizard,
} from './components'
import { useSlackIntegrationActions } from './hooks/use-slack-integration-actions'
import type { SlackIntegration } from './types'

const SlackIntegrationsPage = () => {
  const params = useParams()
  const orgSlug = (params as { org?: string })?.org
  const { data: organization, isLoading: loadingOrganization } = useOrganization(orgSlug ?? '')
  const organizationId = organization?.id

  const [isWizardOpen, setWizardOpen] = useState(false)
  const [credentialsIntegration, setCredentialsIntegration] = useState<SlackIntegration | null>(null)
  const [categoriesIntegration, setCategoriesIntegration] = useState<SlackIntegration | null>(null)
  const [integrationToDelete, setIntegrationToDelete] = useState<SlackIntegration | null>(null)
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null)

  const actions = useSlackIntegrationActions({ organizationId })

  const integrationsQuery = useQuery({
    queryKey: ['slackIntegrations', organizationId],
    queryFn: () => fetchIntegrations(organizationId!),
    enabled: Boolean(organizationId),
  })

  const categoriesQuery = useQuery({
    queryKey: ['slackCategories', organizationId],
    queryFn: () => fetchCategories(organizationId!),
    enabled: Boolean(organizationId),
  })

  const integrations = integrationsQuery.data ?? []
  const categories = categoriesQuery.data ?? []

  useEffect(() => {
    if (!selectedIntegrationId && integrations.length > 0) {
      setSelectedIntegrationId(integrations[0].id)
    }
  }, [integrations, selectedIntegrationId])

  const selectedIntegration = useMemo(
    () => integrations.find((integration) => integration.id === selectedIntegrationId) ?? null,
    [integrations, selectedIntegrationId],
  )

  const handleIntegrationCreated = (integration: SlackIntegration) => {
    setSelectedIntegrationId(integration.id)
  }

  const handleViewLogs = (integration: SlackIntegration) => {
    setSelectedIntegrationId(integration.id)
    setTimeout(() => {
      const logsSection = document.getElementById('slack-logs-section')
      logsSection?.scrollIntoView({ behavior: 'smooth' })
    }, 80)
  }

  if (loadingOrganization || !organizationId) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Cargando organización...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-6 md:px-6 lg:px-8">
      <div className="flex flex-col gap-3">
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="w-fit gap-2 text-muted-foreground hover:text-foreground"
          aria-label="Volver al listado de integraciones"
        >
          <Link href={`/${orgSlug}/settings/integrations`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Volver a integraciones</span>
          </Link>
        </Button>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Integraciones Slack</h1>
          <p className="text-sm text-muted-foreground">
            Crea y administra bots de Slack que consultan la base de conocimiento de {organization.name}.
            Asigna categorías, guía a los administradores y revisa los registros de uso.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva integración
          </Button>
        </div>
        </div>
      </div>

      <SlackIntegrationWizard
        isOpen={isWizardOpen}
        onClose={() => setWizardOpen(false)}
        categories={categories}
        onCreated={handleIntegrationCreated}
        onRefresh={() => integrationsQuery.refetch()}
        actions={actions}
      />

      <EditCredentialsDialog
        integration={credentialsIntegration}
        onClose={() => setCredentialsIntegration(null)}
        actions={actions}
      />

      <EditCategoriesDialog
        integration={categoriesIntegration}
        categories={categories}
        onClose={() => setCategoriesIntegration(null)}
        actions={actions}
      />

      <DeleteIntegrationDialog
        integration={integrationToDelete}
        onClose={() => setIntegrationToDelete(null)}
        actions={actions}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start md:w-auto">
          <TabsTrigger value="overview">Integraciones</TabsTrigger>
          <TabsTrigger value="guide">Guía detallada</TabsTrigger>
          <TabsTrigger value="logs" disabled={!selectedIntegrationId}>
            Registros
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {integrationsQuery.isFetching ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
                Cargando integraciones...
              </CardContent>
            </Card>
          ) : integrations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
                <ShieldQuestion className="h-10 w-10" />
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-foreground">Sin bots configurados aún</p>
                  <p className="text-sm">
                    Crea tu primer bot de Slack para que tu equipo pueda consultar la base de conocimiento
                    desde cualquier canal.
                  </p>
                </div>
                <Button onClick={() => setWizardOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear integración Slack
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {integrations.map((integration) => (
                <SlackIntegrationCard
                  key={integration.id}
                  integration={integration}
                  onCopyManifest={actions.handleCopyManifest}
                  onOpenCredentials={setCredentialsIntegration}
                  onOpenCategories={setCategoriesIntegration}
                  onViewLogs={handleViewLogs}
                  onDelete={setIntegrationToDelete}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="guide">
          <SlackIntegrationGuide />
        </TabsContent>

        <TabsContent value="logs">
          <SlackIntegrationLogs
            organizationId={organizationId}
            integrations={integrations}
            selectedIntegrationId={selectedIntegrationId}
            onSelectIntegration={(integrationId) => setSelectedIntegrationId(integrationId || null)}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default SlackIntegrationsPage
