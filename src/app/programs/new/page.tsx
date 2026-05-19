import { Layout } from "@/components/layout/layout";
import { ProgramForm } from "@/components/programs/program-form";

export default function NewProgramPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Program</h1>
          <p className="text-muted-foreground">
            Preview the on-chain IDL, then activate monitoring for 5 USDC if it is not already
            monitored
          </p>
        </div>

        <ProgramForm />
      </div>
    </Layout>
  );
}
