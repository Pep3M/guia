"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useSession } from "@/lib/auth/auth-client"

export const AuthenticatedRedirect = () => {
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    if (!session) {
      return
    }

    router.replace("/organizations")
  }, [session, router])

  return null
}
