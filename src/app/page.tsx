import { Layout } from '@/components/layout/layout'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RecentChanges } from '@/components/dashboard/recent-changes'
import { MonitoredPrograms } from '@/components/dashboard/monitored-programs'

export default function Home() {
  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-3 sm:space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">
            Monitor Solana program IDL changes in real-time with comprehensive tracking and instant notifications
          </p>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Main Content Grid */}
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <RecentChanges />
          <MonitoredPrograms />
        </div>
      </div>
    </Layout>
  )
}