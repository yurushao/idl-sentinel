'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { isValidProgramId } from '@/lib/utils'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

interface ProgramFormData {
  program_id: string
  name: string
  description: string
}

interface ProgramFormProps {
  initialData?: Partial<ProgramFormData>
  programId?: string
  isEdit?: boolean
}

export function ProgramForm({ initialData, programId, isEdit = false }: ProgramFormProps) {
  const router = useRouter()
  const [formData, setFormData] = useState<ProgramFormData>({
    program_id: initialData?.program_id || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
  })
  const [errors, setErrors] = useState<Partial<ProgramFormData>>({})
  const [loading, setLoading] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Partial<ProgramFormData> = {}

    if (!formData.program_id.trim()) {
      newErrors.program_id = 'Program ID is required'
    } else if (!isValidProgramId(formData.program_id)) {
      newErrors.program_id = 'Invalid Solana program ID format'
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Program name is required'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Program name must be at least 3 characters'
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const url = isEdit ? `/api/programs/${programId}` : '/api/programs'
      const method = isEdit ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/programs')
      } else {
        if (data.error) {
          if (data.error.includes('already exists')) {
            setErrors({ program_id: 'A program with this ID is already being monitored' })
          } else {
            alert(data.error)
          }
        } else {
          alert('Failed to save program')
        }
      }
    } catch (error) {
      console.error('Error saving program:', error)
      alert('Failed to save program')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProgramFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/programs">
          <Button variant="outline" className="flex items-center space-x-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Programs</span>
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Program' : 'Add New Program'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="program_id" className="block text-sm font-medium mb-2">
                Program ID *
              </label>
              <Input
                id="program_id"
                type="text"
                value={formData.program_id}
                onChange={(e) => handleInputChange('program_id', e.target.value)}
                placeholder="e.g., 11111111111111111111111111111112"
                disabled={isEdit} // Don't allow editing program ID
                className={errors.program_id ? 'border-destructive' : ''}
              />
              {errors.program_id && (
                <p className="text-sm text-destructive mt-1">{errors.program_id}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                The Solana program ID (public key) to monitor for IDL changes
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Program Name *
              </label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., My DeFi Protocol"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                A friendly name to identify this program
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-2">
                Description
              </label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Optional description of what this program does..."
                rows={4}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Optional description to help identify the program's purpose
              </p>
            </div>

            <div className="flex justify-end space-x-4">
              <Link href="/programs">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading} className="flex items-center space-x-2">
                <Save className="h-4 w-4" />
                <span>{loading ? 'Saving...' : (isEdit ? 'Update Program' : 'Add Program')}</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}