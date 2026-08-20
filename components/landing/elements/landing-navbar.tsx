import Link from "next/link"

import Logo from "@/components/commons/logo-comp"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

const navigationItems = [
  { href: "#features", label: "Características" },
  { href: "#use-cases", label: "Casos de Uso" },
  { href: "#faq", label: "Preguntas Frecuentes" },
]

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 flex w-full justify-center border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" prefetch={false} className="flex items-center gap-2" aria-label="Ir al inicio">
          <Logo />
          <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-2xl font-bold tracking-widest text-transparent">
            <span>GU</span>
            <span>IA</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Secciones destacadas">
          {navigationItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/login" prefetch={false}>
              Iniciar Sesión
            </Link>
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-primary to-cyan-500 shadow-lg shadow-primary/20 transition-opacity hover:opacity-90"
          >
            <Link href="/signup" prefetch={false}>
              Comenzar
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
