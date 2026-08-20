import Link from "next/link"

export function LandingFooter() {
  return (
    <footer className="border-t border-border/40 py-12">
      <div className="container px-4">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary via-cyan-500 to-blue-600 shadow-lg shadow-primary/20">
                <div className="h-4 w-4 rounded-sm bg-primary-foreground" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
                GUIA
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Transforma tus datos en conversaciones inteligentes con tecnología de IA avanzada.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold mb-4">Producto</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#features" className="hover:text-foreground transition-colors">
                  Características
                </Link>
              </li>
              <li>
                <Link href="#use-cases" className="hover:text-foreground transition-colors">
                  Casos de Uso
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Hoja de Ruta
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Empresa</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Acerca de
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Carreras
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Privacidad
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Términos
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Seguridad
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-foreground transition-colors">
                  Cumplimiento
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2025 GUIA. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">
              Twitter
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              LinkedIn
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              GitHub
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
