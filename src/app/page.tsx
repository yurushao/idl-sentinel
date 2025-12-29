import { Layout } from "@/components/layout/layout";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentChanges } from "@/components/dashboard/recent-changes";
import { MonitoredPrograms } from "@/components/dashboard/monitored-programs";

export default function Home() {
  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        {/* Hero Section */}
        <div className="space-y-3 text-center sm:space-y-4">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">IDL Sentinel</h1>
          <p className="mx-auto max-w-2xl px-4 text-sm text-muted-foreground sm:text-base">
            Monitor Solana program IDL changes in real-time with comprehensive tracking and instant
            notifications
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
  );
}
