import { Layout } from "@/components/layout/layout";
import { UserSettings } from "@/components/settings/user-settings";
import { WatchlistManager } from "@/components/watchlist/watchlist-manager";

export default function SettingsPage() {
  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Manage your watchlist and notification preferences
          </p>
        </div>

        <UserSettings />

        <div className="pt-4">
          <WatchlistManager />
        </div>
      </div>
    </Layout>
  );
}
