import { supabaseAdmin } from '../supabase'
import type { IdlChange } from '../supabase'
import {
  getDeliveredChangeIdsByUser,
  getFullyDeliveredChangeIds,
  markChangesChannelNotified,
  recordNotificationDelivery
} from './delivery'

const NOTIFICATION_CHANGE_LIMIT = 250
const PROGRAM_CONCURRENCY = 2
const WATCHER_CONCURRENCY = 5
const MAX_DELIVERY_ATTEMPTS_PER_RUN = 500

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
        text: `*${severityTitle} (${severityChanges.length})*\n${changesList}${moreText}`
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

    return data.map((entry: any) => ({
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
 * Batch load watchers for multiple programs
 * Optimized to avoid N+1 queries
 */
async function getBatchWatchers(programIds: string[]): Promise<Map<string, SlackWebhookConfig[]>> {
  if (programIds.length === 0) {
    return new Map()
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('user_watchlist')
      .select(`
        program_id,
        user_id,
        users!inner(
          id,
          wallet_address,
          slack_webhook_url
        )
      `)
      .in('program_id', programIds)
      .not('users.slack_webhook_url', 'is', null)

    if (error) {
      console.error('Error batch fetching watchers:', error)
      return new Map()
    }

    // Group watchers by program_id
    const watchersByProgram = new Map<string, SlackWebhookConfig[]>()

    if (data && data.length > 0) {
      for (const entry of data as any[]) {
        if (!watchersByProgram.has(entry.program_id)) {
          watchersByProgram.set(entry.program_id, [])
        }
        watchersByProgram.get(entry.program_id)!.push({
          userId: entry.users.id,
          walletAddress: entry.users.wallet_address,
          webhookUrl: entry.users.slack_webhook_url
        })
      }
    }

    return watchersByProgram
  } catch (error) {
    console.error('Error batch loading watchers:', error)
    return new Map()
  }
}

/**
 * Sends Slack notifications to users watching programs with changes
 */
export async function sendWatchlistNotifications(): Promise<{
  sent: number
  failed: number
  deferred: number
  errors: string[]
}> {
  const result = {
    sent: 0,
    failed: 0,
    deferred: 0,
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
      .limit(NOTIFICATION_CHANGE_LIMIT)

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

    for (const change of changes as any[]) {
      const programDbId = change.monitored_programs.id
      if (!changesByProgram.has(programDbId)) {
        changesByProgram.set(programDbId, [])
      }
      changesByProgram.get(programDbId)!.push(change)
    }

    // Batch load all watchers for all programs
    const programDbIds = Array.from(changesByProgram.keys())
    const watchersByProgram = await getBatchWatchers(programDbIds)

    const deliveryBudget = {
      attempts: 0,
      exhausted: false
    }

    const processProgram = async (programDbId: string, programChanges: any[]) => {
      try {
        const programName = programChanges[0].monitored_programs.name
        const programId = programChanges[0].monitored_programs.program_id
        const changeIds = programChanges.map((c: any) => c.id)

        const watchers = watchersByProgram.get(programDbId) || []

        if (watchers.length === 0) {
          console.log(`No watchers with Slack webhooks for program ${programName}`)
          await markChangesChannelNotified('slack', changeIds)
          return
        }

        const deliveredByUser = await getDeliveredChangeIdsByUser(
          'slack',
          watchers.map((watcher) => watcher.userId),
          changeIds
        )

        for (let i = 0; i < watchers.length; i += WATCHER_CONCURRENCY) {
          const batch = watchers.slice(i, i + WATCHER_CONCURRENCY)
          const results = await Promise.allSettled(
            batch.map(async (watcher) => {
              const deliveredChangeIds = deliveredByUser.get(watcher.userId) || new Set<string>()
              const pendingChanges = programChanges.filter(
                (change: any) => !deliveredChangeIds.has(change.id)
              )

              if (pendingChanges.length === 0) {
                return { watcher, pendingChangeIds: [] as string[], success: true, skipped: true }
              }

              if (deliveryBudget.exhausted) {
                return { watcher, pendingChangeIds: [] as string[], success: false, skipped: true, deferred: true }
              }

              deliveryBudget.attempts++
              if (deliveryBudget.attempts >= MAX_DELIVERY_ATTEMPTS_PER_RUN) {
                deliveryBudget.exhausted = true
              }

              const message = formatSlackMessage(programName, programId, pendingChanges)
              const success = await sendSlackNotification(watcher.webhookUrl, message)
              const pendingChangeIds = pendingChanges.map((change: any) => change.id)

              await recordNotificationDelivery(
                'slack',
                watcher.userId,
                pendingChangeIds,
                success ? 'delivered' : 'failed',
                success ? undefined : 'Slack webhook send failed'
              )

              return { watcher, pendingChangeIds, success, skipped: false, deferred: false }
            })
          )

          for (const promiseResult of results) {
            if (promiseResult.status === 'fulfilled') {
              const { watcher, pendingChangeIds, success, skipped, deferred } = promiseResult.value

              if (skipped) {
                if (deferred) {
                  result.deferred++
                }
                continue
              }

              if (success) {
                const userDeliveries = deliveredByUser.get(watcher.userId) || new Set<string>()
                for (const changeId of pendingChangeIds) {
                  userDeliveries.add(changeId)
                }
                deliveredByUser.set(watcher.userId, userDeliveries)

                result.sent++
                console.log(`Sent Slack notification to user ${watcher.walletAddress.substring(0, 8)}... for ${programName}`)
                continue
              }

              result.failed++
              result.errors.push(`Failed to send to user ${watcher.walletAddress.substring(0, 8)}... for ${programName}`)
            } else {
              const errorMessage = promiseResult.reason instanceof Error
                ? promiseResult.reason.message
                : 'Unknown error'
              result.failed++
              result.errors.push(`Error sending Slack notification for ${programName}: ${errorMessage}`)
            }
          }

          if (deliveryBudget.exhausted) {
            break
          }
        }

        const fullyDeliveredChangeIds = getFullyDeliveredChangeIds(
          changeIds,
          watchers.map((watcher) => watcher.userId),
          deliveredByUser
        )

        try {
          await markChangesChannelNotified('slack', fullyDeliveredChangeIds)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error('Error marking changes as Slack notified:', error)
          result.errors.push(`Failed to mark changes as notified for ${programName}: ${errorMessage}`)
          return
        }

        if (fullyDeliveredChangeIds.length > 0) {
          console.log(`Marked ${fullyDeliveredChangeIds.length} Slack change(s) as fully notified for ${programName}`)
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.failed++
        result.errors.push(`Error processing Slack notifications for program ${programDbId}: ${errorMessage}`)
      }
    }

    const programEntries = Array.from(changesByProgram.entries())
    for (let i = 0; i < programEntries.length; i += PROGRAM_CONCURRENCY) {
      const batch = programEntries.slice(i, i + PROGRAM_CONCURRENCY)
      await Promise.all(
        batch.map(([programDbId, programChanges]) =>
          processProgram(programDbId, programChanges)
        )
      )

      if (deliveryBudget.exhausted) {
        const remainingPrograms = programEntries.length - (i + batch.length)
        result.deferred += Math.max(remainingPrograms, 0)
        console.log('Slack notification delivery budget exhausted; remaining changes will be retried next run')
        break
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
