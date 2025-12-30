import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { createHash } from 'crypto'
import type { SolanaIdl } from './solana/idl-fetcher'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculates a hash of the IDL content for change detection
 */
export function calculateIdlHash(idl: SolanaIdl): string {
  // Create a normalized version of the IDL for consistent hashing
  const normalizedIdl = {
    name: idl.name,
    version: idl.version,
    instructions: idl.instructions?.map(instruction => ({
      name: instruction.name,
      accounts: instruction.accounts?.map(account => ({
        name: account.name,
        isMut: account.isMut,
        isSigner: account.isSigner
      })) || [],
      args: instruction.args?.map(arg => ({
        name: arg.name,
        type: arg.type
      })) || []
    })) || [],
    accounts: idl.accounts?.map(account => ({
      name: account.name,
      type: account.type
    })) || [],
    types: idl.types?.map(type => ({
      name: type.name,
      type: type.type
    })) || [],
    errors: idl.errors?.map(error => ({
      code: error.code,
      name: error.name,
      msg: error.msg
    })) || []
  }

  // Convert to JSON string with sorted keys for consistent hashing
  const idlString = JSON.stringify(normalizedIdl, Object.keys(normalizedIdl).sort())
  
  // Create SHA-256 hash
  return createHash('sha256').update(idlString).digest('hex')
}

/**
 * Formats a date for display
 */
export function formatDate(date: string | Date | null | undefined): string {
  // Handle null/undefined input
  if (!date) {
    return 'Unknown'
  }

  // Convert to Date object
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Check if the Date object is valid
  if (!d || isNaN(d.getTime())) {
    return 'Invalid date'
  }

  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Formats a relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  // Handle null/undefined input
  if (!date) {
    return 'Unknown'
  }

  // Convert to Date object
  const d = typeof date === 'string' ? new Date(date) : date
  
  // Check if the Date object is valid
  if (!d || isNaN(d.getTime())) {
    return 'Invalid date'
  }

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  } else {
    return formatDate(d)
  }
}

/**
 * Truncates a string to a specified length
 */
export function truncateString(str: string | null | undefined, length: number): string {
  if (!str) return ''
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

/**
 * Validates a Solana program ID
 */
export function isValidProgramId(programId: string): boolean {
  try {
    // Basic length check (Solana addresses are base58 encoded and typically 32-44 characters)
    if (programId.length < 32 || programId.length > 44) {
      return false
    }

    // Check if it's valid base58
    const decoded = require('bs58').decode(programId)
    
    // Solana public keys are 32 bytes
    return decoded.length === 32
  } catch {
    return false
  }
}

/**
 * Generates a random UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * Gets severity color for UI display
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800'
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800'
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800'
    case 'low':
      return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800'
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900 dark:border-gray-700'
  }
}

/**
 * Gets severity emoji for notifications
 */
export function getSeverityEmoji(severity: string): string {
  switch (severity) {
    case 'critical':
      return '🚨'
    case 'high':
      return '⚠️'
    case 'medium':
      return '📢'
    case 'low':
      return 'ℹ️'
    default:
      return '📝'
  }
}

/**
 * Gets severity badge color classes
 */
export function getSeverityBadgeColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-500 text-white border-red-500 hover:bg-red-600 dark:bg-red-500 dark:text-white dark:border-red-500'
    case 'high':
      return 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600 dark:bg-orange-500 dark:text-white dark:border-orange-500'
    case 'medium':
      return 'bg-yellow-500 text-white border-yellow-500 hover:bg-yellow-600 dark:bg-yellow-500 dark:text-white dark:border-yellow-500'
    case 'low':
      return 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:text-white dark:border-blue-500'
    default:
      return 'bg-gray-500 text-white border-gray-500 hover:bg-gray-600 dark:bg-gray-500 dark:text-white dark:border-gray-500'
  }
}