"use client"

import { useEffect } from "react"
import { AlertTriangle, ArrowLeft, Home, RotateCw } from "lucide-react"
import ErrorScreen from "@/components/common/error-screen"

type ErrorPageProps = {
  error: Error & { digest?: string }
  reset: () => void
}

const ErrorPage = ({ error, reset }: ErrorPageProps) => {
  useEffect(() => {
    console.error("Unhandled application error:", error)
  }, [error])

  const actions = [
    {
      type: "button" as const,
      label: "Reintentar",
      onClick: reset,
      variant: "default" as const,
      icon: RotateCw,
      ariaLabel: "Volver a intentar cargar la página",
    },
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
      variant: "ghost" as const,
      icon: Home,
      ariaLabel: "Ir a la página principal",
    },
  ]

  return (
    <ErrorScreen
      title="Algo no salió como esperábamos"
      description="Se produjo un error inesperado. Puedes intentar recargar la página o regresar al inicio."
      icon={AlertTriangle}
      actions={actions}
    />
  )
}

export default ErrorPage

