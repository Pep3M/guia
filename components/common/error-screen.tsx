"use client"

import Link from "next/link"
import { useCallback, type KeyboardEvent } from "react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CircuitBackground } from "@/components/bg/circuit-background"

type ErrorAction =
  | {
      type: "link"
      label: string
      href: string
      variant?: "default" | "outline" | "secondary" | "ghost"
      icon?: LucideIcon
      ariaLabel?: string
    }
  | {
      type: "refresh"
      label: string
      variant?: "default" | "outline" | "secondary" | "ghost"
      icon?: LucideIcon
      ariaLabel?: string
    }
  | {
      type: "back"
      label: string
      variant?: "default" | "outline" | "secondary" | "ghost"
      icon?: LucideIcon
      ariaLabel?: string
    }
  | {
      type: "button"
      label: string
      onClick: () => void
      variant?: "default" | "outline" | "secondary" | "ghost"
      icon?: LucideIcon
      ariaLabel?: string
    }

type ErrorScreenProps = {
  title: string
  description: string
  icon: LucideIcon
  actions: ErrorAction[]
}

const ErrorScreen = ({ title, description, icon: Icon, actions }: ErrorScreenProps) => {
  const handleActionClick = useCallback(
    (action: ErrorAction) => {
      if (action.type === "refresh") {
        window.location.reload()
        return
      }

      if (action.type === "back") {
        window.history.back()
        return
      }

      if (action.type === "button") {
        action.onClick()
      }
    },
    []
  )

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, action: ErrorAction) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return
    }

    event.preventDefault()
    handleActionClick(action)
  }, [handleActionClick])

  if (actions.length === 0) {
    return null
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      <CircuitBackground />

      <div
        className="fixed inset-0"
        style={{
          zIndex: 1,
          background:
            "radial-gradient(circle at 40% 40%, oklch(0.55 0.22 240 / 0.1) 0%, var(--background) 60%, #00000000 100%)",
        }}
      />
      <div
        className="fixed inset-0"
        style={{
          zIndex: 1,
          background: "radial-gradient(circle at 60% 70%, oklch(0.5 0.2 280 / 0.2) 0%, #ffffff00 50%)",
        }}
      />

      <Card
        className="relative z-[2] mx-4 w-full max-w-lg border-border/50 bg-card/60 backdrop-blur-lg shadow-2xl"
        role="alert"
        aria-live="polite"
      >
        <CardHeader className="flex flex-col items-center text-center">
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent/30 via-blue-500/30 to-purple-500/20 shadow-lg shadow-accent/30">
            <Icon className="h-9 w-9 text-accent" aria-hidden />
          </span>
          <CardTitle className="bg-gradient-to-r from-accent via-blue-500 to-purple-500 bg-clip-text text-3xl font-bold text-transparent">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">{description}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {actions.map((action) => {
              const IconComponent = action.icon
              const content = (
                <>
                  {IconComponent ? <IconComponent className="mr-2 h-4 w-4" aria-hidden /> : null}
                  {action.label}
                </>
              )

              if (action.type === "link") {
                return (
                  <Button
                    key={`${action.type}-${action.label}`}
                    asChild
                    variant={action.variant ?? "default"}
                    aria-label={action.ariaLabel ?? action.label}
                  >
                    <Link href={action.href} tabIndex={0}>
                      {content}
                    </Link>
                  </Button>
                )
              }

              return (
                <Button
                  key={`${action.type}-${action.label}`}
                  type="button"
                  variant={action.variant ?? "outline"}
                  onClick={() => handleActionClick(action)}
                  onKeyDown={(event) => handleKeyDown(event, action)}
                  tabIndex={0}
                  aria-label={action.ariaLabel ?? action.label}
                >
                  {content}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ErrorScreen

