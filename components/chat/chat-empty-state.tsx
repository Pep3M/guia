"use client"

import { Sparkles } from "lucide-react"
import { Suggestion } from "../ai-elements/suggestion"

const suggestions = [
  "¿Qué información contienen mis documentos?",
  "Resume los puntos principales de los documentos",
  "¿Hay alguna normativa específica mencionada?",
  "Busca información sobre procedimientos y procesos",
  "¿Cuáles son las mejores prácticas mencionadas?",
  "Explica los conceptos clave de mis documentos"
]

interface ChatEmptyStateProps {
  onSuggestionClick: (prompt: string) => void
}

export function ChatEmptyState({ onSuggestionClick }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
      {/* Animated AI Orb */}
      <div className="relative mb-12">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 animate-spin-slow">
          <div className="h-48 w-48 rounded-full border-2 border-transparent bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 opacity-20 blur-xl" />
        </div>

        {/* Middle pulsing ring */}
        <div className="absolute inset-4 animate-pulse-slow">
          <div className="h-40 w-40 rounded-full border-2 border-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 opacity-30 blur-lg" />
        </div>

        {/* Inner rotating ring - opposite direction */}
        <div className="absolute inset-8 animate-spin-reverse">
          <div className="h-32 w-32 rounded-full border-2 border-cyan-500/50" />
        </div>

        {/* Core orb with gradient */}
        <div className="relative h-48 w-48 flex items-center justify-center">
          <div className="absolute inset-12 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 animate-pulse-glow shadow-2xl shadow-cyan-500/50" />
          <div className="absolute inset-14 rounded-full bg-background/80 backdrop-blur" />
          <Sparkles className="relative h-12 w-12 text-cyan-500 animate-float" />
        </div>

        {/* Floating particles */}
        <div className="absolute top-8 left-8 h-2 w-2 rounded-full bg-cyan-500 animate-float [animation-delay:0.5s]" style={{ animationDelay: '0.5s' }}/>
        <div className="absolute top-12 right-12 h-2 w-2 rounded-full bg-purple-500 animate-float [animation-delay:1.5s]" style={{ animationDelay: '1s' }}/>
        <div className="absolute bottom-16 left-16 h-2 w-2 rounded-full bg-blue-500 animate-float [animation-delay:2.5s]" style={{ animationDelay: '1.5s' }}/>
        <div className="absolute bottom-12 right-8 h-2 w-2 rounded-full bg-pink-500 animate-float [animation-delay:4s]" style={{ animationDelay: '2s' }}/>
      </div>

      {/* Welcome Text */}
      <div className="text-center mb-8 space-y-2">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
          Bienvenido a tu Asistente de IA
        </h2>
        <p className="text-muted-foreground text-lg">Hazme cualquier pregunta sobre tu base de conocimientos</p>
      </div>

      <div className="flex flex-wrap gap-2 mx-auto justify-center mt-4">
        {suggestions.map((suggestion, index) => (
          <Suggestion 
            key={index}
            suggestion={suggestion}
            onClick={onSuggestionClick}
            className="whitespace-normal"
          />
        ))}
      </div>
    </div>
  )
}
