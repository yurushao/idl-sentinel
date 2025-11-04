'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ArrowRight, Plus, Minus, Edit } from 'lucide-react'

interface ChangeDetailsProps {
  details: {
    changeType: string
    itemName: string
    oldValue?: any
    newValue?: any
    description: string
  }
}

export function ChangeDetails({ details }: ChangeDetailsProps) {
  const isAddition = details.changeType.includes('added')
  const isRemoval = details.changeType.includes('removed')
  const isModification = details.changeType.includes('modified')

  const renderValue = (value: any, label: string) => {
    if (value === undefined || value === null) {
      return null
    }

    return (
      <div className="flex-1">
        <div className="text-xs font-medium text-muted-foreground mb-2">{label}</div>
        <div className="bg-muted rounded-lg p-3">
          {typeof value === 'object' ? (
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(value, null, 2)}
            </pre>
          ) : (
            <code className="text-xs">{String(value)}</code>
          )}
        </div>
      </div>
    )
  }

  const getChangeIcon = () => {
    if (isAddition) return <Plus className="h-4 w-4 text-green-500" />
    if (isRemoval) return <Minus className="h-4 w-4 text-red-500" />
    if (isModification) return <Edit className="h-4 w-4 text-blue-500" />
    return null
  }

  const getChangeBadgeVariant = () => {
    if (isAddition) return 'default'
    if (isRemoval) return 'destructive'
    return 'secondary'
  }

  return (
    <div className="space-y-4">
      {/* Change Type Header */}
      <div className="flex items-center space-x-2">
        {getChangeIcon()}
        <Badge variant={getChangeBadgeVariant()} className="text-xs">
          {details.changeType.replace(/_/g, ' ')}
        </Badge>
        <span className="text-sm font-medium">{details.itemName}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground">{details.description}</p>

      {/* Value Comparison */}
      {(details.oldValue !== undefined || details.newValue !== undefined) && (
        <div className="space-y-3">
          {isModification ? (
            // Side-by-side comparison for modifications
            <div className="grid gap-4 md:grid-cols-2">
              {renderValue(details.oldValue, 'Before')}
              {details.oldValue !== undefined && details.newValue !== undefined && (
                <div className="hidden md:flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              {renderValue(details.newValue, 'After')}
            </div>
          ) : (
            // Single value display for additions/removals
            <div>
              {isAddition && renderValue(details.newValue, 'Added')}
              {isRemoval && renderValue(details.oldValue, 'Removed')}
            </div>
          )}
        </div>
      )}

      {/* Full Details Section */}
      {(details.oldValue !== undefined || details.newValue !== undefined) && (
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            View raw JSON
          </summary>
          <div className="mt-2 p-3 bg-muted rounded-lg">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
          </div>
        </details>
      )}
    </div>
  )
}
