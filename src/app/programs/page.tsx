import { Layout } from '@/components/layout/layout'
import { ProgramsList } from '@/components/programs/programs-list'

export default function ProgramsPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitored Programs</h1>
          <p className="text-muted-foreground">
            Manage and monitor your Solana programs for IDL changes
          </p>
        </div>
        
        <ProgramsList />
      </div>
    </Layout>
  )
}