'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime, severityDotColors, severityBadgeColors, truncateString } from '@/lib/utils'
import { ExternalLink, Clock, AlertCircle } from 'lucide-react'

interface IdlChange {
  id: string
  program_id: string
  change_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  change_summary: string
  detected_at: string
  monitored_programs?: {
    name: string
    program_id: string
  }
}

export function RecentChanges() {
  const [changes, setChanges] = useState<IdlChange[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentChanges()
  }, [])

  const fetchRecentChanges = async () => {
    try {
      const response = await fetch('/api/changes?limit=10')
      if (response.ok) {
        const data = await response.json()
        setChanges(data.changes || [])
      }
    } catch (error) {
      console.error('Error fetching recent changes:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle>Recent Changes</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted/50 rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <CardTitle>Recent Changes</CardTitle>
        </div>
        <Link 
          href="/changes" 
          className="text-sm text-muted-foreground hover:text-foreground flex items-center space-x-1"
        >
          <span>View all</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {changes.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground font-medium">No recent changes detected</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Changes will appear here when detected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {changes.slice(0, 5).map((change) => (
              <div key={change.id} className="flex items-start gap-2 sm:gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div
                  className={`h-2 w-2 rounded-full mt-2 flex-shrink-0 ${
                    severityDotColors[change.severity] || 'bg-gray-500'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-sm">
                        {change.monitored_programs?.name || 'Unknown Program'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {change.change_type}
                      </Badge>
                      <Badge
                        className={`text-xs ${
                          severityBadgeColors[change.severity] || 'bg-gray-500 text-white'
                        }`}
                      >
                        {change.severity}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(change.detected_at)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {truncateString(change.change_summary, 100)}
                  </p>
                </div>
              </div>
            ))}
            {changes.length > 5 && (
              <div className="text-center pt-4">
                <Link href="/changes" className="block sm:inline-block">
                  <button className="w-full sm:w-auto px-4 py-2 border border-input bg-background rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                    View all {changes.length} changes
                  </button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}