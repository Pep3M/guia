"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { OrganizationLoader } from "./commons/loaders/organization-loader"

interface OrganizationWithRole {
  id: string
  name: string
  slug: string
  role: string
}

const fetchOrganizations = async (): Promise<OrganizationWithRole[]> => {
  const response = await fetch("/api/organizations")
  if (!response.ok) throw new Error("Error getting organizations")
  return response.json()
}

interface MemberAccessGuardProps {
  children: React.ReactNode
  orgSlug: string
  allowedRoles?: string[]
}

export function MemberAccessGuard({ children, orgSlug, allowedRoles = ["OWNER", "ADMIN"] }: MemberAccessGuardProps) {
  const router = useRouter()

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  })

  const currentOrg = organizations?.find((o) => o.slug === orgSlug)
  const userRole = currentOrg?.role

  useEffect(() => {
    if (!isLoading && currentOrg && userRole && !allowedRoles.includes(userRole)) {
      toast.error("No tienes permisos para acceder a esta sección")
      router.push(`/${orgSlug}/chat`)
    }
  }, [isLoading, currentOrg, userRole, allowedRoles, orgSlug, router])

  // Show loading while checking permissions
  if (isLoading) 
    return <OrganizationLoader />

  // If user doesn't have permission, show access denied message
  if (currentOrg && userRole && !allowedRoles.includes(userRole)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos para acceder a esta sección
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Como miembro, solo puedes acceder al chat de la organización.
            </p>
            <Button 
              onClick={() => router.push(`/${orgSlug}/chat`)} 
              className="w-full"
            >
              Ir al Chat
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If user has permission, render children
  return <>{children}</>
}
