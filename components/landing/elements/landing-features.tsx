import type { LucideIcon } from "lucide-react"
import dynamic from "next/dynamic"
import { Suspense } from "react"
import { BadgeCheck, Brain, Database, MessageSquare, Shield, Workflow, Zap } from "lucide-react"

import { BentoGrid } from "@/components/ui/bento-grid"
import { MagicCard } from "@/components/ui/magic-card"
import { NumberTicker } from "@/components/ui/number-ticker"
import { TextAnimate } from "@/components/ui/text-animate"
import { cn } from "@/lib/utils"
import { AnimatedElement } from "./hero/animated-element"
import { AnimatedBeamFeatures } from "./features/animated-beam-features"

const FeatureBeam = () => (
  <Suspense
    fallback={
      <div className="hidden h-80 w-full items-center justify-center sm:flex">
        <div className="size-12 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    }
  >
    <AnimatedBeamFeatures />
  </Suspense>
)

type FeatureHighlight = {
  icon: LucideIcon
  title: string
  description: string
  colSpan?: string
  variant?: "progress" | "stat"
  progressValue?: number
  progressLabel?: string
  statPrefix?: string
  statValue?: number
  statDecimals?: number
  statSuffix?: string
  statCaption?: string
}

const featureHighlights: FeatureHighlight[] = [
  {
    icon: Brain,
    title: "Tecnología RAG entrenada para tu negocio",
    description:
      "Nuestro orquestador combina extracción semántica, embeddings y contextos dinámicos para que cada respuesta tenga respaldo documental. Refinado para responder preguntas exactas sobre tu negocio.",
    colSpan: "lg:col-span-2",
    variant: "progress",
    progressValue: 92,
    progressLabel: "Precisión contextual",
  },
  {
    icon: Zap,
    title: "Respuestas en segundos",
    description:
      "Pipeline optimizado con cache semántico y streaming para que cada consulta tome menos de un suspiro, incluso con repositorios extensos.",
    colSpan: "lg:col-span-1",
    variant: "stat",
    statPrefix: "<",
    statValue: 1.8,
    statDecimals: 1,
    statSuffix: "s",
    statCaption: "Tiempo medio de respuesta",
  },
  {
    icon: Shield,
    title: "Controles empresariales robustos",
    description:
      "Permisos por espacios, políticas granulares y registros de auditoría para garantizar que la información sensible nunca salga del perímetro correcto.",
    colSpan: "lg:col-span-1",
  },
  {
    icon: Database,
    title: "Ingesta inteligente multiformato",
    description:
      "OCR, deduplicación y auto-resumen para PDFs, presentaciones, repos y más, con versionado automático de tus fuentes.",
    colSpan: "lg:col-span-1",
    variant: "stat",
    statValue: 65,
    statSuffix: "%",
    statCaption: "Menos tiempo curando documentos",
  },
  // {
  //   icon: Workflow,
  //   title: "Automatizaciones guiadas",
  //   description:
  //     "Dispara workflows de entrenamiento, publica a Slack y asigna ownership con un panel diseñado para equipos multidisciplina.",
  //   colSpan: "lg:col-span-1",
  // },
  {
    icon: MessageSquare,
    title: "Integraciones con sistemas externos",
    description:
      "Conecta fácilmente con tus herramientas favoritas y sistemas existentes para automatizar procesos, compartir información relevante y potenciar tus flujos de trabajo desde un solo lugar.",
    colSpan: "lg:col-span-1",
    variant: "stat",
    statValue: 3.6,
    statSuffix: "x",
    statCaption: "Más eficiencia a través de integraciones",
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="scroll-mt-24 py-20 sm:py-32">
      <div className="container px-4">
        <div className="mx-auto mb-16 text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            <TextAnimate animation="fadeIn">
              Tu documentación
            </TextAnimate>
            <AnimatedElement>
              <span className="bg-gradient-to-r from-primary via-cyan-500 to-blue-600 bg-clip-text text-transparent">
                Compartimentada y Segura
              </span>
            </AnimatedElement>
          </h2>
          <TextAnimate animation="fadeIn" delay={0.2} className="text-pretty text-lg text-muted-foreground">
            Características pensadas para equipos que necesitan velocidad sin sacrificar gobierno de datos. Conecta, clasifica y responde en un
            mismo flujo.
          </TextAnimate>
        </div>

        <div className="relative mb-3 -mt-3 flex min-h-80 p-2 sm:hidden">
          <FeatureBeam />
        </div>

        <BentoGrid className="mx-auto grid w-full gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
          {featureHighlights.map((feature, index) => (
            <div key={feature.title} className={cn("col-span-1", feature.colSpan)}>
              <MagicCard className="flex h-full flex-col gap-8 rounded-3xl border border-foreground/10 bg-foreground/[0.04] p-6 backdrop-blur">
                <div className={cn("flex flex-col gap-4", feature.variant === "progress" ? "md:flex-row" : "")}>
                  <div className="flex flex-col h-full gap-6">
                    <div className="flex items-center justify-between gap-8">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/80 via-cyan-500/80 to-blue-600/80 text-white shadow-lg shadow-primary/30">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <BadgeCheck className={cn("h-5 w-5 text-primary/70", feature.variant === "progress" ? "md:hidden" : "")} />
                    </div>
                    <div>
                      <h3 className="mb-3 text-xl font-semibold text-foreground">
                        <TextAnimate animation="slideRight" delay={0.1 * (index + 1)}>
                          {feature.title}
                        </TextAnimate>
                      </h3>
                      <p className="text-sm text-muted-foreground text-pretty">
                        <TextAnimate animation="slideRight" delay={0.1 * (index + 1)}>
                          {feature.description}
                        </TextAnimate>
                      </p>
                    </div>
                  </div>

                  {feature.variant === "progress" ? (
                    <div className="relative mt-auto hidden min-h-80 flex-col items-center justify-center gap-3 sm:flex">
                      <FeatureBeam />
                    </div>
                  ) : null}

                  {feature.variant === "stat" ? (
                    <div className="mt-auto rounded-2xl border border-foreground/10 bg-foreground/[0.06] px-4 py-3 text-left shadow-inner shadow-primary/10">
                      <div className="flex items-baseline gap-1 text-foreground">
                        {feature.statPrefix ? <span className="text-foreground/80">{feature.statPrefix}</span> : null}
                        <NumberTicker
                          value={feature.statValue ?? 0}
                          decimalPlaces={feature.statDecimals ?? 0}
                          className="text-3xl font-semibold text-foreground"
                        />
                        {feature.statSuffix ? <span className="text-foreground/80">{feature.statSuffix}</span> : null}
                      </div>
                      {feature.statCaption ? (
                        <p className="mt-1 text-xs text-foreground/60">{feature.statCaption}</p>
                      ) : null}
                    </div>
                  ) : null}

                  {feature.variant === "progress" ? (
                    <BadgeCheck className={cn("min-h-5 min-w-5 mt-2 text-primary/70 hidden md:block")} />
                  ) : null}
                </div>
              </MagicCard>
            </div>
          ))}
        </BentoGrid>
      </div>
    </section>
  )
}
