import { requireAuth } from '@/lib/auth/session'
import { getOrganizationBySlug } from '@/lib/auth/auth-server'
import { requireOwner } from '@/lib/auth/owner-auth'
import { redirect } from "next/navigation"

interface AdminLayoutProps {
  children: React.ReactNode
  params: Promise<{ org: string }>
}

export default async function OwnerAdminLayout({ children, params }: AdminLayoutProps) {
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

  // Verify user is OWNER
  await requireOwner(organization.id)

  return <>{children}</>
}

export const metadata = {
  title: "Administración - Owner",
  description: "Panel administrativo del owner de la organización",
}

