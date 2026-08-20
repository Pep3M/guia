import { Building2, Code, ShoppingBag, TrendingUp } from "lucide-react"

import dynamic from "next/dynamic"
import { Suspense } from "react"

import { TextAnimate } from "@/components/ui/text-animate"
import { AnimatedList } from "@/components/ui/animated-list"

const useCases = [
  {
    icon: Building2,
    title: "Soporte Hiper-Rápido y Consistente",
    description:
      "Acaba con la frustración de la búsqueda manual. Dale a tus agentes el poder de responder con precisión quirúrgica y un tono humano, citando instantáneamente la fuente (políticas, guías de troubleshooting). Resuelve en el primer contacto y eleva la satisfacción.",
    metric: "85% más rápido en resolución",
    highlight: "Macros inteligentes y fuentes citadas en cada respuesta.",
  },
  {
    icon: TrendingUp,
    title: "Aceleración del Talento (Time to Value)",
    description:
      "Elimina la curva de aprendizaje eterna. Convierte la documentación dispersa en rutas de conocimiento guiadas por IA. Los nuevos ingresos no solo aprenden, aplican de inmediato, pasando de novatos a expertos productivos en una fracción del tiempo.",
    metric: "Onboarding 60% más corto",
    highlight: "Checklist automatizadas y evaluaciones generadas por IA.",
  },
  {
    icon: ShoppingBag,
    title: "Cierre de Ventas sin Fricción",
    description:
      "No pierdas otra venta por falta de información. Mantén a tu equipo comercial armado con el pitch perfecto, el pricing más reciente y casos de éxito listos para enviar, accesibles en el momento exacto en que el cliente pregunta. Impulsa la confianza y la conversión.",
    metric: "Más conversiones (Conocimiento es poder)",
    highlight: "Argumentarios y objeciones respondidas según vertical.",
  },
  {
    icon: Code,
    title: "Flujo de Desarrollo Ininterrumpido",
    description:
      "Detén las interrupciones y las reuniones innecesarias. Centraliza la lógica de negocio, especificaciones y decisiones de diseño. Cualquier desarrollador o PM puede autoconsultar la verdad absoluta del proyecto en segundos, sin depender de sus compañeros.",
    metric: "Productividad",
    highlight: "Información actualizada y accesible en minutos.",
  },
] as const

export function LandingUseCases() {
  return (
    <section id="use-cases" className="scroll-mt-24 py-10 sm:py-20">
      <div className="container px-4">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            <TextAnimate animation="fadeIn">
              Para Cada Tipo de Organización
            </TextAnimate>
          </h2>
          <TextAnimate animation="fadeIn" delay={0.4} className="text-pretty text-lg text-muted-foreground">
            Desde startups hasta corporativos, GUIA traduce conocimiento en acciones inmediatas con paneles adaptados a cada equipo.
          </TextAnimate>
        </div>

        <Suspense fallback={<div className="flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex items-start gap-4 rounded-2xl border border-border/40 bg-foreground/[0.03] p-6"
              aria-hidden="true"
            >
              <div className="size-16 rounded-2xl bg-gradient-to-br from-muted via-muted/70 to-muted/40" />
              <div className="flex flex-1 flex-col gap-3">
                <div className="h-6 w-1/2 rounded-full bg-muted" />
                <div className="h-4 w-full rounded-full bg-muted/80" />
                <div className="h-4 w-3/4 rounded-full bg-muted/60" />
              </div>
            </div>
          ))}
        </div>}>
          <AnimatedList>
            {useCases.map((useCase) => (
              <div key={useCase.title} className="mx-auto flex max-w-4xl items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-cyan-500 to-blue-600 shadow-lg shadow-primary/30">
                  <useCase.icon className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="mb-3 flex flex-col items-center gap-2 md:flex-row md:justify-between">
                    <h3 className="text-2xl font-semibold text-foreground">{useCase.title}</h3>
                    <span className="w-fit rounded-full border border-foreground/20 bg-foreground/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-foreground/70">
                      {useCase.metric}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground text-pretty">{useCase.description}</p>
                  <div className="mt-4 rounded-xl border border-foreground/10 bg-foreground/[0.05] px-4 py-3 text-sm text-foreground/80 shadow-inner shadow-primary/10">
                    {useCase.highlight}
                  </div>
                </div>
              </div>
            ))}
          </AnimatedList>
        </Suspense>
      </div>
    </section>
  )
}
