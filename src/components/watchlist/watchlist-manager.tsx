'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Star, StarOff, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeTime } from '@/lib/utils'

interface WatchlistProgram {
  id: string
  program_id: string
  created_at: string
  monitored_programs: {
    id: string
    program_id: string
    name: string
    description: string | null
    is_active: boolean
  }
}

export function WatchlistManager() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [watchlist, setWatchlist] = useState<WatchlistProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchWatchlist()
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false)
    }
  }, [isAuthenticated, authLoading])

  const fetchWatchlist = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/watchlist')

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch watchlist' }))

        // Check if it's a database migration error
        if (errorData.error && errorData.error.includes('user_watchlist')) {
          throw new Error('Database tables not found. Please apply migrations in Supabase.')
        }

        throw new Error(errorData.error || 'Failed to fetch watchlist')
      }

      const data = await response.json()
      setWatchlist(data.watchlist || [])
    } catch (err) {
      console.error('Error fetching watchlist:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch watchlist')
    } finally {
      setLoading(false)
    }
  }

  const removeFromWatchlist = async (programId: string) => {
    try {
      const response = await fetch(`/api/watchlist?programId=${programId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove from watchlist')
      }

      // Update local state
      setWatchlist(prev => prev.filter(item => item.program_id !== programId))
    } catch (err) {
      console.error('Error removing from watchlist:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove from watchlist')
    }
  }

  if (!isAuthenticated && !authLoading) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Sign In Required</h3>
          <p className="text-muted-foreground mb-4">
            Please connect your wallet and sign in to manage your watchlist
          </p>
        </div>
      </Card>
    )
  }

  if (loading || authLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading watchlist...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-destructive">
          <p>Error: {error}</p>
          <Button onClick={fetchWatchlist} className="mt-4">
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  if (watchlist.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Programs in Watchlist</h3>
          <p className="text-muted-foreground mb-4">
            Start watching programs to receive notifications when their IDLs change
          </p>
          <Link href="/">
            <Button>Browse Programs</Button>
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">My Watchlist</h2>
        <span className="text-sm text-muted-foreground">
          {watchlist.length} program{watchlist.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid gap-4">
        {watchlist.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Link
                    href={`/programs/${item.monitored_programs.id}`}
                    className="text-lg font-medium hover:underline"
                  >
                    {item.monitored_programs.name}
                  </Link>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </div>

                {item.monitored_programs.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {item.monitored_programs.description}
                  </p>
                )}

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <code className="bg-muted px-2 py-1 rounded">
                    {item.monitored_programs.program_id.substring(0, 12)}...
                  </code>
                  <span>Added {formatRelativeTime(item.created_at)}</span>
                  <span className={item.monitored_programs.is_active ? 'text-green-600' : 'text-red-600'}>
                    {item.monitored_programs.is_active ? '● Active' : '○ Inactive'}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFromWatchlist(item.program_id)}
                className="ml-4"
              >
                <StarOff className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
