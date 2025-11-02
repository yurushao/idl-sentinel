import { supabaseAdmin, type IdlChange } from '../supabase'

export type ChangeType = 
  | 'instruction_added'
  | 'instruction_removed'
  | 'instruction_modified'
  | 'type_added'
  | 'type_removed'
  | 'type_modified'
  | 'account_added'
  | 'account_removed'
  | 'account_modified'
  | 'error_added'
  | 'error_removed'
  | 'error_modified'

export type ChangeSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface ChangeDetails {
  changeType: ChangeType
  itemName: string
  oldValue?: any
  newValue?: any
  description: string
}

/**
 * Create new IDL changes
 */
export async function createChanges(
  programId: string,
  oldSnapshotId: string | null,
  newSnapshotId: string,
  changes: Array<{
    changeType: ChangeType
    changeSummary: string
    changeDetails: ChangeDetails
    severity: ChangeSeverity
  }>
): Promise<IdlChange[]> {
  const changeRecords = changes.map(change => ({
    program_id: programId,
    old_snapshot_id: oldSnapshotId,
    new_snapshot_id: newSnapshotId,
    change_type: change.changeType,
    change_summary: change.changeSummary,
    change_details: change.changeDetails,
    severity: change.severity,
    notified: false
  }))

  const { data, error } = await supabaseAdmin
    .from('idl_changes')
    .insert(changeRecords)
    .select()

  if (error) {
    console.error('Error creating changes:', error)
    throw new Error(`Failed to create changes: ${error.message}`)
  }

  return data || []
}

/**
 * Get recent changes for a program
 */
export async function getProgramChanges(
  programId: string,
  limit: number = 20
): Promise<IdlChange[]> {
  const { data, error } = await supabaseAdmin
    .from('idl_changes')
    .select(`
      *,
      monitored_programs!inner(name, program_id),
      old_snapshot:idl_snapshots!old_snapshot_id(version_number, fetched_at),
      new_snapshot:idl_snapshots!new_snapshot_id(version_number, fetched_at)
    `)
    .eq('program_id', programId)
    .order('detected_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching program changes:', error)
    throw new Error(`Failed to fetch program changes: ${error.message}`)
  }

  return data || []
}

/**
 * Get all recent changes across all programs
 */
export async function getRecentChanges(limit: number = 50): Promise<IdlChange[]> {
  const { data, error } = await supabaseAdmin
    .from('idl_changes')
    .select(`
      *,
      monitored_programs!inner(name, program_id),
      old_snapshot:idl_snapshots!old_snapshot_id(version_number, fetched_at),
      new_snapshot:idl_snapshots!new_snapshot_id(version_number, fetched_at)
    `)
    .order('detected_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching recent changes:', error)
    throw new Error(`Failed to fetch recent changes: ${error.message}`)
  }

  return data || []
}

/**
 * Get unnotified changes
 */
export async function getUnnotifiedChanges(): Promise<IdlChange[]> {
  const { data, error } = await supabaseAdmin
    .from('idl_changes')
    .select(`
      *,
      monitored_programs!inner(name, program_id),
      old_snapshot:idl_snapshots!old_snapshot_id(version_number, fetched_at),
      new_snapshot:idl_snapshots!new_snapshot_id(version_number, fetched_at)
    `)
    .eq('notified', false)
    .order('detected_at', { ascending: true })

  if (error) {
    console.error('Error fetching unnotified changes:', error)
    throw new Error(`Failed to fetch unnotified changes: ${error.message}`)
  }

  return data || []
}

/**
 * Mark changes as notified
 */
export async function markChangesAsNotified(changeIds: string[]): Promise<void> {
  const { error } = await supabaseAdmin
    .from('idl_changes')
    .update({
      notified: true,
      notified_at: new Date().toISOString()
    })
    .in('id', changeIds)

  if (error) {
    console.error('Error marking changes as notified:', error)
    throw new Error(`Failed to mark changes as notified: ${error.message}`)
  }
}

/**
 * Get changes by severity
 */
export async function getChangesBySeverity(
  severity: ChangeSeverity,
  limit: number = 20
): Promise<IdlChange[]> {
  const { data, error } = await supabaseAdmin
    .from('idl_changes')
    .select(`
      *,
      monitored_programs!inner(name, program_id),
      old_snapshot:idl_snapshots!old_snapshot_id(version_number, fetched_at),
      new_snapshot:idl_snapshots!new_snapshot_id(version_number, fetched_at)
    `)
    .eq('severity', severity)
    .order('detected_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching changes by severity:', error)
    throw new Error(`Failed to fetch changes by severity: ${error.message}`)
  }

  return data || []
}

/**
 * Get change statistics
 */
export async function getChangeStatistics(): Promise<{
  total: number
  bySeverity: Record<ChangeSeverity, number>
  byType: Record<ChangeType, number>
  recent24h: number
}> {
  // Get total count
  const { count: total, error: totalError } = await supabaseAdmin
    .from('idl_changes')
    .select('*', { count: 'exact', head: true })

  if (totalError) {
    console.error('Error fetching total changes count:', totalError)
    throw new Error(`Failed to fetch total changes count: ${totalError.message}`)
  }

  // Get counts by severity
  const { data: severityData, error: severityError } = await supabaseAdmin
    .from('idl_changes')
    .select('severity')

  if (severityError) {
    console.error('Error fetching severity data:', severityError)
    throw new Error(`Failed to fetch severity data: ${severityError.message}`)
  }

  // Get counts by type
  const { data: typeData, error: typeError } = await supabaseAdmin
    .from('idl_changes')
    .select('change_type')

  if (typeError) {
    console.error('Error fetching type data:', typeError)
    throw new Error(`Failed to fetch type data: ${typeError.message}`)
  }

  // Get recent 24h count
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  const { count: recent24h, error: recentError } = await supabaseAdmin
    .from('idl_changes')
    .select('*', { count: 'exact', head: true })
    .gte('detected_at', yesterday.toISOString())

  if (recentError) {
    console.error('Error fetching recent changes count:', recentError)
    throw new Error(`Failed to fetch recent changes count: ${recentError.message}`)
  }

  // Process severity counts
  const bySeverity: Record<ChangeSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  }

  severityData?.forEach(item => {
    if (item.severity in bySeverity) {
      bySeverity[item.severity as ChangeSeverity]++
    }
  })

  // Process type counts
  const byType: Record<ChangeType, number> = {
    instruction_added: 0,
    instruction_removed: 0,
    instruction_modified: 0,
    type_added: 0,
    type_removed: 0,
    type_modified: 0,
    account_added: 0,
    account_removed: 0,
    account_modified: 0,
    error_added: 0,
    error_removed: 0,
    error_modified: 0
  }

  typeData?.forEach(item => {
    if (item.change_type in byType) {
      byType[item.change_type as ChangeType]++
    }
  })

  return {
    total: total || 0,
    bySeverity,
    byType,
    recent24h: recent24h || 0
  }
}