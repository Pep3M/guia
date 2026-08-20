"use client"

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"
import { toast } from "sonner"

import {
  createIntegration,
  deleteIntegration,
  fetchManifest,
  updateIntegration,
} from "../api"
import type { CreateIntegrationPayload, SlackIntegration, UpdateIntegrationPayload } from "../types"
import { buildFallbackManifest } from "../utils"

interface UseSlackIntegrationActionsOptions {
  organizationId?: string
}

export interface UseSlackIntegrationActionsReturn {
  createIntegrationMutation: UseMutationResult<
    SlackIntegration,
    Error,
    CreateIntegrationPayload
  >
  updateIntegrationMutation: UseMutationResult<
    SlackIntegration,
    Error,
    UpdateIntegrationPayload
  >
  deleteIntegrationMutation: UseMutationResult<{ success: true }, Error, string>
  handleCopyManifest: (integration: SlackIntegration) => Promise<void>
  fetchManifest: (integrationId: string) => Promise<Record<string, unknown>>
}

export const useSlackIntegrationActions = ({
  organizationId,
}: UseSlackIntegrationActionsOptions): UseSlackIntegrationActionsReturn => {
  const queryClient = useQueryClient()

  const createIntegrationMutation = useMutation({
    mutationFn: async (payload: CreateIntegrationPayload) => {
      if (!organizationId) throw new Error("Organización no seleccionada")
      return createIntegration(organizationId, payload)
    },
    onSuccess: (integration) => {
      toast.success("Integración creada exitosamente")
      void queryClient.invalidateQueries({ queryKey: ["slackIntegrations", organizationId] })
      void queryClient.invalidateQueries({ queryKey: ["slackIntegrationLogs"] })
      return integration
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateIntegrationMutation = useMutation({
    mutationFn: async ({ integrationId, data }: UpdateIntegrationPayload) => {
      if (!organizationId) throw new Error("Organización no seleccionada")
      return updateIntegration(organizationId, integrationId, data)
    },
    onSuccess: (integration) => {
      toast.success("Integración actualizada correctamente")
      void queryClient.invalidateQueries({ queryKey: ["slackIntegrations", organizationId] })
      void queryClient.invalidateQueries({ queryKey: ["slackIntegrationLogs"] })
      return integration
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      if (!organizationId) throw new Error("Organización no seleccionada")
      return deleteIntegration(organizationId, integrationId)
    },
    onSuccess: () => {
      toast.success("Integración eliminada")
      void queryClient.invalidateQueries({ queryKey: ["slackIntegrations", organizationId] })
      void queryClient.invalidateQueries({ queryKey: ["slackIntegrationLogs"] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleCopyManifest = async (integration: SlackIntegration) => {
    if (!organizationId) {
      toast.error("Organización no seleccionada")
      return
    }

    try {
      const manifest = await fetchManifest(organizationId, integration.id)
      await navigator.clipboard.writeText(JSON.stringify(manifest, null, 2))
      toast.success("Manifest copiado al portapapeles")
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo obtener el manifest para esta integración",
      )
      const fallbackManifest = buildFallbackManifest(integration.name)
      await navigator.clipboard.writeText(JSON.stringify(fallbackManifest, null, 2))
    }
  }

  return {
    createIntegrationMutation,
    updateIntegrationMutation,
    deleteIntegrationMutation,
    handleCopyManifest,
    fetchManifest: async (integrationId: string) => {
      if (!organizationId) throw new Error("Organización no seleccionada")
      return fetchManifest(organizationId, integrationId)
    },
  }
}

