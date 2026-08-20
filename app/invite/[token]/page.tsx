"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import Link from "next/link"
import { signOut } from "@/lib/auth/auth-client"
import { translateRole } from "@/lib/utils"

interface Invitation {
  id: string
  email: string
  role: string
  organization: {
    id: string
    name: string
    slug: string
  }
  expiresAt: string
}

interface User {
  id: string
  email: string
  name: string
}

const fetchInvitation = async (token: string): Promise<Invitation> => {
  const response = await fetch(`/api/invitations/${token}`)
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || "Error al obtener la invitación")
  }
  
  return response.json()
}

const fetchCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await fetch("/api/auth/me")
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

const acceptInvitation = async (token: string) => {
  const response = await fetch(`/api/invitations/${token}`, {
    method: "POST",
  })
  
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error || "Error al aceptar la invitación")
  }
  
  return response.json()
}

function InvitationPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const token = params.token as string

  const [user, setUser] = useState<User | null>(null)
  const [isCheckingUser, setIsCheckingUser] = useState(true)
  const [hasAttemptedAcceptance, setHasAttemptedAcceptance] = useState(false)

  // Fetch invitation data
  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ["invitation", token],
    queryFn: () => fetchInvitation(token),
    enabled: !!token,
  })

  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      try {
        const userData = await fetchCurrentUser()
        setUser(userData)
      } catch (error) {
        console.error("Error checking user:", error)
      } finally {
        setIsCheckingUser(false)
      }
    }
    
    checkUser()
  }, [])

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: acceptInvitation,
    onSuccess: (data) => {
      if (data.alreadyMember) {
        toast.success("Ya eres miembro de esta organización")
      } else {
        toast.success("¡Invitación aceptada!")
      }
      // Invalidate organizations query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["organizations"] })
      // Redirect to welcome page
      router.push(`/welcome?orgName=${encodeURIComponent(data.organization.name)}&orgSlug=${data.organization.slug}&role=${invitation?.role}`)
    },
    onError: (error) => {
      toast.error(error.message || "Error al aceptar la invitación")
    },
  })

  // Handle auto-acceptance for logged in users
  useEffect(() => {
    if (!isCheckingUser && user && invitation && user.email === invitation.email && !hasAttemptedAcceptance && !acceptInvitationMutation.isPending) {
      // User is logged in and email matches - auto accept
      setHasAttemptedAcceptance(true)
      acceptInvitationMutation.mutate(token)
    }
  }, [isCheckingUser, user, invitation, token, hasAttemptedAcceptance, acceptInvitationMutation.isPending])

  if (isLoading || isCheckingUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando invitación...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>
              {error.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invitación no encontrada</CardTitle>
            <CardDescription>
              La invitación no existe o ha expirado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is logged in but email doesn't match
  if (user && user.email !== invitation.email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-orange-600">Email incorrecto</CardTitle>
            <CardDescription>
              Esta invitación es para <strong>{invitation.email}</strong>.
              <br />
              Por favor cierra sesión e inicia con el email correcto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full" onClick={() => signOut()}>
              Cerrar sesión
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // User is not logged in - show invitation details
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">¡Has sido invitado!</CardTitle>
          <CardDescription>
            Has sido invitado a unirte a <strong>{invitation.organization.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Organización:</strong> {invitation.organization.name}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Rol:</strong> {translateRole(invitation.role)}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Email invitado:</strong> {invitation.email}
            </p>
          </div>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href={`/signup?invitation=${token}`}>
                Crear cuenta
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/login?invitation=${token}`}>
                Ya tengo cuenta
              </Link>
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground text-center">
            Esta invitación expira el {new Date(invitation.expiresAt).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function InvitationPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary600"></div>
      </div>
    }>
      <InvitationPage />
    </Suspense>
  )
}
