import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

interface WatchlistItem {
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

interface WatchlistResponse {
  watchlist: WatchlistItem[]
}

export function useWatchlist(options?: { enabled?: boolean }) {
  return useQuery<WatchlistResponse>({
    queryKey: queryKeys.watchlist,
    queryFn: async () => {
      const response = await fetch('/api/watchlist')
      if (!response.ok) {
        if (response.status === 401) throw new Error('Authentication required')
        throw new Error('Failed to fetch watchlist')
      }
      return response.json()
    },
    staleTime: Infinity,
    ...options,
  })
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (programDbId: string) => {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId: programDbId }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to add to watchlist')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist })
    },
  })
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (programDbId: string) => {
      const response = await fetch(`/api/watchlist?programId=${programDbId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to remove from watchlist')
      }
      return programDbId
    },
    onMutate: async (programDbId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlist })
      const previous = queryClient.getQueryData<WatchlistResponse>(
        queryKeys.watchlist
      )

      queryClient.setQueryData<WatchlistResponse>(queryKeys.watchlist, (old) =>
        old
          ? {
              watchlist: old.watchlist.filter(
                (item) => item.program_id !== programDbId
              ),
            }
          : undefined
      )

      return { previous }
    },
    onError: (_err, _programDbId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.watchlist, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.watchlist })
    },
  })
}
