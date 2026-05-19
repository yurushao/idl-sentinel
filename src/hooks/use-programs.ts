import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'
import type { MonitoredProgram } from '@/lib/supabase'
import { useAuth } from '@/lib/auth/auth-context'

interface ProgramsResponse {
  programs: MonitoredProgram[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

interface ProgramResponse {
  program: MonitoredProgram
}

interface SnapshotsResponse {
  snapshots: Array<{
    id: string
    program_id: string
    idl_hash: string
    idl_content: unknown
    version_number: number
    fetched_at: string
  }>
}

interface ProgramChangesResponse {
  changes: Array<{
    id: string
    change_type: string
    change_summary: string
    change_details: unknown
    severity: 'low' | 'medium' | 'high' | 'critical'
    detected_at: string
  }>
}

export function usePrograms() {
  const { isAdmin, isLoading: authLoading } = useAuth()

  return useQuery<ProgramsResponse>({
    queryKey: [...queryKeys.programsList(), { includeInactive: isAdmin }],
    queryFn: async () => {
      const response = await fetch('/api/programs')
      if (!response.ok) throw new Error('Failed to fetch programs')
      return response.json()
    },
    enabled: !authLoading,
  })
}

export function useProgram(id: string) {
  return useQuery<ProgramResponse>({
    queryKey: queryKeys.programDetail(id),
    queryFn: async () => {
      const response = await fetch(`/api/programs/${id}`)
      if (!response.ok) {
        if (response.status === 404) throw new Error('Program not found')
        throw new Error('Failed to fetch program')
      }
      return response.json()
    },
    enabled: !!id,
  })
}

export function useProgramSnapshots(id: string, limit = 10) {
  return useQuery<SnapshotsResponse>({
    queryKey: queryKeys.programSnapshots(id),
    queryFn: async () => {
      const response = await fetch(`/api/programs/${id}/snapshots?limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch snapshots')
      return response.json()
    },
    enabled: !!id,
  })
}

export function useProgramChanges(id: string, limit = 10) {
  return useQuery<ProgramChangesResponse>({
    queryKey: queryKeys.programChanges(id),
    queryFn: async () => {
      const response = await fetch(`/api/programs/${id}/changes?limit=${limit}`)
      if (!response.ok) throw new Error('Failed to fetch changes')
      return response.json()
    },
    enabled: !!id,
  })
}

export function useDeleteProgram() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (programId: string) => {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to delete program')
      }
      return programId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs })
    },
  })
}
