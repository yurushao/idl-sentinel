import { Layout } from '@/components/layout/layout'
import { NotificationSettings } from '@/components/settings/notification-settings'

export default function SettingsPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure notifications and monitoring preferences
          </p>
        </div>
        
        <NotificationSettings />
      </div>
    </Layout>
  )
}