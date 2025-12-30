'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatRelativeTime, getSeverityColor, getSeverityEmoji, getSeverityBadgeColor, truncateString, debounce } from '@/lib/utils'
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import { ChangeDetails } from './change-details'

interface IdlChange {
  id: string
  program_id: string
  change_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  change_summary: string
  change_details?: any
  detected_at: string
  monitored_programs?: {
    name: string
    program_id: string
  }
}

export function ChangesList() {
  const [changes, setChanges] = useState<IdlChange[]>([])
  const [filteredChanges, setFilteredChanges] = useState<IdlChange[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [programFilter, setProgramFilter] = useState<string>('all')
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchChanges()
  }, [])

  useEffect(() => {
    const debouncedFilter = debounce(() => {
      let filtered = changes

      // Filter by search term
      if (searchTerm.trim()) {
        filtered = filtered.filter(change =>
          change.change_summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
          change.change_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          change.program_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (change.monitored_programs?.name &&
           change.monitored_programs.name.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      }

      // Filter by severity
      if (severityFilter !== 'all') {
        filtered = filtered.filter(change => change.severity === severityFilter)
      }

      // Filter by program
      if (programFilter !== 'all') {
        filtered = filtered.filter(change =>
          change.monitored_programs?.name === programFilter
        )
      }

      setFilteredChanges(filtered)
    }, 300)

    debouncedFilter()
  }, [searchTerm, severityFilter, programFilter, changes])

  const fetchChanges = async () => {
    try {
      const response = await fetch('/api/changes?limit=100')
      if (response.ok) {
        const data = await response.json()
        setChanges(data.changes || [])
        setFilteredChanges(data.changes || [])
      }
    } catch (error) {
      console.error('Error fetching changes:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (changeId: string) => {
    const newExpanded = new Set(expandedChanges)
    if (newExpanded.has(changeId)) {
      newExpanded.delete(changeId)
    } else {
      newExpanded.add(changeId)
    }
    setExpandedChanges(newExpanded)
  }

  const severityOptions = [
    { value: 'all', label: 'All Severities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ]

  // Get unique program names
  const programOptions = [
    { value: 'all', label: 'All Programs' },
    ...Array.from(new Set(changes.map(change => change.monitored_programs?.name).filter(Boolean)))
      .map(name => ({ value: name as string, label: name as string }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-64 bg-muted rounded animate-pulse" />
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
        
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search changes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>

          <div className="relative flex-1 sm:flex-initial">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
            >
              {severityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 sm:flex-initial">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
            >
              {programOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {filteredChanges.length} of {changes.length} changes
        </div>
      </div>

      {filteredChanges.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            {changes.length === 0 ? (
              <div>
                <h3 className="text-lg font-medium mb-2">No changes detected yet</h3>
                <p className="text-muted-foreground">
                  IDL changes will appear here once your programs are monitored
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium mb-2">No changes found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms or filters
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredChanges.map((change) => {
            const isExpanded = expandedChanges.has(change.id)

            return (
              <Card key={change.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className={`h-4 w-4 rounded-full mt-1 flex-shrink-0 ${getSeverityColor(change.severity)}`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {change.monitored_programs?.name || 'Unknown Program'}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {change.change_type}
                          </Badge>
                          <Badge
                            className={`text-xs ${getSeverityBadgeColor(change.severity)}`}
                          >
                            {getSeverityEmoji(change.severity)} {change.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(change.detected_at)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(change.id)}
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">
                        {change.change_summary}
                      </p>

                      <p className="text-xs text-muted-foreground font-mono break-all">
                        {truncateString(change.program_id, 40)}
                      </p>

                      {isExpanded && change.change_details && (
                        <div className="mt-4 p-3 sm:p-4 bg-muted/50 rounded-lg overflow-auto">
                          <h4 className="font-medium mb-3 text-sm">Change Details</h4>
                          <ChangeDetails details={change.change_details} />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}