import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client for frontend use
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for backend operations (API routes)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Database types
export interface MonitoredProgram {
  id: string
  program_id: string
  name: string
  description?: string
  is_active: boolean
  owner_id?: string | null
  created_at: string
  updated_at: string
  last_checked_at?: string | null
}

export interface IdlSnapshot {
  id: string
  program_id: string
  idl_hash: string
  idl_content: any
  version_number: number
  fetched_at: string
}

export interface IdlChange {
  id: string
  program_id: string
  old_snapshot_id?: string
  new_snapshot_id: string
  change_type: string
  change_summary: string
  change_details: any
  severity: 'low' | 'medium' | 'high' | 'critical'
  notified: boolean
  notified_at?: string
  slack_notified?: boolean
  slack_notified_at?: string
  telegram_user_notified?: boolean
  telegram_user_notified_at?: string
  detected_at: string
}

export interface MonitoringLog {
  id: string
  run_id: string
  program_id?: string
  log_level: 'info' | 'warning' | 'error'
  message: string
  metadata?: any
  created_at: string
}

export interface User {
  id: string
  wallet_address: string
  is_admin: boolean
  slack_webhook_url?: string | null
  telegram_chat_id?: string | null
  telegram_username?: string | null
  created_at: string
  last_login_at: string
}

export interface UserWatchlist {
  id: string
  user_id: string
  program_id: string
  created_at: string
}