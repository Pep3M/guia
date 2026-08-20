import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface OrganizationNotFoundViewProps {
  orgSlug: string
}

export const OrganizationNotFoundView = ({ orgSlug }: OrganizationNotFoundViewProps) => {
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Organización no encontrada</h2>
          <p className="text-muted-foreground mb-4">
            No se pudo cargar la organización "{orgSlug}". Verifica que tengas acceso.
          </p>
          <Button asChild>
            <a href="/organizations">Volver a organizaciones</a>
          </Button>
        </Card>
      </div>
    </div>
  )
}
