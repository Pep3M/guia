import { Button } from "@/components/ui/button"
import { TextAnimate } from "@/components/ui/text-animate"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

export function LandingCTA() {
  return (
    <section id="contact" className="scroll-mt-24 bg-muted/30 py-20 sm:py-32">
      <div className="container px-4 ">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-cyan-500 to-blue-600 p-12 sm:p-16 shadow-2xl">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-1/2 -right-1/4 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse-slow" />
            <div className="absolute -bottom-1/2 -left-1/4 h-96 w-96 rounded-full bg-white/10 blur-3xl animate-pulse-slow" />
          </div>

          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl mb-6 text-balance">
              <TextAnimate animation="fadeIn">¿Listo Para Mejorar Cómo Tu Equipo Accede a la Información?</TextAnimate>
            </h2>
            <TextAnimate animation="fadeIn" delay={0.4} className="text-lg text-white/90 mb-8 text-pretty">
              Organiza tu conocimiento, controla quién accede a qué y encuentra información al instante. Instálalo en tu propia infraestructura.
            </TextAnimate>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90 shadow-xl text-base px-8">
                <Link href="/signup">
                  Crear una cuenta
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/20 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm text-base px-8"
              >
                <Link href="https://github.com/Pep3M/guia">Ver el código</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
