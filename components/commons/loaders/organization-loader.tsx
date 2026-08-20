"use client"

import { useEffect, useState } from "react"

export function OrganizationLoader() {
  const [dots, setDots] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
    }, 500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="relative flex flex-col items-center gap-8">
        {/* Animated orb */}
        <div className="relative h-32 w-32">
          {/* Outer rotating ring */}
          <div className="absolute inset-0 animate-spin-slow">
            <div className="h-full w-full rounded-full border-2 border-transparent border-t-accent border-r-accent/50" />
          </div>

          {/* Middle rotating ring */}
          <div className="absolute inset-2 animate-spin-reverse">
            <div className="h-full w-full rounded-full border-2 border-transparent border-b-blue-500 border-l-blue-500/50" />
          </div>

          {/* Inner pulsing core */}
          <div className="absolute inset-6 animate-pulse-glow">
            <div className="h-full w-full rounded-full bg-gradient-to-br from-accent via-blue-500 to-purple-500" />
          </div>

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="h-12 w-12 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
        </div>

        {/* Loading text */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-accent via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Cargando organización{dots}
          </h2>
          <p className="text-sm text-muted-foreground">Preparando tu espacio de trabajo</p>
        </div>

        {/* Animated particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-accent animate-float"
              style={{
                left: `${20 + i * 15}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${3 + i * 0.5}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
