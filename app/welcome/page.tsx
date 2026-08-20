"use client"

import { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { translateRole } from "@/lib/utils"

function WelcomePage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const orgName = searchParams.get("orgName")
  const orgSlug = searchParams.get("orgSlug")
  const role = searchParams.get("role")

  useEffect(() => {
    // If required parameters are missing, redirect to organizations
    if (!orgName || !orgSlug || !role) {
      router.push("/organizations")
    }
  }, [orgName, orgSlug, role, router])

  if (!orgName || !orgSlug || !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary600"></div>
      </div>
    )
  }

  const handleGoToChat = () => {
    router.push(`/${orgSlug}/chat`)
  }

  const handleGoToDashboard = () => {
    router.push(`/${orgSlug}/dashboard`)
  }

  const isMember = role === "MEMBER"
  const isAdminOrOwner = role === "ADMIN" || role === "OWNER"

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-green-600">
            ¡Bienvenido a {orgName}!
          </CardTitle>
          <CardDescription className="text-lg">
            Has sido agregado exitosamente a la organización
          </CardDescription>
          <div className="mt-4">
            <Badge variant={isAdminOrOwner ? "default" : "secondary"} className="text-sm">
              {translateRole(role)}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              ¿Qué puedes hacer en Guía?
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Chatear con IA</h4>
                  <p className="text-sm text-muted-foreground">
                    Haz preguntas y obtén respuestas inteligentes basadas en los documentos de la organización.
                  </p>
                </div>
              </div>
              
              {/* <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Ver documentos</h4>
                  <p className="text-sm text-muted-foreground">
                    Explora y accede a todos los documentos y fuentes de conocimiento disponibles.
                  </p>
                </div>
              </div> */}
              
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Historial de conversaciones</h4>
                  <p className="text-sm text-muted-foreground">
                    Revisa y continúa conversaciones anteriores.
                  </p>
                </div>
              </div>
              
              {isAdminOrOwner && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Subir documentos</h4>
                    <p className="text-sm text-muted-foreground">
                      Como administrador, puedes subir nuevos documentos y gestionar el conocimiento.
                    </p>
                  </div>
                </div>
              )}
              
              {isMember && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-amber-800">Permisos limitados</h4>
                      <p className="text-sm text-amber-700">
                        Como miembro, no puedes subir documentos. Si necesitas agregar contenido, contacta a un administrador.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="text-center">
            {isMember ? (
              <>
                <Button onClick={handleGoToChat} size="lg" className="px-8">
                  Ir al Chat
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Comienza a chatear con la IA de tu organización
                </p>
              </>
            ) : (
              <>
                <Button onClick={handleGoToDashboard} size="lg" className="px-8">
                  Ir al Dashboard
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  Podrás acceder a todas las funcionalidades desde el dashboard
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function WelcomePageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary600"></div>
      </div>
    }>
      <WelcomePage />
    </Suspense>
  )
}
