import { getSeverityEmoji } from '../utils'
import { supabaseAdmin } from '../supabase'
import type { IdlChange } from '../supabase'

export interface SlackWebhookConfig {
  webhookUrl: string
  userId: string
  walletAddress: string
}

/**
 * Sends a notification to Slack webhook
 */
export async function sendSlackNotification(
  webhookUrl: string,
  message: any
): Promise<boolean> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Slack webhook error:', response.status, errorText)
      return false
    }

    console.log('Slack notification sent successfully')
    return true

  } catch (error) {
    console.error('Error sending Slack notification:', error)
    return false
  }
}

/**
 * Formats changes into a Slack message
 */
export function formatSlackMessage(
  programName: string,
  programId: string,
  changes: IdlChange[]
): any {
  if (changes.length === 0) {
    return {
      text: `🔍 IDL Sentinel - No changes detected for program *${programName}*`
    }
  }

  // Group changes by severity
  const changesBySeverity = {
    critical: changes.filter(c => c.severity === 'critical'),
    high: changes.filter(c => c.severity === 'high'),
    medium: changes.filter(c => c.severity === 'medium'),
    low: changes.filter(c => c.severity === 'low')
  }

  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '🚨 IDL Sentinel - Changes Detected',
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Program:*\n${programName}`
        },
        {
          type: 'mrkdwn',
          text: `*Total Changes:*\n${changes.length}`
        },
        {
          type: 'mrkdwn',
          text: `*Address:*\n\`${programId}\``
        },
        {
          type: 'mrkdwn',
          text: `*Detected:*\n${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`
        }
      ]
    },
    {
      type: 'divider'
    }
  ]

  // Add changes by severity
  for (const [severity, severityChanges] of Object.entries(changesBySeverity)) {
    if (severityChanges.length === 0) continue

    const emoji = getSeverityEmoji(severity)
    const severityTitle = severity.charAt(0).toUpperCase() + severity.slice(1)

    const changesList = severityChanges.slice(0, 5).map(change =>
      `• ${change.change_summary}`
    ).join('\n')

    const moreText = severityChanges.length > 5
      ? `\n• ... and ${severityChanges.length - 5} more`
      : ''

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${emoji} *${severityTitle} (${severityChanges.length})*\n${changesList}${moreText}`
      }
    })
  }

  return {
    text: `🚨 IDL Sentinel - Changes detected for ${programName}`,
    blocks
  }
}

/**
 * Gets users who are watching a specific program and have Slack webhooks configured
 */
export async function getUsersWatchingProgram(programId: string): Promise<SlackWebhookConfig[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_watchlist')
      .select(`
        user_id,
        users!inner(
          id,
          wallet_address,
          slack_webhook_url
        )
      `)
      .eq('program_id', programId)
      .not('users.slack_webhook_url', 'is', null)

    if (error) {
      console.error('Error fetching users watching program:', error)
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    return data.map(entry => ({
      userId: entry.users.id,
      walletAddress: entry.users.wallet_address,
      webhookUrl: entry.users.slack_webhook_url
    }))
  } catch (error) {
    console.error('Error getting users watching program:', error)
    return []
  }
}

/**
 * Sends Slack notifications to users watching programs with changes
 */
export async function sendWatchlistNotifications(): Promise<{
  sent: number
  failed: number
  errors: string[]
}> {
  const result = {
    sent: 0,
    failed: 0,
    errors: [] as string[]
  }

  try {
    // Get unnotified changes
    const { data: changes, error } = await supabaseAdmin
      .from('idl_changes')
      .select(`
        *,
        monitored_programs!inner(
          id,
          name,
          program_id
        )
      `)
      .eq('slack_notified', false)
      .order('detected_at', { ascending: true })

    if (error) {
      result.errors.push(`Failed to fetch unnotified changes: ${error.message}`)
      return result
    }

    if (!changes || changes.length === 0) {
      console.log('No pending Slack notifications to send')
      return result
    }

    // Group changes by program
    const changesByProgram = new Map<string, any[]>()

    for (const change of changes) {
      const programDbId = change.monitored_programs.id
      if (!changesByProgram.has(programDbId)) {
        changesByProgram.set(programDbId, [])
      }
      changesByProgram.get(programDbId)!.push(change)
    }

    // Send notifications for each program
    for (const [programDbId, programChanges] of changesByProgram) {
      try {
        const programName = programChanges[0].monitored_programs.name
        const programId = programChanges[0].monitored_programs.program_id

        // Get users watching this program
        const watchers = await getUsersWatchingProgram(programDbId)

        if (watchers.length === 0) {
          console.log(`No watchers with Slack webhooks for program ${programName}`)
          // Still mark as notified even if no watchers
          const changeIds = programChanges.map(c => c.id)
          await supabaseAdmin
            .from('idl_changes')
            .update({ slack_notified: true })
            .in('id', changeIds)
          continue
        }

        const message = formatSlackMessage(programName, programId, programChanges)

        // Send to each watcher's Slack webhook
        let successfulSends = 0
        for (const watcher of watchers) {
          const success = await sendSlackNotification(watcher.webhookUrl, message)

          if (success) {
            successfulSends++
            console.log(`Sent Slack notification to user ${watcher.walletAddress.substring(0, 8)}... for ${programName}`)
          } else {
            result.failed++
            result.errors.push(`Failed to send to user ${watcher.walletAddress.substring(0, 8)}... for ${programName}`)
          }

          // Add small delay between sends to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        if (successfulSends > 0) {
          // Mark changes as notified
          const changeIds = programChanges.map(c => c.id)

          const { error: updateError } = await supabaseAdmin
            .from('idl_changes')
            .update({
              slack_notified: true,
              slack_notified_at: new Date().toISOString()
            })
            .in('id', changeIds)

          if (updateError) {
            console.error('Error marking changes as Slack notified:', updateError)
            result.errors.push(`Failed to mark changes as notified for ${programName}`)
          } else {
            result.sent += successfulSends
            console.log(`Sent ${successfulSends} Slack notification(s) for ${programName} with ${programChanges.length} changes`)
          }
        }

        // Add delay between programs
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.failed++
        result.errors.push(`Error processing Slack notifications for program ${programDbId}: ${errorMessage}`)
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`Fatal error in Slack notification processing: ${errorMessage}`)
  }

  return result
}

/**
 * Tests Slack webhook by sending a test message
 */
export async function testSlackWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const testMessage = {
      text: '🧪 IDL Sentinel Test',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 IDL Sentinel Test',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `This is a test notification to verify your Slack webhook configuration.\n\n*Sent:* ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`
          }
        }
      ]
    }

    return await sendSlackNotification(webhookUrl, testMessage)
  } catch (error) {
    console.error('Error testing Slack webhook:', error)
    return false
  }
}
