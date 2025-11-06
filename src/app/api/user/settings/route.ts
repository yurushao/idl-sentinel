import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/middleware'
import { supabaseAdmin } from '@/lib/supabase'
import { testSlackWebhook } from '@/lib/notifications/slack'

// Get user settings
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('wallet_address, slack_webhook_url, is_admin, created_at, last_login_at')
      .eq('id', user.userId)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Failed to fetch user settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('Error fetching user settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user settings' },
      { status: 500 }
    )
  }
}

// Update user settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { slack_webhook_url } = body

    const updates: any = {}

    if (slack_webhook_url !== undefined) {
      // Validate Slack webhook URL format
      if (slack_webhook_url !== null && slack_webhook_url !== '') {
        if (!slack_webhook_url.startsWith('https://hooks.slack.com/')) {
          return NextResponse.json(
            { error: 'Invalid Slack webhook URL format' },
            { status: 400 }
          )
        }
        updates.slack_webhook_url = slack_webhook_url
      } else {
        updates.slack_webhook_url = null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No updates provided' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', user.userId)
      .select()
      .single()

    if (error || !data) {
      console.error('Error updating user settings:', error)
      return NextResponse.json(
        { error: 'Failed to update user settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('Error updating user settings:', error)
    return NextResponse.json(
      { error: 'Failed to update user settings' },
      { status: 500 }
    )
  }
}

// Test Slack webhook
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { slack_webhook_url } = body

    if (!slack_webhook_url) {
      return NextResponse.json(
        { error: 'Slack webhook URL is required' },
        { status: 400 }
      )
    }

    if (!slack_webhook_url.startsWith('https://hooks.slack.com/')) {
      return NextResponse.json(
        { error: 'Invalid Slack webhook URL format' },
        { status: 400 }
      )
    }

    const success = await testSlackWebhook(slack_webhook_url)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully'
      })
    } else {
      return NextResponse.json(
        { error: 'Failed to send test notification' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error testing Slack webhook:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
}
