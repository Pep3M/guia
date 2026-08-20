import { LandingNavbar } from "@/components/landing/elements/landing-navbar"
import { LandingHero } from "@/components/landing/elements/landing-hero"
import { LandingFeatures } from "@/components/landing/elements/landing-features"
import { LandingUseCases } from "@/components/landing/elements/landing-use-cases"
import { LandingFAQ } from "@/components/landing/elements/landing-faq"
import { LandingCTA } from "@/components/landing/elements/landing-cta"
import { LandingFooter } from "@/components/landing/elements/landing-footer"

export default function LandingComponent() {
  return (
    <div className="min-h-screen min-w-full flex flex-col items-center">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingUseCases />
        <LandingFAQ />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  )
}
