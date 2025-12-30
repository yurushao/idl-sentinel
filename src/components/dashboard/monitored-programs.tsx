'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRelativeTime, truncateString } from '@/lib/utils'
import { ExternalLink, Plus, Code, Activity, AlertCircle } from 'lucide-react'
import { useAuth } from '@/lib/auth/auth-context'

interface MonitoredProgram {
  id: string
  program_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
  last_checked_at?: string | null
}

export function MonitoredPrograms() {
  const { isAdmin } = useAuth()
  const [programs, setPrograms] = useState<MonitoredProgram[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/programs')
      if (response.ok) {
        const data = await response.json()
        setPrograms(data.programs || [])
      }
    } catch (error) {
      console.error('Error fetching programs:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Code className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Monitored Programs</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
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
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Code className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Monitored Programs</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/programs" className="flex-1 sm:flex-initial">
              <Button variant="outline" size="sm" className="flex items-center justify-center space-x-1 w-full">
                <span className="hidden sm:inline">View all</span>
                <span className="sm:hidden">All</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
            {isAdmin && (
              <Link href="/programs/new" className="flex-1 sm:flex-initial">
                <Button size="sm" className="flex items-center justify-center space-x-1 w-full">
                  <Plus className="h-3 w-3" />
                  <span>Add</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {programs.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground font-medium mb-2">No programs are being monitored yet</p>
            <p className="text-sm text-muted-foreground/70 mb-4">
              {isAdmin
                ? "Start monitoring your first Solana program"
                : "No programs have been added for monitoring"}
            </p>
            {isAdmin && (
              <Link href="/programs/new">
                <Button className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Your First Program</span>
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {programs.slice(0, 5).map((program) => (
              <div key={program.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Activity className={`h-4 w-4 ${program.is_active ? 'text-green-600' : 'text-muted-foreground'}`} />
                    <span className="font-medium">{program.name}</span>
                    <Badge
                      variant={program.is_active ? "default" : "secondary"}
                    >
                      {program.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {program.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {truncateString(program.description, 80)}
                    </p>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded inline-block break-all">
                      {truncateString(program.program_id, 30)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {program.last_checked_at
                        ? `Last checked ${formatRelativeTime(program.last_checked_at)}`
                        : 'Never checked'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:ml-4">
                  <Link href={`/programs/${program.id}`} className="flex-1 sm:flex-initial">
                    <Button variant="outline" size="sm" className="w-full">
                      View
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {programs.length > 5 && (
              <div className="text-center pt-4">
                <Link href="/programs" className="block sm:inline-block">
                  <Button variant="outline" className="w-full sm:w-auto">
                    View all {programs.length} programs
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}