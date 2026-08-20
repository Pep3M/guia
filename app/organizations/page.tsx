"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { translateRole } from "@/lib/utils"
import { OrganizationLoader } from "@/components/commons/loaders/organization-loader"

interface Organization {
  id: string
  name: string
  slug: string
  role: string
  createdAt: string
}

const fetchOrganizations = async (): Promise<Organization[]> => {
  const response = await fetch("/api/organizations")

  if (!response.ok) {
    throw new Error("Error al cargar organizaciones")
  }

  return response.json()
}

export default function OrganizationsPage() {
  const router = useRouter()

  const { data: organizations = [], isLoading, error } = useQuery({
    queryKey: ["organizations"],
    queryFn: fetchOrganizations,
  })

  useEffect(() => {
    if (error) {
      toast.error("Error al cargar organizaciones")
      console.error("Error:", error)
    }
  }, [error])

  if (isLoading) {
    return (
      <OrganizationLoader />
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No tienes organizaciones</CardTitle>
            <CardDescription>
              Crea tu primera organización para comenzar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => router.push("/onboarding")}>
              Crear organización
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">Tus organizaciones</h1>
          <p className="mt-2 text-muted-foreground">
            Selecciona una organización para continuar
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 flex-1">
          {organizations.map((org) => (
            <Card
              key={org.id}
              className="cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => router.push(org.role === 'MEMBER' ? `/${org.slug}/chat` : `/${org.slug}/dashboard`)}
            >
              <CardHeader>
                <CardTitle>{org.name}</CardTitle>
                <CardDescription>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {translateRole(org.role)}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">/{org.slug}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <Button variant="outline" className="w-full" onClick={() => router.push("/onboarding")}>
            Crear nueva organización
          </Button>
        </div>
      </div>
    </div>
  )
}
