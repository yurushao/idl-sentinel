'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatRelativeTime, truncateString, debounce } from '@/lib/utils'
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react'

interface MonitoredProgram {
  id: string
  program_id: string
  name: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function ProgramsList() {
  const [programs, setPrograms] = useState<MonitoredProgram[]>([])
  const [filteredPrograms, setFilteredPrograms] = useState<MonitoredProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPrograms()
  }, [])

  useEffect(() => {
    const debouncedFilter = debounce(() => {
      if (!searchTerm.trim()) {
        setFilteredPrograms(programs)
      } else {
        const filtered = programs.filter(program =>
          program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          program.program_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (program.description && program.description.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        setFilteredPrograms(filtered)
      }
    }, 300)

    debouncedFilter()
  }, [searchTerm, programs])

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/programs')
      if (response.ok) {
        const data = await response.json()
        setPrograms(data.programs || [])
        setFilteredPrograms(data.programs || [])
      }
    } catch (error) {
      console.error('Error fetching programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (programId: string) => {
    if (!confirm('Are you sure you want to delete this program? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPrograms(programs.filter(p => p.id !== programId))
        setFilteredPrograms(filteredPrograms.filter(p => p.id !== programId))
      } else {
        alert('Failed to delete program')
      }
    } catch (error) {
      console.error('Error deleting program:', error)
      alert('Failed to delete program')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        
        <div className="grid gap-4">
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
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredPrograms.length} of {programs.length} programs
          </div>
        </div>
        
        <Link href="/programs/new">
          <Button className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add Program</span>
          </Button>
        </Link>
      </div>

      {filteredPrograms.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            {programs.length === 0 ? (
              <div>
                <h3 className="text-lg font-medium mb-2">No programs monitored yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start monitoring your first Solana program for IDL changes
                </p>
                <Link href="/programs/new">
                  <Button className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Your First Program</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-medium mb-2">No programs found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPrograms.map((program) => (
            <Card key={program.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold">{program.name}</h3>
                      <Badge variant={program.is_active ? "default" : "secondary"}>
                        {program.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    {program.description && (
                      <p className="text-muted-foreground mb-3">
                        {program.description}
                      </p>
                    )}
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-muted-foreground">Program ID:</span>
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                          {program.program_id}
                        </code>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <span>Added {formatRelativeTime(program.created_at)}</span>
                        <span>Updated {formatRelativeTime(program.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Link href={`/programs/${program.id}`}>
                      <Button variant="outline" size="sm" className="flex items-center space-x-1">
                        <Eye className="h-3 w-3" />
                        <span>View</span>
                      </Button>
                    </Link>
                    <Link href={`/programs/${program.id}/edit`}>
                      <Button variant="outline" size="sm" className="flex items-center space-x-1">
                        <Edit className="h-3 w-3" />
                        <span>Edit</span>
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDelete(program.id)}
                      className="flex items-center space-x-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}