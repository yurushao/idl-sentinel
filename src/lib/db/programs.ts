import { supabaseAdmin, type MonitoredProgram } from '../supabase'

/**
 * Get all active monitored programs
 */
export async function getActivePrograms(): Promise<MonitoredProgram[]> {
  const { data, error } = await supabaseAdmin
    .from('monitored_programs')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching active programs:', error)
    throw new Error(`Failed to fetch active programs: ${error.message}`)
  }

  return data || []
}

/**
 * Get a specific program by ID
 */
export async function getProgramById(id: string): Promise<MonitoredProgram | null> {
  const { data, error } = await supabaseAdmin
    .from('monitored_programs')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching program by ID:', error)
    throw new Error(`Failed to fetch program: ${error.message}`)
  }

  return data
}

/**
 * Get a program by program_id (Solana address)
 */
export async function getProgramByAddress(programId: string): Promise<MonitoredProgram | null> {
  const { data, error } = await supabaseAdmin
    .from('monitored_programs')
    .select('*')
    .eq('program_id', programId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching program by address:', error)
    throw new Error(`Failed to fetch program: ${error.message}`)
  }

  return data
}

/**
 * Create a new monitored program
 */
export async function createProgram(
  programId: string,
  name: string,
  ownerId: string,
  description?: string
): Promise<MonitoredProgram> {
  const { data, error} = await supabaseAdmin
    .from('monitored_programs')
    .insert({
      program_id: programId,
      name,
      description,
      is_active: true,
      owner_id: ownerId
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating program:', error)
    throw new Error(`Failed to create program: ${error.message}`)
  }

  return data
}

/**
 * Update a monitored program
 */
export async function updateProgram(
  id: string,
  updates: Partial<Pick<MonitoredProgram, 'name' | 'description' | 'is_active'>>
): Promise<MonitoredProgram> {
  const { data, error } = await supabaseAdmin
    .from('monitored_programs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating program:', error)
    throw new Error(`Failed to update program: ${error.message}`)
  }

  return data
}

/**
 * Delete a monitored program
 */
export async function deleteProgram(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('monitored_programs')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting program:', error)
    throw new Error(`Failed to delete program: ${error.message}`)
  }
}

/**
 * Get all programs (including inactive ones)
 */
export async function getAllPrograms(): Promise<MonitoredProgram[]> {
  const { data, error } = await supabaseAdmin
    .from('monitored_programs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all programs:', error)
    throw new Error(`Failed to fetch programs: ${error.message}`)
  }

  return data || []
}