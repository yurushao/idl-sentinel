'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Save, TestTube, Check, X, ExternalLink } from 'lucide-react'

interface UserSettings {
  wallet_address: string
  slack_webhook_url: string | null
  telegram_chat_id: string | null
  telegram_username: string | null
  preferred_explorer: 'explorer.solana.com' | 'solscan.io'
  is_admin: boolean
  created_at: string
  last_login_at: string
}

export function UserSettings() {
  const { isAuthenticated, isLoading: authLoading, walletAddress } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [slackWebhook, setSlackWebhook] = useState('')
  const [preferredExplorer, setPreferredExplorer] = useState<'explorer.solana.com' | 'solscan.io'>('explorer.solana.com')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingSlack, setTestingSlack] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [connectingTelegram, setConnectingTelegram] = useState(false)
  const [disconnectingTelegram, setDisconnectingTelegram] = useState(false)
  const [telegramConnectionUrl, setTelegramConnectionUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [slackTestSuccess, setSlackTestSuccess] = useState<boolean | null>(null)
  const [telegramTestSuccess, setTelegramTestSuccess] = useState<boolean | null>(null)
  const [savingExplorer, setSavingExplorer] = useState(false)
  const [explorerSaveSuccess, setExplorerSaveSuccess] = useState(false)

  // Ref to store polling interval for cleanup
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchSettings()
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }
    }
  }, [])

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
      setPreferredExplorer(data.user.preferred_explorer || 'explorer.solana.com')
    } catch (err) {
      console.error('Error fetching settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  const saveExplorerPreference = async (explorer: 'explorer.solana.com' | 'solscan.io') => {
    try {
      setSavingExplorer(true)
      setError(null)
      setExplorerSaveSuccess(false)

      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferred_explorer: explorer,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save explorer preference')
      }

      const data = await response.json()
      setSettings(data.user)
      setPreferredExplorer(explorer)
      setExplorerSaveSuccess(true)

      // Clear success message after 2 seconds
      setTimeout(() => setExplorerSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Error saving explorer preference:', err)
      setError(err instanceof Error ? err.message : 'Failed to save explorer preference')
      // Revert to previous value on error
      setPreferredExplorer(settings?.preferred_explorer || 'explorer.solana.com')
    } finally {
      setSavingExplorer(false)
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

  const testSlackWebhook = async () => {
    try {
      setTestingSlack(true)
      setError(null)
      setSlackTestSuccess(null)

      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_type: 'slack',
          slack_webhook_url: slackWebhook,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send test notification')
      }

      setSlackTestSuccess(true)
      setTimeout(() => setSlackTestSuccess(null), 5000)
    } catch (err) {
      console.error('Error testing Slack webhook:', err)
      setSlackTestSuccess(false)
      setError(err instanceof Error ? err.message : 'Failed to send test notification')
    } finally {
      setTestingSlack(false)
    }
  }

  const connectTelegram = async () => {
    try {
      setConnectingTelegram(true)
      setError(null)

      // Clear any existing polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current)
      }

      const response = await fetch('/api/telegram/connect', {
        method: 'POST',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate connection link')
      }

      const data = await response.json()
      setTelegramConnectionUrl(data.telegramUrl)

      // Auto-open the link in a new tab
      window.open(data.telegramUrl, '_blank')

      // Poll for connection status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch('/api/user/settings')
          if (response.ok) {
            const data = await response.json()
            // Check if telegram is now connected
            if (data.user?.telegram_chat_id) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current)
                pollIntervalRef.current = null
              }
              if (pollTimeoutRef.current) {
                clearTimeout(pollTimeoutRef.current)
                pollTimeoutRef.current = null
              }
              setTelegramConnectionUrl(null)
              // Update settings to show connected state
              setSettings(data.user)
            }
          }
        } catch (err) {
          console.error('Error polling for connection status:', err)
        }
      }, 3000) // Poll every 3 seconds

      // Stop polling after 10 minutes (link expires)
      pollTimeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
        setTelegramConnectionUrl(null)
      }, 10 * 60 * 1000)

    } catch (err) {
      console.error('Error connecting Telegram:', err)
      setError(err instanceof Error ? err.message : 'Failed to connect Telegram')
    } finally {
      setConnectingTelegram(false)
    }
  }

  const disconnectTelegram = async () => {
    try {
      setDisconnectingTelegram(true)
      setError(null)

      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegram_chat_id: null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to disconnect Telegram')
      }

      const data = await response.json()
      setSettings(data.user)
    } catch (err) {
      console.error('Error disconnecting Telegram:', err)
      setError(err instanceof Error ? err.message : 'Failed to disconnect Telegram')
    } finally {
      setDisconnectingTelegram(false)
    }
  }

  const testTelegram = async () => {
    try {
      setTestingTelegram(true)
      setError(null)
      setTelegramTestSuccess(null)

      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          test_type: 'telegram',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send test notification')
      }

      setTelegramTestSuccess(true)
      setTimeout(() => setTelegramTestSuccess(null), 5000)
    } catch (err) {
      console.error('Error testing Telegram:', err)
      setTelegramTestSuccess(false)
      setError(err instanceof Error ? err.message : 'Failed to send test notification')
    } finally {
      setTestingTelegram(false)
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
      <div className="space-y-6">
        {/* Account Information Skeleton */}
        <Card className="p-6">
          <Skeleton className="h-7 w-48 mb-4" />
          <div className="space-y-3">
            <div>
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </Card>

        {/* Notification Settings Skeleton */}
        <Card className="p-6">
          <Skeleton className="h-7 w-56 mb-2" />
          <Skeleton className="h-4 w-96 mb-6" />

          <div className="space-y-4">
            {/* Slack Section */}
            <div>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-10 w-full mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-20" />
              </div>
            </div>

            {/* Telegram Section */}
            <div>
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Skeleton className="h-10 w-36" />
            </div>
          </div>
        </Card>
      </div>
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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold">Explorer Preference</h2>
          {savingExplorer && (
            <span className="text-sm text-muted-foreground flex items-center">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Saving...
            </span>
          )}
          {explorerSaveSuccess && !savingExplorer && (
            <span className="text-sm text-green-600 flex items-center">
              <Check className="h-3 w-3 mr-1" />
              Saved
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Choose your preferred Solana explorer for viewing program addresses
        </p>
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="explorer"
              value="explorer.solana.com"
              checked={preferredExplorer === 'explorer.solana.com'}
              onChange={(e) => saveExplorerPreference(e.target.value as 'explorer.solana.com' | 'solscan.io')}
              disabled={savingExplorer}
              className="h-4 w-4 text-primary border-gray-300 focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Solana Explorer</div>
              <div className="text-xs text-muted-foreground">explorer.solana.com</div>
            </div>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="explorer"
              value="solscan.io"
              checked={preferredExplorer === 'solscan.io'}
              onChange={(e) => saveExplorerPreference(e.target.value as 'explorer.solana.com' | 'solscan.io')}
              disabled={savingExplorer}
              className="h-4 w-4 text-primary border-gray-300 focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Solscan</div>
              <div className="text-xs text-muted-foreground">solscan.io</div>
            </div>
          </label>
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
                onClick={testSlackWebhook}
                disabled={!slackWebhook || testingSlack}
                variant="outline"
              >
                {testingSlack ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Test
              </Button>
            </div>

            {slackTestSuccess !== null && (
              <div className={`mt-2 text-sm flex items-center ${slackTestSuccess ? 'text-green-600' : 'text-red-600'}`}>
                {slackTestSuccess ? (
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

          <div>
            <label className="block text-sm font-medium mb-2">
              Telegram Notifications
            </label>
            <p className="text-xs text-muted-foreground mb-4">
              Receive notifications via Telegram when programs in your watchlist have IDL changes.
            </p>

            {!settings?.telegram_chat_id ? (
              <div className="space-y-3">
                <Button
                  onClick={connectTelegram}
                  disabled={connectingTelegram}
                  className="w-full"
                >
                  {connectingTelegram ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Generating connection link...
                    </>
                  ) : (
                    <>
                      Connect Telegram
                    </>
                  )}
                </Button>

                {telegramConnectionUrl && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
                    <p className="text-sm font-medium text-blue-900">
                      Connection link generated!
                    </p>
                    <p className="text-xs text-blue-700">
                      Click the button below or use this link to connect your Telegram:
                    </p>
                    <a
                      href={telegramConnectionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 hover:underline"
                    >
                      Open in Telegram
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                    <p className="text-xs text-blue-600 mt-2">
                      Waiting for you to connect... (Link expires in 10 minutes)
                    </p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Click the button above to open a Telegram chat with the IDL Sentinel bot.
                  Click "Start" in Telegram to complete the connection.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md dark:bg-green-950 dark:border-green-800">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-2 dark:text-green-400" />
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">Connected</p>
                      {settings.telegram_username && (
                        <p className="text-xs text-green-700 dark:text-green-300">@{settings.telegram_username}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={disconnectTelegram}
                    disabled={disconnectingTelegram}
                    variant="outline"
                    size="sm"
                  >
                    {disconnectingTelegram ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Disconnect'
                    )}
                  </Button>
                </div>

                <Button
                  onClick={testTelegram}
                  disabled={testingTelegram}
                  variant="outline"
                  className="w-full"
                >
                  {testingTelegram ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending test...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Send Test Notification
                    </>
                  )}
                </Button>

                {telegramTestSuccess !== null && (
                  <div className={`text-sm flex items-center ${telegramTestSuccess ? 'text-green-600' : 'text-red-600'}`}>
                    {telegramTestSuccess ? (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Test notification sent! Check your Telegram.
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        Failed to send test notification.
                      </>
                    )}
                  </div>
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
