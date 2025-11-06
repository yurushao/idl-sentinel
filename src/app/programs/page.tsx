import { Layout } from "@/components/layout/layout";
import { ProgramsList } from "@/components/programs/programs-list";

export default function ProgramsPage() {
  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Programs</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage and monitor your Solana programs for IDL changes
          </p>
        </div>

        <ProgramsList />
      </div>
    </Layout>
  );
}
