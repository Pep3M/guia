"use client"

import { useEffect, useRef } from "react"

// Control de velocidad de animación (1.0 = normal, >1.0 = más rápido, <1.0 = más lento)
const ANIMATION_SPEED = 0.1

interface Particle {
  x: number
  y: number
  targetX: number
  targetY: number
  speed: number
  progress: number
}

export function CircuitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Circuit nodes (connection points)
    const nodes: { x: number; y: number }[] = []
    const nodeCount = 12

    // Generate random nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
      })
    }

    // Particles traveling through circuits
    const particles: Particle[] = []
    const particleCount = 20

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      const startNode = nodes[Math.floor(Math.random() * nodes.length)]
      const endNode = nodes[Math.floor(Math.random() * nodes.length)]
      particles.push({
        x: startNode.x,
        y: startNode.y,
        targetX: endNode.x,
        targetY: endNode.y,
        speed: (0.005 + Math.random() * 0.01) * ANIMATION_SPEED,
        progress: Math.random(),
      })
    }

    // Animation loop
    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw circuit lines
      ctx.strokeStyle = "rgba(6, 182, 212, 0.1)"
      ctx.lineWidth = 1
      nodes.forEach((node, i) => {
        nodes.forEach((otherNode, j) => {
          if (i !== j) {
            const distance = Math.hypot(node.x - otherNode.x, node.y - otherNode.y)
            if (distance < 150) {
              ctx.beginPath()
              ctx.moveTo(node.x, node.y)
              ctx.lineTo(otherNode.x, otherNode.y)
              ctx.stroke()
            }
          }
        })
      })

      // Draw nodes
      nodes.forEach((node) => {
        ctx.fillStyle = "rgba(6, 182, 212, 0.3)"
        ctx.beginPath()
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      // Update and draw particles
      particles.forEach((particle) => {
        particle.progress += particle.speed

        if (particle.progress >= 1) {
          // Reset particle to new path
          const startNode = nodes[Math.floor(Math.random() * nodes.length)]
          const endNode = nodes[Math.floor(Math.random() * nodes.length)]
          particle.x = startNode.x
          particle.y = startNode.y
          particle.targetX = endNode.x
          particle.targetY = endNode.y
          particle.progress = 0
        }

        // Interpolate position
        particle.x = particle.x + (particle.targetX - particle.x) * particle.progress
        particle.y = particle.y + (particle.targetY - particle.y) * particle.progress

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, 8)
        gradient.addColorStop(0, "rgba(6, 182, 212, 1)")
        gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.6)")
        gradient.addColorStop(1, "rgba(168, 85, 247, 0)")

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, 8, 0, Math.PI * 2)
        ctx.fill()

        // Draw bright core
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2)
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />
}
