import React from 'react'

export default function AnimatedBgOrb() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden" >
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative h-[600px] w-[600px]">
          {/* Main orb */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-cyan-500/20 to-blue-600/20 blur-3xl animate-pulse-slow" />

          {/* Expanding rings from center - multiple rings with staggered delays */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {/* <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/60 animate-ring-expand" />
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/60 animate-ring-expand" style={{ animationDelay: "2s" }} />
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-600/60 animate-ring-expand" style={{ animationDelay: "4s" }} />
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 animate-ring-expand" style={{ animationDelay: "6s" }} />
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-500/50 animate-ring-expand" style={{ animationDelay: "8s" }} /> */}
          </div>
        </div>
      </div>
    </div >
  )
}
