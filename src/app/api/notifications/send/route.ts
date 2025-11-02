import { NextRequest, NextResponse } from 'next/server'
import { sendPendingNotifications } from '@/lib/notifications/telegram'

export async function POST() {
  try {
    const result = await sendPendingNotifications()
    
    return NextResponse.json({
      success: true,
      result
    })
  } catch (error) {
    console.error('Error sending notifications:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}