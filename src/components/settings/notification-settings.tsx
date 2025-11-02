'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Save, TestTube, CheckCircle, AlertCircle } from 'lucide-react'

interface NotificationSetting {
  id: string
  setting_key: string
  setting_value: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  
  const [formData, setFormData] = useState({
    telegram_bot_token: '',
    telegram_chat_id: '',
    check_interval_hours: '1',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/notifications/settings')
      if (response.ok) {
        const data = await response.json()
        const settingsMap = data.settings.reduce((acc: any, setting: NotificationSetting) => {
          acc[setting.setting_key] = setting.setting_value
          return acc
        }, {})
        
        setSettings(data.settings)
        setFormData({
          telegram_bot_token: settingsMap.telegram_bot_token || '',
          telegram_chat_id: settingsMap.telegram_chat_id || '',
          check_interval_hours: settingsMap.check_interval_hours || '1',
        })
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setTestResult(null)

    try {
      const settingsToUpdate = [
        {
          setting_key: 'telegram_bot_token',
          setting_value: formData.telegram_bot_token,
          is_active: !!formData.telegram_bot_token,
        },
        {
          setting_key: 'telegram_chat_id',
          setting_value: formData.telegram_chat_id,
          is_active: !!formData.telegram_chat_id,
        },
        {
          setting_key: 'check_interval_hours',
          setting_value: formData.check_interval_hours,
          is_active: true,
        },
      ]

      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: settingsToUpdate }),
      })

      if (response.ok) {
        await fetchSettings()
        setTestResult({ success: true, message: 'Settings saved successfully!' })
      } else {
        const data = await response.json()
        setTestResult({ success: false, message: data.error || 'Failed to save settings' })
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setTestResult({ success: false, message: 'Failed to save settings' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
      })

      const data = await response.json()
      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Test notification sent!' : 'Test failed'),
      })
    } catch (error) {
      console.error('Error testing notification:', error)
      setTestResult({ success: false, message: 'Failed to send test notification' })
    } finally {
      setTesting(false)
    }
  }

  const isConfigured = formData.telegram_bot_token && formData.telegram_chat_id

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Telegram Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-10 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Telegram Notifications</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Get notified about IDL changes via Telegram
            </p>
          </div>
          <Badge variant={isConfigured ? "default" : "secondary"}>
            {isConfigured ? "Configured" : "Not Configured"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label htmlFor="telegram_bot_token" className="block text-sm font-medium mb-2">
              Bot Token
            </label>
            <Input
              id="telegram_bot_token"
              type="password"
              value={formData.telegram_bot_token}
              onChange={(e) => setFormData(prev => ({ ...prev, telegram_bot_token: e.target.value }))}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Create a bot with @BotFather on Telegram to get a token
            </p>
          </div>

          <div>
            <label htmlFor="telegram_chat_id" className="block text-sm font-medium mb-2">
              Chat ID
            </label>
            <Input
              id="telegram_chat_id"
              type="text"
              value={formData.telegram_chat_id}
              onChange={(e) => setFormData(prev => ({ ...prev, telegram_chat_id: e.target.value }))}
              placeholder="-1001234567890"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The chat ID where notifications will be sent (use @userinfobot to get your chat ID)
            </p>
          </div>

          <div>
            <label htmlFor="check_interval_hours" className="block text-sm font-medium mb-2">
              Check Interval (hours)
            </label>
            <Input
              id="check_interval_hours"
              type="number"
              min="1"
              max="24"
              value={formData.check_interval_hours}
              onChange={(e) => setFormData(prev => ({ ...prev, check_interval_hours: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              How often to check for IDL changes (1-24 hours)
            </p>
          </div>

          {testResult && (
            <div className={`flex items-center space-x-2 p-3 rounded-lg ${
              testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={!isConfigured || testing}
              className="flex items-center space-x-2"
            >
              <TestTube className="h-4 w-4" />
              <span>{testing ? 'Testing...' : 'Test Notification'}</span>
            </Button>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">1. Create a Telegram Bot</h4>
            <p className="text-sm text-muted-foreground">
              Message @BotFather on Telegram and use /newbot to create a new bot. Copy the bot token.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">2. Get Your Chat ID</h4>
            <p className="text-sm text-muted-foreground">
              Message @userinfobot on Telegram to get your chat ID, or add your bot to a group and use the group chat ID.
            </p>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">3. Test the Configuration</h4>
            <p className="text-sm text-muted-foreground">
              After entering your bot token and chat ID, use the "Test Notification" button to verify everything works.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}