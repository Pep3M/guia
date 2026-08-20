"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, FileUp, Users, Settings, Sparkles, Database } from "lucide-react"

const actions = [
  {
    title: "Nuevo Chat",
    description: "Iniciar una conversación",
    icon: MessageSquare,
    href: "/",
  },
  {
    title: "Subir Documentos",
    description: "Agregar base de conocimiento",
    icon: FileUp,
    href: "/knowledge",
  },
  {
    title: "Administrar Equipo",
    description: "Invitar miembros",
    icon: Users,
    href: "/settings",
  },
  {
    title: "Configurar IA",
    description: "Configuración del modelo",
    icon: Sparkles,
    href: "/settings",
  },
  {
    title: "Orígenes de Datos",
    description: "Conectar integraciones",
    icon: Database,
    href: "/settings",
  },
  {
    title: "Configuración",
    description: "Config de organización",
    icon: Settings,
    href: "/settings",
  },
]

export function QuickActions() {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Acciones Rápidas</CardTitle>
        <CardDescription>Tareas comunes y atajos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.title}
                variant="outline"
                className="h-auto flex-col items-start p-4 gap-2 hover:bg-primary/5 hover:border-primary/50 transition-all group bg-transparent"
                asChild
              >
                <a href={action.href}>
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm text-foreground">{action.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 text-wrap">{action.description}</div>
                  </div>
                </a>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
