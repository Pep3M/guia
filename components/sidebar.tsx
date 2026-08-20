"use client"

import { useState } from "react"
import { MessageSquare, Database, ChevronLeft, Upload, Users, BarChart3, Shield, Tag, UserCog, Plug, User } from "lucide-react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { ChatConversationsList } from "@/components/chat/chat-conversations-list"
import { useSidebar } from "@/hooks/use-sidebar"
import Logo from "./commons/logo-comp"

interface UserPermissions {
  canUploadDocuments: boolean
  canCreateConversations: boolean
  canInviteUsers: boolean
}

interface SidebarProps {
  userRole?: string
  conversations?: Array<{ id: string; title: string; time?: string }>
  organizationId?: string
  userPermissions?: UserPermissions
}

const navigationMember = [
  { name: "Chat", href: (slug: string) => `/${slug}/chat`, icon: MessageSquare },
  // { name: "Mi Cuenta", href: (slug: string) => `/${slug}/settings/account`, icon: User },
]

// Base navigation items that can be filtered by permissions
const navigationItems = [
  { name: "Dashboard", href: (slug: string) => `/${slug}/dashboard`, icon: Database, requiresPermission: null },
  { name: "Conocimientos", href: (slug: string) => `/${slug}/upload`, icon: Upload, requiresPermission: "canUploadDocuments" as const },
  { name: "Chat", href: (slug: string) => `/${slug}/chat`, icon: MessageSquare, requiresPermission: null },
  { name: "Equipo", href: (slug: string) => `/${slug}/settings/team`, icon: Users, requiresPermission: "canInviteUsers" as const },
  { name: "Integraciones", href: (slug: string) => `/${slug}/settings/integrations`, icon: Plug, requiresPermission: null },
  // { name: "Mi Cuenta", href: (slug: string) => `/${slug}/settings/account`, icon: User, requiresPermission: null },
]

const navigationOwner = [
  { name: "Uso de Tokens", href: (slug: string) => `/${slug}/admin/token-usage`, icon: BarChart3 },
  { name: "Permisos", href: (slug: string) => `/${slug}/admin/permissions`, icon: Shield },
  { name: "Categorías", href: (slug: string) => `/${slug}/admin/categories`, icon: Tag },
  { name: "Grupos", href: (slug: string) => `/${slug}/admin/groups`, icon: UserCog },
]

export function Sidebar({ userRole, conversations = [], organizationId, userPermissions }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useIsMobile()
  const { open, setOpen } = useSidebar()

  // Extract org slug from pathname
  const pathParts = pathname.split('/').filter(Boolean)
  const orgSlug = pathParts[0] || ""
  const currentPagePath = '/' + pathParts.slice(0, 2).join('/')
  const isChatPage = currentPagePath.includes('/chat')
  const currentConversationId = searchParams.get('conversationId')

  // Build navigation based on permissions (not just role)
  // Chat is always available
  // Other items require specific permissions or being OWNER/ADMIN
  const navigation = userRole === 'MEMBER' 
    ? navigationMember 
    : navigationItems.filter(item => {
        // Chat and Dashboard are always available for non-MEMBERS
        if (!item.requiresPermission) return true
        
        // For OWNER and ADMIN, check if they have the permission
        // For MEMBER, they should only see items if they have explicit permission
        if (userPermissions) {
          const permission = item.requiresPermission
          return userPermissions[permission] === true
        }
        
        // Fallback: if permissions not loaded, show for OWNER/ADMIN (backwards compatibility)
        return userRole === 'OWNER' || userRole === 'ADMIN'
      })
  
  const showOwnerAdmin = userRole === 'OWNER'

  const sidebarContent = (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 relative h-full",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Main Navigation */}
      <div className="flex flex-col gap-0 p-3 py-8 border-y border-sidebar-border">
        {navigation.map((item) => {
          const Icon = item.icon
          const href = item.href(orgSlug)
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={item.name} href={href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Button>
            </Link>
          )
        })}

        {/* Owner Admin Section */}
        {showOwnerAdmin && !collapsed && (
          <>
            <div className="my-2 border-t border-sidebar-border" />
            <div className="space-y-2">
              <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administración
              </p>
              {navigationOwner.map((item) => {
                const Icon = item.icon
                const href = item.href(orgSlug)
                const isActive = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link key={item.name} href={href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3",
                        isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.name}</span>
                    </Button>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Conversations List - Only show when on chat page */}
      {!collapsed && isChatPage && organizationId && (
        <div className="flex-1 min-h-0 flex flex-col">
          <ChatConversationsList
            organizationId={organizationId}
            orgSlug={orgSlug}
            currentConversationId={currentConversationId || undefined}
            streamingTitle={null}
            isGeneratingTitle={false}
          />
          <div className="border-t border-sidebar-border shrink-0 mt-auto" />
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border shrink-0 hidden md:block">
        <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>
    </aside>
  )

  return (
    <>
      {/* Mobile Sheet - controlled by context */}
      {isMobile && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <aside className="flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 relative h-full w-full">
              <div className="flex items-center gap-2 h-20 w-full justify-center">
                <Link href="/" className="flex items-center gap-2">
                  <Logo />
                  <span className="font-bold text-2xl bg-gradient-to-r tracking-widest from-primary to-cyan-500 bg-clip-text text-transparent">
                    <span>GU</span>
                    <span>IA</span>
                  </span>
                </Link>
              </div>
              <div className="flex flex-col gap-5 p-3 py-8 border-y border-sidebar-border">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const href = item.href(orgSlug)
                  const isActive = pathname === href || pathname.startsWith(href + '/')
                  return (
                    <Link
                      key={item.name}
                      href={href}
                      onClick={() => setOpen(false)}
                    >
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start gap-3",
                          isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                        )}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span>{item.name}</span>
                      </Button>
                    </Link>
                  )
                })}

                {/* Owner Admin Section */}
                {showOwnerAdmin && (
                  <>
                    <div className="my-2 border-t border-sidebar-border" />
                    <div className="space-y-2">
                      <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Administración
                      </p>
                      {navigationOwner.map((item) => {
                        const Icon = item.icon
                        const href = item.href(orgSlug)
                        const isActive = pathname === href || pathname.startsWith(href + '/')
                        return (
                          <Link
                            key={item.name}
                            href={href}
                            onClick={() => setOpen(false)}
                          >
                            <Button
                              variant={isActive ? "secondary" : "ghost"}
                              className={cn(
                                "w-full justify-start gap-3",
                                isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                              )}
                            >
                              <Icon className="h-5 w-5 shrink-0" />
                              <span>{item.name}</span>
                            </Button>
                          </Link>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {isChatPage && organizationId && (
                <div className="flex-1 min-h-0 flex flex-col">
                  <ChatConversationsList
                    organizationId={organizationId}
                    orgSlug={orgSlug}
                    currentConversationId={currentConversationId || undefined}
                    streamingTitle={null}
                    isGeneratingTitle={false}
                  />
                  <div className="border-t border-sidebar-border shrink-0 mt-auto" />
                </div>
              )}
            </aside>
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop fixed sidebar - hidden on mobile */}
      <div className={cn("hidden md:block", isMobile && "hidden")}>
        {sidebarContent}
      </div>
    </>
  )
}
