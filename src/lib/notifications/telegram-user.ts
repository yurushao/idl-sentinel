import { supabaseAdmin } from '../supabase'
import type { IdlChange } from '../supabase'
import {
  getDeliveredChangeIdsByUser,
  getFullyDeliveredChangeIds,
  markChangesChannelNotified,
  recordNotificationDelivery
} from './delivery'

export interface TelegramUserConfig {
  userId: string
  walletAddress: string
  chatId: string
}

/**
 * Sends a notification to a user's personal Telegram chat using the shared bot
 */
export async function sendTelegramUserNotification(
  config: TelegramUserConfig,
  message: string
): Promise<boolean> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured')
      return false
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telegram API error:', response.status, errorText)
      return false
    }

    const result = await response.json()
    console.log('Telegram notification sent successfully:', result.message_id)
    return true

  } catch (error) {
    console.error('Error sending Telegram notification:', error)
    return false
  }
}

/**
 * Formats changes into a Telegram message (same format as admin notifications)
 */
export function formatTelegramMessage(
  programName: string,
  programId: string,
  changes: IdlChange[]
): string {
  if (changes.length === 0) {
    return `🔍 *IDL Sentinel*\n\nNo changes detected for program *${escapeMarkdown(programName)}*`
  }

  // Group changes by severity
  const changesBySeverity = {
    critical: changes.filter(c => c.severity === 'critical'),
    high: changes.filter(c => c.severity === 'high'),
    medium: changes.filter(c => c.severity === 'medium'),
    low: changes.filter(c => c.severity === 'low')
  }

  let message = `🚨 *IDL Sentinel - Changes Detected*\n\n`
  message += `📋 *Program:* ${escapeMarkdown(programName)}\n`
  message += `🔗 *Address:* \`${programId}\`\n`
  message += `📊 *Total Changes:* ${changes.length}\n\n`

  // Add changes by severity
  for (const [severity, severityChanges] of Object.entries(changesBySeverity)) {
    if (severityChanges.length === 0) continue

    const severityTitle = severity.charAt(0).toUpperCase() + severity.slice(1)

    message += `*${severityTitle} (${severityChanges.length})*\n`

    for (const change of severityChanges.slice(0, 5)) { // Limit to 5 per severity
      message += `• ${escapeMarkdown(change.change_summary)}\n`
    }

    if (severityChanges.length > 5) {
      message += `• ... and ${severityChanges.length - 5} more\n`
    }

    message += '\n'
  }

  // Add timestamp
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
  message += `⏰ *Detected:* ${timestamp} UTC`

  return message
}

/**
 * Escapes Markdown special characters for Telegram
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
}

/**
 * Gets users who are watching a specific program and have Telegram configured
 */
export async function getUsersTelegramWatchingProgram(programId: string): Promise<TelegramUserConfig[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_watchlist')
      .select(`
        user_id,
        users!inner(
          id,
          wallet_address,
          telegram_chat_id
        )
      `)
      .eq('program_id', programId)
      .not('users.telegram_chat_id', 'is', null)

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
      chatId: entry.users.telegram_chat_id
    }))
  } catch (error) {
    console.error('Error getting users watching program:', error)
    return []
  }
}

/**
 * Sends Telegram notifications to users watching programs with changes
 */
export async function sendTelegramWatchlistNotifications(): Promise<{
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
      .eq('telegram_user_notified', false)
      .order('detected_at', { ascending: true })

    if (error) {
      result.errors.push(`Failed to fetch unnotified changes: ${error.message}`)
      return result
    }

    if (!changes || changes.length === 0) {
      console.log('No pending Telegram user notifications to send')
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

    // Send notifications for each program
    for (const [programDbId, programChanges] of changesByProgram) {
      try {
        const programName = programChanges[0].monitored_programs.name
        const programId = programChanges[0].monitored_programs.program_id

        // Get users watching this program
        const watchers = await getUsersTelegramWatchingProgram(programDbId)

        if (watchers.length === 0) {
          console.log(`No watchers with Telegram configured for program ${programName}`)
          const changeIds = programChanges.map((c: any) => c.id)
          await markChangesChannelNotified('telegram_user', changeIds)
          continue
        }

        const changeIds = programChanges.map((c: any) => c.id)
        const deliveredByUser = await getDeliveredChangeIdsByUser(
          'telegram_user',
          watchers.map((watcher) => watcher.userId),
          changeIds
        )

        // Send to each watcher's Telegram
        for (const watcher of watchers) {
          const deliveredChangeIds = deliveredByUser.get(watcher.userId) || new Set<string>()
          const pendingChanges = programChanges.filter(
            (change: any) => !deliveredChangeIds.has(change.id)
          )

          if (pendingChanges.length === 0) {
            continue
          }

          const message = formatTelegramMessage(programName, programId, pendingChanges)
          const success = await sendTelegramUserNotification(watcher, message)
          const pendingChangeIds = pendingChanges.map((change: any) => change.id)

          try {
            await recordNotificationDelivery(
              'telegram_user',
              watcher.userId,
              pendingChangeIds,
              success ? 'delivered' : 'failed',
              success ? undefined : 'Telegram send failed'
            )
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            result.failed++
            result.errors.push(`Failed to record Telegram delivery for user ${watcher.walletAddress.substring(0, 8)}... for ${programName}: ${errorMessage}`)
            continue
          }

          if (success) {
            const userDeliveries = deliveredByUser.get(watcher.userId) || new Set<string>()
            for (const changeId of pendingChangeIds) {
              userDeliveries.add(changeId)
            }
            deliveredByUser.set(watcher.userId, userDeliveries)

            result.sent++
            console.log(`Sent Telegram notification to user ${watcher.walletAddress.substring(0, 8)}... for ${programName}`)
          } else {
            result.failed++
            result.errors.push(`Failed to send to user ${watcher.walletAddress.substring(0, 8)}... for ${programName}`)
          }

          // Add small delay between sends to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        const fullyDeliveredChangeIds = getFullyDeliveredChangeIds(
          changeIds,
          watchers.map((watcher) => watcher.userId),
          deliveredByUser
        )

        try {
          await markChangesChannelNotified('telegram_user', fullyDeliveredChangeIds)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error('Error marking changes as Telegram notified:', error)
          result.errors.push(`Failed to mark changes as notified for ${programName}: ${errorMessage}`)
          continue
        }

        if (fullyDeliveredChangeIds.length > 0) {
          console.log(`Marked ${fullyDeliveredChangeIds.length} Telegram change(s) as fully notified for ${programName}`)
        }

        // Add delay between programs
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        result.failed++
        result.errors.push(`Error processing Telegram notifications for program ${programDbId}: ${errorMessage}`)
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push(`Fatal error in Telegram notification processing: ${errorMessage}`)
  }

  return result
}

/**
 * Tests Telegram configuration by sending a test message using the shared bot
 */
export async function testTelegramConfig(chatId: string): Promise<boolean> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured')
      return false
    }

    const testMessage = `🧪 *IDL Sentinel Test*\n\nThis is a test notification to verify your Telegram configuration.\n\n⏰ *Sent:* ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      })
    })

    return response.ok
  } catch (error) {
    console.error('Error testing Telegram config:', error)
    return false
  }
}
