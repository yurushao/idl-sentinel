'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Loader2, Save, TestTube, Check, X, ExternalLink } from 'lucide-react'

interface UserSettings {
  wallet_address: string
  slack_webhook_url: string | null
  is_admin: boolean
  created_at: string
  last_login_at: string
}

export function UserSettings() {
  const { isAuthenticated, isLoading: authLoading, walletAddress } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [slackWebhook, setSlackWebhook] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchSettings()
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/user/settings')

      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      setSettings(data.user)
      setSlackWebhook(data.user.slack_webhook_url || '')
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setError(null)
      setSaveSuccess(false)

      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slack_webhook_url: slackWebhook || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      const data = await response.json()
      setSettings(data.user)
      setSaveSuccess(true)

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const testWebhook = async () => {
    try {
      setTesting(true)
      setError(null)
      setTestSuccess(null)

      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slack_webhook_url: slackWebhook,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send test notification')
      }

      setTestSuccess(true)

      // Clear success message after 5 seconds
      setTimeout(() => setTestSuccess(null), 5000)
    } catch (err) {
      console.error('Error testing webhook:', err)
      setTestSuccess(false)
      setError(err instanceof Error ? err.message : 'Failed to send test notification')
    } finally {
      setTesting(false)
    }
  }

  if (!isAuthenticated && !authLoading) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">Sign In Required</h3>
          <p className="text-muted-foreground mb-4">
            Please connect your wallet and sign in to manage your settings
          </p>
        </div>
      </Card>
    )
  }

  if (loading || authLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading settings...</span>
        </div>
      </Card>
    )
  }

  if (error && !settings) {
    return (
      <Card className="p-6">
        <div className="text-center text-destructive">
          <p>Error: {error}</p>
          <Button onClick={fetchSettings} className="mt-4">
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-muted-foreground">Wallet Address</label>
            <div className="mt-1 font-mono text-sm bg-muted px-3 py-2 rounded-md break-all">
              {settings?.wallet_address || walletAddress}
            </div>
          </div>
          {settings?.is_admin && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <div className="mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Administrator
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Notification Settings</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Configure how you want to receive notifications about IDL changes
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="slack-webhook" className="block text-sm font-medium mb-2">
              Slack Webhook URL
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Receive notifications in Slack when programs in your watchlist have IDL changes.{' '}
              <a
                href="https://api.slack.com/messaging/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center"
              >
                Learn how to create a webhook
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </p>
            <div className="flex gap-2">
              <Input
                id="slack-webhook"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
              <Button
                onClick={testWebhook}
                disabled={!slackWebhook || testing}
                variant="outline"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Test
              </Button>
            </div>

            {testSuccess !== null && (
              <div className={`mt-2 text-sm flex items-center ${testSuccess ? 'text-green-600' : 'text-red-600'}`}>
                {testSuccess ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Test notification sent successfully! Check your Slack channel.
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Failed to send test notification. Please check your webhook URL.
                  </>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive flex items-center">
              <X className="h-4 w-4 mr-1" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            {saveSuccess && (
              <span className="text-sm text-green-600 flex items-center">
                <Check className="h-4 w-4 mr-1" />
                Settings saved successfully
              </span>
            )}
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
