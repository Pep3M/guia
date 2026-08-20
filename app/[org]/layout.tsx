import { requireAuth } from '@/lib/auth/session'
import { getMembership, getOrganizationBySlug } from '@/lib/auth/auth-server'
import { resolveAllUserPermissions } from '@/lib/auth/permission-resolver'
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Sidebar } from "@/components/sidebar"

interface OrgLayoutProps {
  children: React.ReactNode
  params: Promise<{ org: string }>
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { org: orgSlug } = await params
  const session = await requireAuth()
  
  if (!session) {
    redirect("/login")
  }

  // Get organization
  const organization = await getOrganizationBySlug(orgSlug)

  if (!organization) {
    redirect("/organizations")
  }

  // Verify membership
  const membership = await getMembership(session.user.id, organization.id)

  if (!membership) {
    redirect("/organizations")
  }

  // Get user permissions for this organization
  const userPermissions = await resolveAllUserPermissions(
    session.user.id,
    organization.id
  )

  return (
    <div className="flex h-screen flex-col">
      <Navbar
        orgSlug={organization.slug}
        orgName={organization.name}
        userRole={membership.role}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          userRole={membership.role}
          conversations={[]}
          organizationId={organization.id}
          userPermissions={userPermissions}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

