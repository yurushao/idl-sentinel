import type { SolanaIdl } from '../solana/idl-fetcher'
import type { ChangeType, ChangeSeverity, ChangeDetails } from '../db/changes'

export interface DetectedChange {
  changeType: ChangeType
  changeSummary: string
  changeDetails: ChangeDetails
  severity: ChangeSeverity
}

/**
 * Detects changes between two IDL versions
 */
export function detectChanges(oldIdl: SolanaIdl | null, newIdl: SolanaIdl): DetectedChange[] {
  const changes: DetectedChange[] = []

  if (!oldIdl) {
    // First time seeing this IDL - not really a "change" but we can log it
    return [{
      changeType: 'instruction_added',
      changeSummary: `Initial IDL detected for program ${newIdl.name}`,
      changeDetails: {
        changeType: 'instruction_added',
        itemName: newIdl.name,
        newValue: newIdl,
        description: 'Initial IDL snapshot created'
      },
      severity: 'low'
    }]
  }

  // Detect instruction changes
  changes.push(...detectInstructionChanges(oldIdl, newIdl))

  // Detect type changes
  changes.push(...detectTypeChanges(oldIdl, newIdl))

  // Detect account changes
  changes.push(...detectAccountChanges(oldIdl, newIdl))

  // Detect error changes
  changes.push(...detectErrorChanges(oldIdl, newIdl))

  return changes
}

/**
 * Detects changes in instructions
 */
function detectInstructionChanges(oldIdl: SolanaIdl, newIdl: SolanaIdl): DetectedChange[] {
  const changes: DetectedChange[] = []
  
  const oldInstructions = new Map(oldIdl.instructions?.map(i => [i.name, i]) || [])
  const newInstructions = new Map(newIdl.instructions?.map(i => [i.name, i]) || [])

  // Check for added instructions
  for (const [name, instruction] of newInstructions) {
    if (!oldInstructions.has(name)) {
      changes.push({
        changeType: 'instruction_added',
        changeSummary: `New instruction '${name}' added`,
        changeDetails: {
          changeType: 'instruction_added',
          itemName: name,
          newValue: instruction,
          description: `Added new instruction with ${instruction.accounts?.length || 0} accounts and ${instruction.args?.length || 0} arguments`
        },
        severity: calculateInstructionSeverity('added', instruction)
      })
    }
  }

  // Check for removed instructions
  for (const [name, instruction] of oldInstructions) {
    if (!newInstructions.has(name)) {
      changes.push({
        changeType: 'instruction_removed',
        changeSummary: `Instruction '${name}' removed`,
        changeDetails: {
          changeType: 'instruction_removed',
          itemName: name,
          oldValue: instruction,
          description: `Removed instruction that had ${instruction.accounts?.length || 0} accounts and ${instruction.args?.length || 0} arguments`
        },
        severity: 'critical' // Removing instructions is always critical
      })
    }
  }

  // Check for modified instructions
  for (const [name, newInstruction] of newInstructions) {
    const oldInstruction = oldInstructions.get(name)
    if (oldInstruction && !deepEqual(oldInstruction, newInstruction)) {
      const modificationDetails = getInstructionModificationDetails(oldInstruction, newInstruction)
      
      changes.push({
        changeType: 'instruction_modified',
        changeSummary: `Instruction '${name}' modified: ${modificationDetails.summary}`,
        changeDetails: {
          changeType: 'instruction_modified',
          itemName: name,
          oldValue: oldInstruction,
          newValue: newInstruction,
          description: modificationDetails.description
        },
        severity: modificationDetails.severity
      })
    }
  }

  return changes
}

/**
 * Detects changes in types
 */
