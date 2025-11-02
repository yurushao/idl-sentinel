import { supabaseAdmin, type IdlSnapshot } from '../supabase'
import type { SolanaIdl } from '../solana/idl-fetcher'

/**
 * Get the latest snapshot for a program
 */
export async function getLatestSnapshot(programId: string): Promise<IdlSnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from('idl_snapshots')
    .select('*')
    .eq('program_id', programId)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching latest snapshot:', error)
    throw new Error(`Failed to fetch latest snapshot: ${error.message}`)
  }

  return data
}

/**
 * Check if a snapshot with the given hash already exists
 */
export async function snapshotExists(programId: string, idlHash: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('idl_snapshots')
    .select('id')
    .eq('program_id', programId)
    .eq('idl_hash', idlHash)
    .limit(1)

  if (error) {
    console.error('Error checking snapshot existence:', error)
    throw new Error(`Failed to check snapshot existence: ${error.message}`)
  }

  return (data?.length || 0) > 0
}

/**
 * Create a new IDL snapshot
 */
export async function createSnapshot(
  programId: string,
  idlHash: string,
  idlContent: SolanaIdl
): Promise<IdlSnapshot> {
  // Get the next version number
  const { data: latestSnapshot } = await supabaseAdmin
    .from('idl_snapshots')
    .select('version_number')
    .eq('program_id', programId)
    .order('version_number', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (latestSnapshot?.version_number || 0) + 1

  const { data, error } = await supabaseAdmin
    .from('idl_snapshots')
    .insert({
      program_id: programId,
      idl_hash: idlHash,
      idl_content: idlContent,
      version_number: nextVersion
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating snapshot:', error)
    throw new Error(`Failed to create snapshot: ${error.message}`)
  }

  return data
}

/**
 * Get all snapshots for a program
 */
export async function getProgramSnapshots(
  programId: string,
  limit: number = 10
): Promise<IdlSnapshot[]> {
  const { data, error } = await supabaseAdmin
    .from('idl_snapshots')
    .select('*')
    .eq('program_id', programId)
    .order('fetched_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching program snapshots:', error)
    throw new Error(`Failed to fetch program snapshots: ${error.message}`)
  }

  return data || []
}

/**
 * Get a specific snapshot by ID
 */
export async function getSnapshotById(id: string): Promise<IdlSnapshot | null> {
  const { data, error } = await supabaseAdmin
    .from('idl_snapshots')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching snapshot by ID:', error)
    throw new Error(`Failed to fetch snapshot: ${error.message}`)
  }

  return data
}

/**
 * Delete old snapshots, keeping only the latest N snapshots per program
 */
export async function cleanupOldSnapshots(keepCount: number = 50): Promise<number> {
  // Get all programs
  const { data: programs, error: programsError } = await supabaseAdmin
    .from('monitored_programs')
    .select('id')

  if (programsError) {
    console.error('Error fetching programs for cleanup:', programsError)
    throw new Error(`Failed to fetch programs for cleanup: ${programsError.message}`)
  }

  let totalDeleted = 0

  for (const program of programs || []) {
    // Get snapshots for this program, ordered by creation date (newest first)
    const { data: snapshots, error: snapshotsError } = await supabaseAdmin
      .from('idl_snapshots')
      .select('id')
      .eq('program_id', program.id)
      .order('fetched_at', { ascending: false })

    if (snapshotsError) {
      console.error(`Error fetching snapshots for program ${program.id}:`, snapshotsError)
      continue
    }

    if (!snapshots || snapshots.length <= keepCount) {
      continue // Nothing to delete
    }

    // Get IDs of snapshots to delete (all except the latest keepCount)
    const snapshotsToDelete = snapshots.slice(keepCount).map(s => s.id)

    // Delete old snapshots
    const { error: deleteError } = await supabaseAdmin
      .from('idl_snapshots')
      .delete()
      .in('id', snapshotsToDelete)

    if (deleteError) {
      console.error(`Error deleting old snapshots for program ${program.id}:`, deleteError)
      continue
    }

    totalDeleted += snapshotsToDelete.length
    console.log(`Deleted ${snapshotsToDelete.length} old snapshots for program ${program.id}`)
  }

  return totalDeleted
}