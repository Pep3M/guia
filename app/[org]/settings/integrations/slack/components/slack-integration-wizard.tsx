"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Copy, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"

import { buildFallbackManifest } from "../utils"
import type {
  CreateIntegrationPayload,
  OrganizationCategory,
  SlackIntegration,
} from "../types"
import type { UseSlackIntegrationActionsReturn } from "../hooks/use-slack-integration-actions"

interface SlackIntegrationWizardProps {
  isOpen: boolean
  onClose: () => void
  categories: OrganizationCategory[]
  onCreated: (integration: SlackIntegration) => void
  onRefresh: () => void
  actions: UseSlackIntegrationActionsReturn
}

type WizardStep = "details" | "manifest" | "credentials" | "categories" | "summary"

export const SlackIntegrationWizard = ({
  isOpen,
  onClose,
  categories,
  onCreated,
  onRefresh,
  actions,
}: SlackIntegrationWizardProps) => {
  const [step, setStep] = useState<WizardStep>("details")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [manifest, setManifest] = useState<Record<string, unknown> | null>(null)
  const [isManifestLoading, setIsManifestLoading] = useState(false)
  const [manifestError, setManifestError] = useState<string | null>(null)
  const [createdIntegration, setCreatedIntegration] = useState<SlackIntegration | null>(null)
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [signingSecret, setSigningSecret] = useState("")
  const [botToken, setBotToken] = useState("")
  const [botUserId, setBotUserId] = useState("")
  const [defaultThread, setDefaultThread] = useState(true)

  const resetState = () => {
    setStep("details")
    setName("")
    setDescription("")
    setSelectedCategories([])
    setManifest(null)
    setManifestError(null)
    setCreatedIntegration(null)
    setClientId("")
    setClientSecret("")
    setSigningSecret("")
    setBotToken("")
    setBotUserId("")
    setDefaultThread(true)
  }

  const closeWizard = () => {
    resetState()
    onClose()
  }

  useEffect(() => {
    if (!isOpen) {
      resetState()
    }
  }, [isOpen])

  useEffect(() => {
    if (step !== "manifest" || !createdIntegration) {
      return
    }

    const loadManifest = async () => {
      try {
        setManifestError(null)
        setIsManifestLoading(true)
        const response = await actions.fetchManifest(createdIntegration.id)
        setManifest(response)
      } catch (error) {
        console.error(error)
        setManifestError(
          error instanceof Error
            ? error.message
            : "No se pudo generar el manifest automáticamente",
        )
        setManifest(buildFallbackManifest(createdIntegration.name))
      } finally {
        setIsManifestLoading(false)
      }
    }

    void loadManifest()
  }, [step, createdIntegration, actions])

  useEffect(() => {
    if (!createdIntegration) {
      return
    }

    setClientId(createdIntegration.credentialsStatus.hasClientId ? "******" : "")
    setClientSecret(createdIntegration.credentialsStatus.hasClientSecret ? "******" : "")
    setSigningSecret(createdIntegration.credentialsStatus.hasSigningSecret ? "******" : "")
    setBotToken(createdIntegration.credentialsStatus.hasBotToken ? "xoxb-***" : "")
    setBotUserId(createdIntegration.slackBotUserId ?? "")
    setSelectedCategories(createdIntegration.categories.map((category) => category.id))
    setDefaultThread(createdIntegration.defaultThread)
  }, [createdIntegration])

  const isCreating = actions.createIntegrationMutation.isPending
  const isSavingCredentials = actions.updateIntegrationMutation.isPending
  const isSavingCategories = actions.updateIntegrationMutation.isPending

  const handleCreateIntegration = async () => {
    const payload: CreateIntegrationPayload = {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      categoryIds: selectedCategories.length ? selectedCategories : undefined,
    }

    try {
      const integration = await actions.createIntegrationMutation.mutateAsync(payload)
      setCreatedIntegration(integration)
      onCreated(integration)
      setStep("manifest")
    } catch (error) {
      // handled by mutation
    }
  }

  const handleSaveCredentials = async () => {
    if (!createdIntegration) return

    try {
      const updatedIntegration = await actions.updateIntegrationMutation.mutateAsync({
        integrationId: createdIntegration.id,
        data: {
          slackClientId: clientId.trim() || null,
          slackClientSecret: clientSecret.trim() || null,
          slackSigningSecret: signingSecret.trim() || null,
          slackBotToken: botToken.trim() || null,
          slackBotUserId: botUserId.trim() || null,
          defaultThread,
        },
      })

      setCreatedIntegration(updatedIntegration)
      setStep("categories")
    } catch (error) {
      // handled by mutation
    }
  }

  const handleSaveCategories = async () => {
    if (!createdIntegration) return

    if (!selectedCategories.length) {
      toast.error("Selecciona al menos una categoría")
      return
    }

    try {
      const updatedIntegration = await actions.updateIntegrationMutation.mutateAsync({
        integrationId: createdIntegration.id,
        data: {
          categoryIds: selectedCategories,
        },
      })

      setCreatedIntegration(updatedIntegration)
      onRefresh()
      setStep("summary")
    } catch (error) {
      // handled by mutation
    }
  }

  const handleCopyManifest = async () => {
    if (!manifest) {
      toast.error("No hay manifest para copiar aún")
      return
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2))
      toast.success("Manifest copiado al portapapeles")
    } catch (error) {
      console.error(error)
      toast.error("No se pudo copiar el manifest")
    }
  }

  const renderDetailsStep = () => (
    <div className="space-y-6">
      <div>
        <DialogTitle>Paso 1 · Datos básicos</DialogTitle>
        <DialogDescription>
          Nombra tu bot y describe brevemente su propósito. Puedes asignar una categoría después si ya
          la tienes definida.
        </DialogDescription>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="integration-name">Nombre del bot Slack *</Label>
          <Input
            id="integration-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ej: Asistente de Conocimiento"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="integration-description">Descripción</Label>
          <Textarea
            id="integration-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="¿Para qué servirá este bot? Esta información se mostrará a tu equipo."
            rows={3}
          />
        </div>
        <div className="space-y-3">
          <Label>Categorías disponibles (opcional)</Label>
          <ScrollArea className="h-32 rounded-md border">
            <div className="flex flex-col gap-2 p-3">
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aún no tienes categorías creadas. Podrás asignarlas más adelante.
                </p>
              ) : (
                categories.map((category) => {
                  const isChecked = selectedCategories.includes(category.id)
                  return (
                    <label
                      key={category.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                    >
                      <span className="text-sm font-medium">{category.name}</span>
                      <Switch
                        checked={isChecked}
                        onCheckedChange={() =>
                          setSelectedCategories((prev) =>
                            isChecked ? prev.filter((id) => id !== category.id) : [...prev, category.id],
                          )
                        }
                      />
                    </label>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      <DialogFooter className="justify-between gap-2">
        <Button type="button" variant="outline" onClick={closeWizard}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleCreateIntegration} disabled={!name.trim() || isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creando
            </>
          ) : (
            "Crear y continuar"
          )}
        </Button>
      </DialogFooter>
    </div>
  )

  const renderManifestStep = () => (
    <div className="space-y-6">
      <div>
        <DialogTitle>Paso 2 · Manifest para Slack</DialogTitle>
        <DialogDescription>
          Usa este JSON para crear la aplicación en{" "}
          <a
            href="https://api.slack.com/apps"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            api.slack.com/apps
          </a>
          . El manifest incluye scopes, eventos y endpoints necesarios.
        </DialogDescription>
      </div>
      <div className="space-y-3">
        <div className="max-h-[500px] overflow-y-auto">
          {isManifestLoading ? (
            <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando manifest...
            </div>
          ) : (
            <>
              {manifestError && (
                <p className="text-sm text-amber-600">
                  {manifestError}. Generamos un manifest base para que lo ajustes manualmente si lo
                  necesitas.
                </p>
              )}
              <Textarea
                className="min-h-[240px] font-mono text-xs"
                value={manifest ? JSON.stringify(manifest, null, 2) : "// Manifest no disponible todavía"}
                readOnly
              />
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/50 px-4 py-3 text-sm">
          <div>
            <p className="font-semibold">Pasos en Slack</p>
            <ol className="list-decimal pl-5 text-muted-foreground">
              <li>Ve a api.slack.com/apps y crea una app desde manifest.</li>
              <li>Pega el manifest provisto y valida los permisos.</li>
              <li>Instala la app en el workspace correspondiente.</li>
            </ol>
          </div>
          <Button variant="secondary" onClick={handleCopyManifest} disabled={!manifest}>
            <Copy className="mr-2 h-4 w-4" />
            Copiar manifest
          </Button>
        </div>
      </div>
      <DialogFooter className="justify-between gap-2">
        <Button type="button" variant="outline" onClick={closeWizard}>
          Cerrar
        </Button>
        <Button type="button" onClick={() => setStep("credentials")}>
          Continuar · Guardar credenciales
        </Button>
      </DialogFooter>
    </div>
  )

  const renderCredentialsStep = () => (
    <div className="space-y-6">
      <div>
        <DialogTitle>Paso 3 · Credenciales de la app</DialogTitle>
        <DialogDescription>
          Copia los valores desde el panel de Slack una vez instalada la aplicación. Puedes
          actualizarlos más adelante si rotas secretos.
        </DialogDescription>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="client-id">Client ID</Label>
          <Input
            id="client-id"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder="1234567890.1234567890123"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-secret">Client Secret</Label>
          <Input
            id="client-secret"
            value={clientSecret}
            onChange={(event) => setClientSecret(event.target.value)}
            placeholder="Secret provisto por Slack"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signing-secret">Signing Secret</Label>
          <Input
            id="signing-secret"
            value={signingSecret}
            onChange={(event) => setSigningSecret(event.target.value)}
            placeholder="Se encuentra en Basic Information → App Credentials"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-token">Bot User OAuth Token</Label>
          <Input
            id="bot-token"
            value={botToken}
            onChange={(event) => setBotToken(event.target.value)}
            placeholder="xoxb-..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bot-user-id">Bot User ID (opcional)</Label>
          <Input
            id="bot-user-id"
            value={botUserId}
            onChange={(event) => setBotUserId(event.target.value)}
            placeholder="U0XXXXXX"
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Responder en hilo por defecto</p>
            <p className="text-xs text-muted-foreground">
              Si está activo, el bot responderá en el mismo hilo del mensaje que lo mencione.
            </p>
          </div>
          <Switch checked={defaultThread} onCheckedChange={setDefaultThread} />
        </div>
      </div>
      <DialogFooter className="justify-between gap-2">
        <Button type="button" variant="outline" onClick={closeWizard}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSaveCredentials} disabled={isSavingCredentials}>
          {isSavingCredentials ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando
            </>
          ) : (
            "Guardar credenciales"
          )}
        </Button>
      </DialogFooter>
    </div>
  )

  const renderCategoriesStep = () => (
    <div className="space-y-6">
      <div>
        <DialogTitle>Paso 4 · Selecciona las categorías</DialogTitle>
        <DialogDescription>
          El bot solo podrá responder con información asociada a las categorías elegidas. Puedes
          ajustarlas cuando quieras.
        </DialogDescription>
      </div>
      <ScrollArea className="h-56 rounded-md border">
        <div className="flex flex-col gap-2 p-3">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Primero crea categorías en el panel de administración para asociarlas al bot.
            </p>
          ) : (
            categories.map((category) => {
              const isChecked = selectedCategories.includes(category.id)
              return (
                <label
                  key={category.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {category.color && (
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
                    )}
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <Switch
                    checked={isChecked}
                    onCheckedChange={() =>
                      setSelectedCategories((prev) =>
                        isChecked ? prev.filter((id) => id !== category.id) : [...prev, category.id],
                      )
                    }
                  />
                </label>
              )
            })
          )}
        </div>
      </ScrollArea>
      <DialogFooter className="justify-between gap-2">
        <Button type="button" variant="outline" onClick={closeWizard}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleSaveCategories}
          disabled={selectedCategories.length === 0 || isSavingCategories}
        >
          {isSavingCategories ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando
            </>
          ) : (
            "Guardar categorías"
          )}
        </Button>
      </DialogFooter>
    </div>
  )

  const renderSummaryStep = () => (
    <div className="space-y-6">
      <div>
        <DialogTitle>Paso 5 · Checklist final</DialogTitle>
        <DialogDescription>
          Verifica estos pasos en Slack para asegurarte de que la integración esté lista para tu equipo.
        </DialogDescription>
      </div>
      <div className="space-y-3 rounded-md border border-border p-4">
        <p className="text-sm font-semibold uppercase text-muted-foreground">Checklist</p>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>1. Instala la app en el workspace correcto.</li>
          <li>2. Añade el bot al canal donde quieras interactuar.</li>
          <li>3. Menciona al bot y espera el mensaje "Espera, déjame pensar...".</li>
          <li>4. Valida que la respuesta provenga de la categoría correcta.</li>
          <li>5. Revisa la pestaña de registros aquí mismo para auditar las interacciones.</li>
        </ul>
      </div>
      <DialogFooter className="justify-end gap-2">
        <Button type="button" variant="outline" onClick={closeWizard}>
          Cerrar
        </Button>
      </DialogFooter>
    </div>
  )

  const stepContent = (() => {
    switch (step) {
      case "details":
        return renderDetailsStep()
      case "manifest":
        return renderManifestStep()
      case "credentials":
        return renderCredentialsStep()
      case "categories":
        return renderCategoriesStep()
      default:
        return renderSummaryStep()
    }
  })()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? undefined : closeWizard())}>
      <DialogContent className="max-w-3xl">{stepContent}</DialogContent>
    </Dialog>
  )
}

