import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import type { IdlChange } from '@/lib/supabase'

type ChangeWithProgram = IdlChange & {
  monitored_programs?: {
    name: string
    program_id: string
  }
}

interface ChangesResponse {
  changes: ChangeWithProgram[]
}

export function useChanges(limit = 100) {
  return useQuery<ChangesResponse>({
    queryKey: queryKeys.changesList({ limit }),
    queryFn: async () => {
      const response = await fetch(`/api/changes?limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch changes')
      return response.json()
    },
  })
}

export function useRecentChanges(limit = 8) {
  return useQuery<ChangesResponse>({
    queryKey: queryKeys.changesList({ limit }),
    queryFn: async () => {
      const response = await fetch(`/api/changes?limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch recent changes')
      return response.json()
    },
  })
}
