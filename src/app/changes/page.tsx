import { Layout } from "@/components/layout/layout";
import { ChangeSummary } from "@/components/changes/change-summary";
import { ChangesList } from "@/components/changes/changes-list";

export default function ChangesPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Changes</h1>
          <p className="text-muted-foreground">
            View all detected IDL changes across your monitored programs
          </p>
        </div>

        {/* Change Summary Section */}
        <ChangeSummary />

        {/* Changes List Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4">All Changes</h2>
          <ChangesList />
        </div>
      </div>
    </Layout>
  );
}
