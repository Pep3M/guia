'use client'

import { Button } from "@/components/ui/button"
import { signOut } from '@/lib/auth/auth-client'
import { LogOutIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export const LogoutButton = () => {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={isLoading}
      className="flex items-center gap-2"
    >
      <LogOutIcon className="h-4 w-4" />
      {isLoading ? "Saliendo..." : "Salir"}
    </Button>
  )
}
