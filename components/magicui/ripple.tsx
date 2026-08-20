import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"

type RippleProps = {
  className?: string
  colorClassName?: string
  duration?: number
}

export const Ripple = ({ className, colorClassName = "bg-primary/30", duration = 12 }: RippleProps) => {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 flex items-center justify-center", className)}>
      <div
        className="relative flex h-[520px] w-[520px] items-center justify-center"
        style={
          {
            "--ripple-duration": `${duration}s`,
          } as CSSProperties
        }
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              "animate-ripple absolute h-full w-full rounded-full border border-white/20",
              colorClassName,
            )}
            style={{
              animationDelay: `${index * 2.4}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

