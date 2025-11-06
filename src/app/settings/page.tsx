import { Header } from "@/components/layout/header"
import { UserSettings } from "@/components/settings/user-settings"
import { WatchlistManager } from "@/components/watchlist/watchlist-manager"

export default function SettingsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and notification preferences
            </p>
          </div>

          <UserSettings />

          <div className="pt-4">
            <WatchlistManager />
          </div>
        </div>
      </main>
    </>
  )
}