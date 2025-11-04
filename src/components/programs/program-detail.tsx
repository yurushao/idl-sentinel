'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatRelativeTime, truncateString } from '@/lib/utils'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  RefreshCw, 
  Copy, 
  ExternalLink,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface MonitoredProgram {
  id: string
  program_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Snapshot {
  id: string
  program_id: string
  idl_hash: string
  idl_content: any
  fetched_at: string
}

interface Change {
  id: string
  program_id: string
  snapshot_id: string
  change_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  change_summary: string
  change_details: any
  detected_at: string
}

interface ProgramDetailProps {
  programId: string
}

export function ProgramDetail({ programId }: ProgramDetailProps) {
  const router = useRouter()
  const [program, setProgram] = useState<MonitoredProgram | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [changes, setChanges] = useState<Change[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchProgramData()
  }, [programId])

  const fetchProgramData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch program details
      const programResponse = await fetch(`/api/programs/${programId}`)
      if (!programResponse.ok) {
        if (programResponse.status === 404) {
          setError('Program not found')
          return
        }
        throw new Error('Failed to fetch program')
      }
      const programData = await programResponse.json()
      setProgram(programData.program)

      // Fetch snapshots
      const snapshotsResponse = await fetch(`/api/programs/${programId}/snapshots?limit=10`)
      if (snapshotsResponse.ok) {
        const snapshotsData = await snapshotsResponse.json()
        setSnapshots(snapshotsData.snapshots || [])
      }

      // Fetch changes
      const changesResponse = await fetch(`/api/programs/${programId}/changes?limit=10`)
      if (changesResponse.ok) {
        const changesData = await changesResponse.json()
        setChanges(changesData.changes || [])
      }

    } catch (err) {
      console.error('Error fetching program data:', err)
      setError('Failed to load program data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchProgramData()
    setRefreshing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/programs')
      } else {
        alert('Failed to delete program')
      }
    } catch (error) {
      console.error('Error deleting program:', error)
      alert('Failed to delete program')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <XCircle className="h-4 w-4" />
      case 'high': return <AlertCircle className="h-4 w-4" />
      case 'medium': return <AlertCircle className="h-4 w-4" />
      case 'low': return <CheckCircle className="h-4 w-4" />
      default: return <CheckCircle className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/programs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Programs
            </Link>
          </Button>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!program) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/programs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Programs
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link href={`/programs/${programId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Program Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Program Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm mt-1">{program.name}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div className="mt-1">
                <Badge variant={program.is_active ? "default" : "secondary"}>
                  {program.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <p className="text-sm mt-1">{program.description || 'No description provided'}</p>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Program ID</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-muted px-2 py-1 rounded break-all">
                  {program.program_id}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(program.program_id)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={`https://explorer.solana.com/address/${program.program_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm mt-1">{formatRelativeTime(program.created_at)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
              <p className="text-sm mt-1">{formatRelativeTime(program.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Snapshots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Snapshots
              <Badge variant="secondary">{snapshots.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {snapshots.length === 0 ? (
              <p className="text-muted-foreground text-sm">No snapshots found</p>
            ) : (
              <div className="space-y-3">
                {snapshots.slice(0, 5).map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {truncateString(snapshot.idl_hash, 12)}
                      </code>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatRelativeTime(snapshot.fetched_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(snapshot.idl_hash)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {snapshots.length > 5 && (
                  <Button variant="outline" size="sm" className="w-full">
                    View All {snapshots.length} Snapshots
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Changes
              <Badge variant="secondary">{changes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {changes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No changes detected</p>
            ) : (
              <div className="space-y-3">
                {changes.slice(0, 5).map((change) => (
                  <div
                    key={change.id}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={getSeverityColor(change.severity)}
                      >
                        {getSeverityIcon(change.severity)}
                        <span className="ml-1 capitalize">{change.severity}</span>
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(change.detected_at)}
                      </span>
                    </div>

                    <div>
                      <p className="text-sm font-medium">{change.change_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {change.change_summary}
                      </p>
                    </div>
                  </div>
                ))}
                
                {changes.length > 5 && (
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href="/changes">
                      View All {changes.length} Changes
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}