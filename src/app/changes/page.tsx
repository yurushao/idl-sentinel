import { Layout } from "@/components/layout/layout";
import { ChangeSummary } from "@/components/changes/change-summary";
import { ChangesList } from "@/components/changes/changes-list";

export default function ChangesPage() {
  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Changes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View all detected IDL changes across your monitored programs
          </p>
        </div>

        {/* Change Summary Section */}
        <ChangeSummary />

        {/* Changes List Section */}
        <div className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-semibold">All Changes</h2>
          <ChangesList />
        </div>
      </div>
    </Layout>
  );
}
