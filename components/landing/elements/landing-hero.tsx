import { ArrowRight, LightbulbIcon, ShieldCheckIcon, Sparkles } from "lucide-react"
import Link from "next/link"

import { Ripple } from "@/components/ui/ripple"
import { Button } from "@/components/ui/button"
import AnimatedBgOrb from "./hero/AnimatedBgOrb"
import { TextAnimate } from "@/components/ui/text-animate"
import { AnimatedList } from "@/components/ui/animated-list"
import { TextAurora } from "./hero/textAurora"
import { DemoButton } from "@/components/landing/elements/demo-button"

const dataSources = [
  { id: "sources", label: "Bases & Documentos", description: "Conexiones en vivo a tus repositorios", icon: <LightbulbIcon className="h-5 w-5" /> },
  { id: "ai", label: "Motor IA de GUIA", description: "Pipeline RAG entrenado para tu dominio" },
  { id: "segments", label: "Segmentación Segura", description: "Respuestas filtradas por espacios y roles", icon: <ShieldCheckIcon className="h-5 w-5" /> },
]

export function LandingHero() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-32 h-[calc(100vh-100px)]">
      <AnimatedBgOrb />
      <Ripple />
      <div className="container px-4 h-full flex items-center justify-center">
        <div className="mx-auto flex flex-col items-center justify-center text-center gap-0 md:gap-8">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            Impulsado por IA contextual
          </div>

          <h1 className="text-4xl font-bold tracking-tighter md:text-5xl lg:text-7xl text-balance mb-6">
            <TextAnimate className="block text-4xl md:text-6xl -mb-1" animation="fadeIn">Accede a Tu Información</TextAnimate>
            <TextAurora />
          </h1>

          {/* Subheadline */}
          <p className="mb-10 text-base md:text-lg text-muted-foreground sm:text-xl max-w-2xl mx-auto text-pretty">
            <TextAnimate animation="fadeIn" delay={0.8}>
              Una plataforma que organiza tu conocimiento en espacios compartimentados. Accede a la información exacta que necesitas, cuando la necesitas, con control total sobre quién ve qué.
            </TextAnimate>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <AnimatedList delay={2.2}>
              <Button
                size="lg"
                asChild
                className="bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90 shadow-lg shadow-primary/20 text-base px-8"
              >
                <Link href="/signup">
                  Comenzar Ahora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <DemoButton />
            </AnimatedList>
          </div>

          {/* Social Proof */}
          {/* <div className="mt-12 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground">Confiado por equipos innovadores en todo el mundo</p>
            <div className="flex items-center gap-8 opacity-60">
              <div className="text-xl font-bold">Company A</div>
              <div className="text-xl font-bold">Company B</div>
              <div className="text-xl font-bold">Company C</div>
            </div>
          </div> */}
        </div>
      </div>
    </section>
  )
}
