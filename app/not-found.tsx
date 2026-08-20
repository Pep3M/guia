"use client"

import { ArrowLeft, Home, SearchX } from "lucide-react"
import ErrorScreen from "@/components/common/error-screen"

const NotFound = () => {
  const actions = [
    {
      type: "back" as const,
      label: "Volver atrás",
      variant: "outline" as const,
      icon: ArrowLeft,
      ariaLabel: "Regresar a la página anterior",
    },
    {
      type: "link" as const,
      label: "Ir al inicio",
      href: "/",
      variant: "default" as const,
      icon: Home,
      ariaLabel: "Ir a la página principal",
    },
  ]

  return (
    <ErrorScreen
      title="Página no encontrada"
      description="No pudimos encontrar la ruta solicitada. Verifica la URL o vuelve a la página anterior."
      icon={SearchX}
      actions={actions}
    />
  )
}

export default NotFound

