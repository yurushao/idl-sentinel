import { Layout } from '@/components/layout/layout'
import { ChangesList } from '@/components/changes/changes-list'

export default function ChangesPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IDL Changes</h1>
          <p className="text-muted-foreground">
            View all detected IDL changes across your monitored programs
          </p>
        </div>
        
        <ChangesList />
      </div>
    </Layout>
  )
}