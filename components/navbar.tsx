"use client"

import { Building2, ChevronDown, Menu } from "lucide-react"
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
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "./user-menu"
import { useSidebar } from '@/hooks/use-sidebar'
import { useIsMobile } from '@/hooks/use-mobile'
import Logo from "./commons/logo-comp"

interface NavbarProps {
  orgSlug?: string
  orgName?: string
  userRole?: string
}

export function Navbar({ orgSlug, orgName, userRole }: NavbarProps) {
  const { setOpen } = useSidebar()
  const isMobile = useIsMobile()

  // Check if we're in an organization route
  const isOrgRoute = orgSlug && orgName

  if (isOrgRoute) {
    // Organization navbar
    return (
      <header className="sticky top-0 z-50 w-full border-b flex justify-center border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-1 h-14 items-center px-4 md:px-8 gap-4">
          {/* Mobile Menu Button */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          {/* Logo */}
          <Link href="/" className="hidden md:flex items-center gap-2">
            <Logo />
            <span className="font-bold text-2xl bg-gradient-to-r tracking-widest from-primary to-cyan-500 bg-clip-text text-transparent">
              <span>GU</span>
              <span>IA</span>
            </span>
          </Link>

          {/* Organization Selector - Hidden in admin routes */}
          {orgSlug !== 'admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 ml-4 bg-transparent">
                  <Building2 className="h-4 w-4" />
                  <span className="inline">{orgName}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/organizations">
                    <Building2 className="mr-2 h-4 w-4" />
                    Cambiar organización
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex-1" />

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Theme toggle - visible only on desktop */}
            {!isMobile && <ThemeToggle />}

            <UserMenu isMobile={isMobile} userRole={userRole} orgSlug={orgSlug} />
          </div>
        </div>
      </header>
    )
  }

  // Default navbar (no organization)
  return (
    <nav className="border-b h-14">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-bold text-2xl bg-gradient-to-r tracking-widest from-primary to-cyan-500 bg-clip-text text-transparent">
              <span>GU</span>
              <span>IA</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Theme toggle - visible only on desktop */}
            {!isMobile && <ThemeToggle />}

            <UserMenu isMobile={isMobile} userRole={userRole} />
          </div>
        </div>
      </div>
    </nav>
  )
}