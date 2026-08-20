"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"

import type {
  OrganizationCategory,
  SlackIntegration,
} from "../types"
import type { UseSlackIntegrationActionsReturn } from "../hooks/use-slack-integration-actions"

interface EditCredentialsDialogProps {
  integration: SlackIntegration | null
  onClose: () => void
  actions: UseSlackIntegrationActionsReturn
}

export const EditCredentialsDialog = ({
  integration,
  onClose,
  actions,
}: EditCredentialsDialogProps) => {
  const [clientId, setClientId] = useState("")
  const [clientSecret, setClientSecret] = useState("")
  const [signingSecret, setSigningSecret] = useState("")
  const [botToken, setBotToken] = useState("")
  const [botUserId, setBotUserId] = useState("")
  const [defaultThread, setDefaultThread] = useState(true)

  useEffect(() => {
    if (!integration) {
      setClientId("")
      setClientSecret("")
      setSigningSecret("")
      setBotToken("")
      setBotUserId("")
      setDefaultThread(true)
      return
    }

    setClientId(integration.credentialsStatus.hasClientId ? "******" : "")
    setClientSecret(integration.credentialsStatus.hasClientSecret ? "******" : "")
    setSigningSecret(integration.credentialsStatus.hasSigningSecret ? "******" : "")
    setBotToken(integration.credentialsStatus.hasBotToken ? "xoxb-***" : "")
    setBotUserId(integration.slackBotUserId ?? "")
    setDefaultThread(integration.defaultThread)
  }, [integration])

  const handleSave = async () => {
    if (!integration) return

    try {
      await actions.updateIntegrationMutation.mutateAsync({
        integrationId: integration.id,
        data: {
          slackClientId: clientId.trim() || null,
          slackClientSecret: clientSecret.trim() || null,
          slackSigningSecret: signingSecret.trim() || null,
          slackBotToken: botToken.trim() || null,
          slackBotUserId: botUserId.trim() || null,
          defaultThread,
        },
      })
      onClose()
    } catch (error) {
      // handled by mutation
    }
  }

  return (
    <Dialog open={Boolean(integration)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Editar credenciales</DialogTitle>
          <DialogDescription>
            Actualiza las credenciales de Slack cuando rotes tokens o regeneres secretos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-client-id">Client ID</Label>
            <Input
              id="edit-client-id"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              placeholder="1234567890.1234567890123"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-client-secret">Client Secret</Label>
            <Input
              id="edit-client-secret"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              placeholder="Secret provisto por Slack"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-signing-secret">Signing Secret</Label>
            <Input
              id="edit-signing-secret"
              value={signingSecret}
              onChange={(event) => setSigningSecret(event.target.value)}
              placeholder="Se encuentra en Basic Information → App Credentials"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-bot-token">Bot User OAuth Token</Label>
            <Input
              id="edit-bot-token"
              value={botToken}
              onChange={(event) => setBotToken(event.target.value)}
              placeholder="xoxb-..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-bot-user-id">Bot User ID</Label>
            <Input
              id="edit-bot-user-id"
              value={botUserId}
              onChange={(event) => setBotUserId(event.target.value)}
              placeholder="U0XXXXXX"
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Responder en hilo por defecto</p>
              <p className="text-xs text-muted-foreground">
                Si está activo, el bot continuará la conversación dentro del hilo original.
              </p>
            </div>
            <Switch checked={defaultThread} onCheckedChange={setDefaultThread} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={actions.updateIntegrationMutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={actions.updateIntegrationMutation.isPending}
          >
            {actions.updateIntegrationMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando
              </>
            ) : (
              "Guardar cambios"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface EditCategoriesDialogProps {
  integration: SlackIntegration | null
  categories: OrganizationCategory[]
  onClose: () => void
  actions: UseSlackIntegrationActionsReturn
}

export const EditCategoriesDialog = ({
  integration,
  categories,
  onClose,
  actions,
}: EditCategoriesDialogProps) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  useEffect(() => {
    if (!integration) {
      setSelectedCategories([])
      return
    }
    setSelectedCategories(integration.categories.map((category) => category.id))
  }, [integration])

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const handleSave = async () => {
    if (!integration || selectedCategories.length === 0) return

    try {
      await actions.updateIntegrationMutation.mutateAsync({
        integrationId: integration.id,
        data: { categoryIds: selectedCategories },
      })
      onClose()
    } catch (error) {
      // handled by mutation
    }
  }

  return (
    <Dialog open={Boolean(integration)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Asignar categorías</DialogTitle>
          <DialogDescription>
            Selecciona las categorías de conocimiento que el bot puede usar para responder.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 rounded-md border">
          <div className="flex flex-col gap-2 p-3">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay categorías disponibles. Crea nuevas categorías antes de asociarlas al bot.
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
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      <span className="text-sm font-medium">{category.name}</span>
                    </div>
                    <Switch checked={isChecked} onCheckedChange={() => toggleCategory(category.id)} />
                  </label>
                )
              })
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={actions.updateIntegrationMutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              selectedCategories.length === 0 || actions.updateIntegrationMutation.isPending
            }
          >
            {actions.updateIntegrationMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando
              </>
            ) : (
              "Guardar selección"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteIntegrationDialogProps {
  integration: SlackIntegration | null
  onClose: () => void
  actions: UseSlackIntegrationActionsReturn
}

export const DeleteIntegrationDialog = ({
  integration,
  onClose,
  actions,
}: DeleteIntegrationDialogProps) => {
  const handleDelete = async () => {
    if (!integration) return

    try {
      await actions.deleteIntegrationMutation.mutateAsync(integration.id)
      onClose()
    } catch (error) {
      // handled by mutation
    }
  }

  return (
    <AlertDialog open={Boolean(integration)} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar integración Slack</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción es irreversible y eliminará al bot {integration?.name}. No podrás recuperar los
            registros asociados aunque se conservarán a nivel histórico.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={actions.deleteIntegrationMutation.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={actions.deleteIntegrationMutation.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {actions.deleteIntegrationMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              "Eliminar bot"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

