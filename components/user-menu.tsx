"use client"

import { Building2, Settings, LogOut, User } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThemeSwitch } from "@/components/theme-switch"
import { useSession } from '@/lib/auth/auth-client'
import { useState } from "react"
import { signOut } from '@/lib/auth/auth-client'
import { useRouter } from "next/navigation"

interface UserMenuProps {
  isMobile?: boolean
  userRole?: string
  orgSlug?: string
}

export const UserMenu = ({ isMobile = false, userRole, orgSlug }: UserMenuProps) => {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

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

  const isAdmin = userRole === 'ADMIN' || userRole === 'OWNER'

  // Get user initials for avatar fallback
  const getInitials = () => {
    const name = session?.user?.name || session?.user?.email || 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const accountHref = orgSlug ? `/${orgSlug}/settings/account` : "/organizations"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            {session?.user?.image && (
              <AvatarImage src={session.user.image} alt={session.user.name || ''} />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* User info */}
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">
            {session?.user?.name || 'Usuario'}
          </p>
          <p className="text-xs text-muted-foreground">
            {session?.user?.email}
          </p>
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={accountHref} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Mi Cuenta
          </Link>
        </DropdownMenuItem>

        {/* Menu items */}
        <DropdownMenuItem asChild>
          <Link href="/organizations" className="cursor-pointer">
            <Building2 className="mr-2 h-4 w-4" />
            Organizaciones
          </Link>
        </DropdownMenuItem>

        {orgSlug && isAdmin && (
          <DropdownMenuItem asChild>
            <Link href={`/${orgSlug}/settings/team`} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Theme switch - visible only on mobile */}
        {isMobile && (
          <>
            <ThemeSwitch />
            <DropdownMenuSeparator />
          </>
        )}

        {/* Logout button */}
        <DropdownMenuItem
          onClick={handleLogout}
          disabled={isLoading}
          className="cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isLoading ? "Saliendo..." : "Salir"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

