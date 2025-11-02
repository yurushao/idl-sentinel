import { NextRequest, NextResponse } from 'next/server'
import { getProgramById, updateProgram, deleteProgram } from '@/lib/db/programs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const program = await getProgramById(id)
    
    if (!program) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ program })
  } catch (error) {
    console.error('Error fetching program:', error)
    return NextResponse.json(
      { error: 'Failed to fetch program' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description, is_active } = body

    // Validation
    const updates: any = {}
    
    if (name !== undefined) {
      if (typeof name !== 'string' || name.length < 2 || name.length > 100) {
        return NextResponse.json(
          { error: 'Name must be between 2 and 100 characters' },
          { status: 400 }
        )
      }
      updates.name = name
    }
    
    if (description !== undefined) {
      if (description !== null && (typeof description !== 'string' || description.length > 500)) {
        return NextResponse.json(
          { error: 'Description must be less than 500 characters' },
          { status: 400 }
        )
      }
      updates.description = description
    }
    
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return NextResponse.json(
          { error: 'is_active must be a boolean' },
          { status: 400 }
        )
      }
      updates.is_active = is_active
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const program = await updateProgram(id, updates)
    
    return NextResponse.json({ program })
  } catch (error) {
    console.error('Error updating program:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to update program' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteProgram(id)
    
    return NextResponse.json({ message: 'Program deleted successfully' })
  } catch (error) {
    console.error('Error deleting program:', error)
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to delete program' },
      { status: 500 }
    )
  }
}