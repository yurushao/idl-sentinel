import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: settings, error } = await supabaseAdmin
      .from('notification_settings')
      .select('*')
      .order('setting_key')

    if (error) {
      console.error('Error fetching notification settings:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notification settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error fetching notification settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { settings } = body

    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings must be an array' },
        { status: 400 }
      )
    }

    // Validate settings
    const validKeys = ['telegram_bot_token', 'telegram_chat_id', 'check_interval_hours']
    
    for (const setting of settings) {
      if (!setting.setting_key || !validKeys.includes(setting.setting_key)) {
        return NextResponse.json(
          { error: `Invalid setting key: ${setting.setting_key}` },
          { status: 400 }
        )
      }

      if (setting.setting_value === undefined || setting.setting_value === null) {
        return NextResponse.json(
          { error: `Setting value is required for ${setting.setting_key}` },
          { status: 400 }
        )
      }

      if (typeof setting.is_active !== 'boolean') {
        return NextResponse.json(
          { error: `is_active must be a boolean for ${setting.setting_key}` },
          { status: 400 }
        )
      }
    }

    // Update settings
    const updatedSettings = []
    
    for (const setting of settings) {
      const { data, error } = await supabaseAdmin
        .from('notification_settings')
        .update({
          setting_value: setting.setting_value,
          is_active: setting.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', setting.setting_key)
        .select()
        .single()

      if (error) {
        console.error(`Error updating setting ${setting.setting_key}:`, error)
        return NextResponse.json(
          { error: `Failed to update setting ${setting.setting_key}` },
          { status: 500 }
        )
      }

      updatedSettings.push(data)
    }

    return NextResponse.json({ settings: updatedSettings })
  } catch (error) {
    console.error('Error updating notification settings:', error)
    return NextResponse.json(
      { error: 'Failed to update notification settings' },
      { status: 500 }
    )
  }
}