function detectTypeChanges(oldIdl: SolanaIdl, newIdl: SolanaIdl): DetectedChange[] {
  const changes: DetectedChange[] = []
  
  const oldTypes = new Map(oldIdl.types?.map(t => [t.name, t]) || [])
  const newTypes = new Map(newIdl.types?.map(t => [t.name, t]) || [])

  // Check for added types
  for (const [name, type] of newTypes) {
    if (!oldTypes.has(name)) {
      changes.push({
        changeType: 'type_added',
        changeSummary: `New type '${name}' added`,
        changeDetails: {
          changeType: 'type_added',
          itemName: name,
          newValue: type,
          description: `Added new ${type.type.kind} type`
        },
        severity: 'low'
      })
    }
  }

  // Check for removed types
  for (const [name, type] of oldTypes) {
    if (!newTypes.has(name)) {
      changes.push({
        changeType: 'type_removed',
        changeSummary: `Type '${name}' removed`,
        changeDetails: {
          changeType: 'type_removed',
          itemName: name,
          oldValue: type,
          description: `Removed ${type.type.kind} type`
        },
        severity: 'high' // Removing types can break compatibility
      })
    }
  }

  // Check for modified types
  for (const [name, newType] of newTypes) {
    const oldType = oldTypes.get(name)
    if (oldType && !deepEqual(oldType, newType)) {
      changes.push({
        changeType: 'type_modified',
        changeSummary: `Type '${name}' modified`,
        changeDetails: {
          changeType: 'type_modified',
          itemName: name,
          oldValue: oldType,
          newValue: newType,
          description: `Modified ${newType.type.kind} type structure`
        },
        severity: 'medium'
      })
    }
  }

  return changes
}

/**
 * Detects changes in accounts
 */
function detectAccountChanges(oldIdl: SolanaIdl, newIdl: SolanaIdl): DetectedChange[] {
  const changes: DetectedChange[] = []
  
  const oldAccounts = new Map(oldIdl.accounts?.map(a => [a.name, a]) || [])
  const newAccounts = new Map(newIdl.accounts?.map(a => [a.name, a]) || [])

  // Check for added accounts
  for (const [name, account] of newAccounts) {
    if (!oldAccounts.has(name)) {
      changes.push({
        changeType: 'account_added',
        changeSummary: `New account type '${name}' added`,
        changeDetails: {
          changeType: 'account_added',
          itemName: name,
          newValue: account,
          description: `Added new account type with ${account.type.fields?.length || 0} fields`
        },
        severity: 'low'
      })
    }
  }

  // Check for removed accounts
  for (const [name, account] of oldAccounts) {
    if (!newAccounts.has(name)) {
      changes.push({
        changeType: 'account_removed',
        changeSummary: `Account type '${name}' removed`,
        changeDetails: {
          changeType: 'account_removed',
          itemName: name,
          oldValue: account,
          description: `Removed account type that had ${account.type.fields?.length || 0} fields`
        },
        severity: 'high'
      })
    }
  }

  // Check for modified accounts
  for (const [name, newAccount] of newAccounts) {
    const oldAccount = oldAccounts.get(name)
    if (oldAccount && !deepEqual(oldAccount, newAccount)) {
      changes.push({
        changeType: 'account_modified',
        changeSummary: `Account type '${name}' modified`,
        changeDetails: {
          changeType: 'account_modified',
          itemName: name,
          oldValue: oldAccount,
          newValue: newAccount,
          description: `Modified account type structure`
        },
        severity: 'medium'
      })
    }
  }

  return changes
}

/**
 * Detects changes in errors
 */
