'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ArrowRight, Plus, Minus, Edit } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'

// Dynamically import ReactDiffViewer to avoid SSR issues
const ReactDiffViewer = dynamic(() => import('react-diff-viewer'), {
  ssr: false,
})

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
  const [splitView, setSplitView] = useState(true)

  // Format values as pretty JSON strings for diff viewer
  const formatValue = (value: any): string => {
    if (value === undefined || value === null) {
      return ''
    }
    return typeof value === 'object'
      ? JSON.stringify(value, null, 2)
      : String(value)
  }

  const oldValueStr = useMemo(() => formatValue(details.oldValue), [details.oldValue])
  const newValueStr = useMemo(() => formatValue(details.newValue), [details.newValue])

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

      {/* Diff Viewer */}
      {(details.oldValue !== undefined || details.newValue !== undefined) && (
        <div className="space-y-3">
          {isModification && oldValueStr && newValueStr ? (
            // Enhanced diff view for modifications
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">Changes</div>
                <button
                  onClick={() => setSplitView(!splitView)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {splitView ? 'Unified view' : 'Split view'}
                </button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <ReactDiffViewer
                  oldValue={oldValueStr}
                  newValue={newValueStr}
                  splitView={splitView}
                  useDarkTheme={false}
                  styles={{
                    variables: {
                      light: {
                        diffViewerBackground: 'hsl(var(--background))',
                        diffViewerColor: 'hsl(var(--foreground))',
                        addedBackground: '#e6ffed',
                        addedColor: '#24292e',
                        removedBackground: '#ffeef0',
                        removedColor: '#24292e',
                        wordAddedBackground: '#acf2bd',
                        wordRemovedBackground: '#fdb8c0',
                        addedGutterBackground: '#cdffd8',
                        removedGutterBackground: '#ffdce0',
                        gutterBackground: 'hsl(var(--muted))',
                        gutterBackgroundDark: 'hsl(var(--muted))',
                        highlightBackground: '#fffbdd',
                        highlightGutterBackground: '#fff5b1',
                      },
                    },
                    line: {
                      fontSize: '12px',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                      letterSpacing: '0',
                      lineHeight: '1.6',
                      whiteSpace: 'pre',
                      wordBreak: 'normal',
                      wordWrap: 'normal',
                    },
                    contentText: {
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                      letterSpacing: '0',
                      fontVariantLigatures: 'none',
                      fontFeatureSettings: 'normal',
                    },
                  }}
                />
              </div>
            </div>
          ) : (
            // Single value display for additions/removals
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                {isAddition ? 'Added Value' : 'Removed Value'}
              </div>
              <div className="border rounded-lg overflow-hidden">
                <div className={`p-3 ${isAddition ? 'bg-green-50' : 'bg-red-50'}`}>
                  <pre className="text-xs overflow-x-auto whitespace-pre-wrap font-mono">
                    {isAddition ? newValueStr : oldValueStr}
                  </pre>
                </div>
              </div>
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
