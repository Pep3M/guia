"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { OrganizationLoader } from "@/components/commons/loaders/organization-loader"

const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export default function OnboardingPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingMemberships, setIsCheckingMemberships] = useState(true)

  // Si el usuario ya pertenece a alguna organización (fue invitado), no necesita crear una
  useEffect(() => {
    const checkMemberships = async () => {
      try {
        const response = await fetch("/api/organizations")
        if (response.ok) {
          const organizations = await response.json()
          if (organizations.length > 0) {
            router.push("/organizations")
            return
          }
        }
      } catch (error) {
        console.error("Error checking memberships:", error)
      } finally {
        setIsCheckingMemberships(false)
      }
    }

    checkMemberships()
  }, [router])

  const handleNameChange = (value: string) => {
    setName(value)
    // Auto-generate slug from name
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, slug }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Error al crear la organización")
      }

      const organization = await response.json()

      toast.success("¡Organización creada exitosamente!")
      router.push(`/${organization.slug}/dashboard`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear la organización")
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingMemberships) {
    return <OrganizationLoader />
  }

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-4rem)] items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Bienvenido a Guía</CardTitle>
          <CardDescription>
            Crea tu primera organización para comenzar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la organización</Label>
              <Input
                id="name"
                type="text"
                placeholder="Mi Empresa"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                disabled={isLoading}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">
                Slug (URL de tu organización)
              </Label>
              <Input
                id="slug"
                type="text"
                placeholder="mi-empresa"
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                required
                disabled={isLoading}
                maxLength={50}
                pattern="^[a-z0-9-]+$"
              />
              <p className="text-xs text-muted-foreground">
                Solo letras minúsculas, números y guiones
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creando organización..." : "Crear organización"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
