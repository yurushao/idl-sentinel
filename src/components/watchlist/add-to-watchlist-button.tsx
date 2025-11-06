'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Star, Loader2 } from 'lucide-react'

interface AddToWatchlistButtonProps {
  programId: string
  programDbId: string
  size?: 'sm' | 'default' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
}

export function AddToWatchlistButton({
  programId,
  programDbId,
  size = 'default',
  variant = 'outline'
}: AddToWatchlistButtonProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      checkWatchlistStatus()
    } else if (!authLoading) {
      setChecking(false)
    }
  }, [isAuthenticated, authLoading, programDbId])

  const checkWatchlistStatus = async () => {
    try {
      setChecking(true)
      const response = await fetch('/api/watchlist')

      if (!response.ok) {
        // If unauthorized or other error, just skip checking
        // This can happen if user is not authenticated or DB not migrated
        console.log('Could not check watchlist status:', response.status)
        setChecking(false)
        return
      }

      const data = await response.json()
      const watchlist = data.watchlist || []

      // Check if this program is in the user's watchlist
      const inWatchlist = watchlist.some(
        (item: any) => item.program_id === programDbId
      )
      setIsInWatchlist(inWatchlist)
    } catch (err) {
      console.error('Error checking watchlist status:', err)
      // Silently fail - user can still try to add to watchlist
    } finally {
      setChecking(false)
    }
  }

  const toggleWatchlist = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to manage your watchlist')
      return
    }

    try {
      setLoading(true)

      if (isInWatchlist) {
        // Remove from watchlist
        const response = await fetch(`/api/watchlist?programId=${programDbId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to remove from watchlist' }))
          throw new Error(errorData.error || 'Failed to remove from watchlist')
        }

        setIsInWatchlist(false)
      } else {
        // Add to watchlist
        const response = await fetch('/api/watchlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ programId: programDbId }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to add to watchlist' }))

          // Check if it's a database migration error
          if (errorData.error && errorData.error.includes('user_watchlist')) {
            throw new Error('Database not fully configured. Please apply migrations.')
          }

          throw new Error(errorData.error || 'Failed to add to watchlist')
        }

        setIsInWatchlist(true)
      }
    } catch (err) {
      console.error('Error toggling watchlist:', err)
      alert(err instanceof Error ? err.message : 'Failed to update watchlist')
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated && !authLoading) {
    return null // Don't show button for non-authenticated users
  }

  if (checking || authLoading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    )
  }

  return (
    <Button
      variant={isInWatchlist ? 'default' : variant}
      size={size}
      onClick={toggleWatchlist}
      disabled={loading}
      className="flex items-center gap-2"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Star className={`h-4 w-4 ${isInWatchlist ? 'fill-current' : ''}`} />
      )}
      <span>{isInWatchlist ? 'Watching' : 'Watch'}</span>
    </Button>
  )
}