function detectErrorChanges(oldIdl: SolanaIdl, newIdl: SolanaIdl): DetectedChange[] {
  const changes: DetectedChange[] = []
  
  const oldErrors = new Map(oldIdl.errors?.map(e => [e.code, e]) || [])
  const newErrors = new Map(newIdl.errors?.map(e => [e.code, e]) || [])

  // Check for added errors
  for (const [code, error] of newErrors) {
    if (!oldErrors.has(code)) {
      changes.push({
        changeType: 'error_added',
        changeSummary: `New error code ${code} added: ${error.name}`,
        changeDetails: {
          changeType: 'error_added',
          itemName: error.name,
          newValue: error,
          description: `Added error: ${error.msg}`
        },
        severity: 'low'
      })
    }
  }

  // Check for removed errors
  for (const [code, error] of oldErrors) {
    if (!newErrors.has(code)) {
      changes.push({
        changeType: 'error_removed',
        changeSummary: `Error code ${code} removed: ${error.name}`,
        changeDetails: {
          changeType: 'error_removed',
          itemName: error.name,
          oldValue: error,
          description: `Removed error: ${error.msg}`
        },
        severity: 'medium'
      })
    }
  }

  // Check for modified errors
  for (const [code, newError] of newErrors) {
    const oldError = oldErrors.get(code)
    if (oldError && !deepEqual(oldError, newError)) {
      changes.push({
        changeType: 'error_modified',
        changeSummary: `Error code ${code} modified: ${newError.name}`,
        changeDetails: {
          changeType: 'error_modified',
          itemName: newError.name,
          oldValue: oldError,
          newValue: newError,
          description: `Modified error message or name`
        },
        severity: 'low'
      })
    }
  }

  return changes
}

/**
 * Calculates severity for instruction changes
 */
function calculateInstructionSeverity(changeType: 'added' | 'removed' | 'modified', instruction: any): ChangeSeverity {
  if (changeType === 'removed') {
    return 'critical'
  }

  if (changeType === 'added') {
    // New instructions are generally low impact unless they're critical operations
    const criticalNames = ['initialize', 'close', 'withdraw', 'transfer', 'mint', 'burn']
    const isLikelyCritical = criticalNames.some(name => 
      instruction.name.toLowerCase().includes(name)
    )
    return isLikelyCritical ? 'medium' : 'low'
  }

  return 'medium' // Modified instructions
}

/**
 * Gets detailed information about instruction modifications
 */
function getInstructionModificationDetails(oldInstruction: any, newInstruction: any): {
  summary: string
  description: string
  severity: ChangeSeverity
} {
  const changes: string[] = []
  let severity: ChangeSeverity = 'low'

  // Check accounts changes
  const oldAccounts = oldInstruction.accounts || []
  const newAccounts = newInstruction.accounts || []
  
  if (oldAccounts.length !== newAccounts.length) {
    changes.push(`accounts count changed from ${oldAccounts.length} to ${newAccounts.length}`)
    severity = 'high' // Changing account structure is significant
  }

  // Check args changes
  const oldArgs = oldInstruction.args || []
  const newArgs = newInstruction.args || []
  
  if (oldArgs.length !== newArgs.length) {
    changes.push(`arguments count changed from ${oldArgs.length} to ${newArgs.length}`)
    severity = 'medium'
  }

  // Check for account permission changes
  for (let i = 0; i < Math.min(oldAccounts.length, newAccounts.length); i++) {
    const oldAcc = oldAccounts[i]
    const newAcc = newAccounts[i]
    
    if (oldAcc.isMut !== newAcc.isMut) {
      changes.push(`account '${newAcc.name}' mutability changed`)
      severity = 'high'
    }
    
    if (oldAcc.isSigner !== newAcc.isSigner) {
      changes.push(`account '${newAcc.name}' signer requirement changed`)
      severity = 'critical'
    }
  }

  const summary = changes.length > 0 ? changes.join(', ') : 'structure modified'
  const description = `Instruction modification details: ${summary}`

  return { summary, description, severity }
}

/**
 * Deep equality check for objects
 */
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true
  
  if (obj1 == null || obj2 == null) return false
  
  if (typeof obj1 !== typeof obj2) return false
  
  if (typeof obj1 !== 'object') return obj1 === obj2
  
  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)
  
  if (keys1.length !== keys2.length) return false
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false
    if (!deepEqual(obj1[key], obj2[key])) return false
  }
  
  return true
}