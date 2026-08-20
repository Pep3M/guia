import { Loader2 } from 'lucide-react'

export const OrganizationLoadingView = () => {
  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando organización...</p>
        </div>
      </div>
    </div>
  )
}
