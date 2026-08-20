"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlayCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { signIn } from "@/lib/auth/auth-client"

/**
 * Acceso a la organización de demostración.
 *
 * No hay ninguna vía de autenticación especial detrás: entra con un usuario y
 * una contraseña normales, que son públicos a propósito. Así la demo no abre
 * ningún camino que no exista ya para cualquier visitante.
 *
 * Se muestra sólo si NEXT_PUBLIC_DEMO_MODE=true y hay credenciales publicadas.
 */
export const DemoButton = () => {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const email = process.env.NEXT_PUBLIC_DEMO_EMAIL
  const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD
  const orgSlug = process.env.NEXT_PUBLIC_DEMO_ORG_SLUG || "nordika"

  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true" || !email || !password) {
    return null
  }

  const handleClick = async () => {
    setIsLoading(true)

    try {
      const { error } = await signIn.email({ email, password })

      if (error) {
        throw new Error(error.message)
      }

      router.push(`/${orgSlug}/chat`)
      router.refresh()
    } catch (error) {
      console.error("Demo sign-in error:", error)
      toast.error("La demostración no está disponible en este momento")
      setIsLoading(false)
    }
  }

  return (
    <Button
      size="lg"
      variant="outline"
      onClick={handleClick}
      disabled={isLoading}
      className="text-base px-8 bg-transparent"
    >
      <PlayCircle className="mr-2 h-5 w-5" />
      {isLoading ? "Entrando..." : "Probar la demo"}
    </Button>
  )
}
