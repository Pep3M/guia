"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { signUp, signIn } from "@/lib/auth/auth-client"
import { toast } from "sonner"
import { CircuitBackground } from "@/components/bg/circuit-background"

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitation = searchParams.get("invitation")
  const redirect = searchParams.get("redirect")

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [invitationData, setInvitationData] = useState<{ organizationName: string } | null>(null)

  // Fetch invitation data and pre-fill email if invitation token exists
  useEffect(() => {
    const fetchInvitationData = async () => {
      if (invitation) {
        try {
          const response = await fetch(`/api/invitations/${invitation}`)
          if (response.ok) {
            const data = await response.json()
            setEmail(data.email)
            setInvitationData({ organizationName: data.organization.name })
          }
        } catch (error) {
          console.error("Error fetching invitation data:", error)
        }
      }
    }

    fetchInvitationData()
  }, [invitation])

  // Store invitation token in localStorage if present
  useEffect(() => {
    if (invitation) {
      localStorage.setItem("invitationToken", invitation)
    }
  }, [invitation])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden")
      return
    }

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres")
      return
    }

    setIsLoading(true)

    try {
      await signUp.email({
        email,
        password,
        name,
      })

      toast.success("¡Cuenta creada exitosamente!")

      // Check if there's a stored invitation token
      const storedToken = localStorage.getItem("invitationToken")
      if (storedToken) {
        localStorage.removeItem("invitationToken")
        router.push(`/invite/${storedToken}`)
      } else if (redirect) {
        // Si hay un redirect explícito, respetarlo
        router.push(redirect)
      } else {
        router.push("/onboarding")
      }
      router.refresh()
    } catch (error) {
      toast.error("Error al crear la cuenta. El email podría estar en uso.")
      console.error("Signup error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true)

    try {
      // Store invitation token in localStorage before redirect
      const storedToken = localStorage.getItem("invitationToken")
      const callbackURL = storedToken ? `/invite/${storedToken}` : (redirect || "/onboarding")

      await signIn.social({
        provider: "google",
        callbackURL,
      })
    } catch (error) {
      toast.error("Error al registrarse con Google")
      console.error("Google signup error:", error)
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Circuit background */}
      <CircuitBackground />

      {/* Gradient overlay */}
      <div
        className="fixed inset-0"
        style={{
          zIndex: 1,
          background: "radial-gradient(circle at 40% 40%, oklch(0.55 0.22 240 / 0.1) 0%, var(--background) 60%, #00000000 100%)",
        }}
      />
      <div
        className="fixed inset-0"
        style={{
          zIndex: 1,
          background: "radial-gradient(circle at 60% 70%, oklch(0.5 0.2 280 / 0.2) 0%, #ffffff00 50%)",
        }}
      />
      <Card
        className="relative w-screen h-screen flex flex-col items-center justify-center md:w-full md:h-auto md:max-w-md backdrop-blur-md bg-card/50 border-border/50 shadow-2xl"
        style={{ zIndex: 2 }}
      >
        <CardHeader className="space-y-1 text-center w-full py-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br/20 from-accent via-blue-500 to-purple-500 shadow-lg shadow-accent/50">
            <div className="flex w-full h-full items-center p-4 justify-center rounded-3xl bg-primary">
              <div className="h-full w-full rounded-full bg-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-accent via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Crear cuenta
          </CardTitle>
          <CardDescription>
            {invitationData
              ? `Has sido invitado a unirte a ${invitationData.organizationName}`
              : "Ingresa tus datos para crear una nueva cuenta"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full bg-gradient-to-r from-accent via-blue-500 to-purple-500 hover:opacity-90 transition-opacity shadow-lg shadow-accent/30" disabled={isLoading}>
              {isLoading ? "Creando cuenta..." : "Crear cuenta"}
            </Button>
          </form>

          {/* <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 text-muted-foreground">O continuar con</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full bg-background/50 hover:bg-background/80 transition-colors"
            onClick={handleGoogleSignup}
            disabled={isLoading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button> */}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Inicia sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <SignupForm />
    </Suspense>
  )
}

