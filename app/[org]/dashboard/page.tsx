import { requireAuth } from '@/lib/auth/session'
import { requireMembership, getOrganizationBySlug } from '@/lib/auth/auth-server'
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MemberAccessGuard } from "@/components/member-access-guard"
import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { UsageChart } from "@/components/dashboard/usage-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { QuickActions } from "@/components/dashboard/quick-actions"

interface DashboardPageProps {
  params: Promise<{ org: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
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
  await requireMembership(session.user.id, organization.id)

  // Wrap the dashboard content with access guard - only OWNER can access
  return (
    <MemberAccessGuard orgSlug={orgSlug} allowedRoles={["OWNER"]}>
      <DashboardContent orgSlug={orgSlug} organization={organization} />
    </MemberAccessGuard>
  )
}

function DashboardContent({ orgSlug, organization }: { orgSlug: string, organization: any }) {

  return (
    <div className="flex-1 space-y-6 p-6 animate-slide-in">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Bienvenido a {organization.name}</p>
      </div>

      {/* Stats Cards */}
      <DashboardStats />

      {/* Charts and Activity */}
      <div className="hidden lg:grid-cols-3 lg:grid gap-6">
        <UsageChart />
        <RecentActivity />
      </div>
      <div className="block lg:hidden">
        <UsageChart />
      </div>
      <div className="sm:block lg:hidden">
        <RecentActivity />
      </div>

      {/* Quick Actions */}
      <QuickActions />
    </div >

  )
}

