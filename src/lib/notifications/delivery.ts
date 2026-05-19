import { supabaseAdmin } from '../supabase'

export type NotificationChannel = 'slack' | 'telegram_user'

type DeliveryStatus = 'delivered' | 'failed'

export async function getDeliveredChangeIdsByUser(
  channel: NotificationChannel,
  userIds: string[],
  changeIds: string[]
): Promise<Map<string, Set<string>>> {
  const deliveredByUser = new Map<string, Set<string>>()

  for (const userId of userIds) {
    deliveredByUser.set(userId, new Set())
  }

  if (userIds.length === 0 || changeIds.length === 0) {
    return deliveredByUser
  }

  const { data, error } = await supabaseAdmin
    .from('notification_deliveries')
    .select('user_id, change_id')
    .eq('channel', channel)
    .eq('status', 'delivered')
    .in('user_id', userIds)
    .in('change_id', changeIds)

  if (error) {
    throw new Error(`Failed to fetch notification deliveries: ${error.message}`)
  }

  for (const delivery of data || []) {
    const userDeliveries = deliveredByUser.get(delivery.user_id)
    if (userDeliveries) {
      userDeliveries.add(delivery.change_id)
    }
  }

  return deliveredByUser
}

export async function recordNotificationDelivery(
  channel: NotificationChannel,
  userId: string,
  changeIds: string[],
  status: DeliveryStatus,
  errorMessage?: string
): Promise<void> {
  if (changeIds.length === 0) {
    return
  }

  const now = new Date().toISOString()
  const records = changeIds.map((changeId) => ({
    change_id: changeId,
    user_id: userId,
    channel,
    status,
    attempts: 1,
    last_attempt_at: now,
    delivered_at: status === 'delivered' ? now : null,
    last_error: status === 'failed' ? errorMessage || 'Notification send failed' : null,
    updated_at: now
  }))

  const { error } = await supabaseAdmin
    .from('notification_deliveries')
    .upsert(records, { onConflict: 'change_id,user_id,channel' })

  if (error) {
    throw new Error(`Failed to record notification delivery: ${error.message}`)
  }
}

export async function markChangesChannelNotified(
  channel: NotificationChannel,
  changeIds: string[]
): Promise<void> {
  if (changeIds.length === 0) {
    return
  }

  const now = new Date().toISOString()
  const update =
    channel === 'slack'
      ? { slack_notified: true, slack_notified_at: now }
      : { telegram_user_notified: true, telegram_user_notified_at: now }

  const { error } = await supabaseAdmin
    .from('idl_changes')
    .update(update)
    .in('id', changeIds)

  if (error) {
    throw new Error(`Failed to mark ${channel} changes as notified: ${error.message}`)
  }
}

export function getFullyDeliveredChangeIds(
  changeIds: string[],
  userIds: string[],
  deliveredByUser: Map<string, Set<string>>
): string[] {
  return changeIds.filter((changeId) =>
    userIds.every((userId) => deliveredByUser.get(userId)?.has(changeId))
  )
}
