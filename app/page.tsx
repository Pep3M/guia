import { Suspense } from "react"

import LandingComponent from "@/components/landing/landing"
import { AuthenticatedRedirect } from "@/components/landing/elements/authenticated-redirect"

export const dynamic = "force-static"

export default function Home() {
  return (
    <>
      <LandingComponent />
      <Suspense fallback={null}>
        <AuthenticatedRedirect />
      </Suspense>
    </>
  )
}
