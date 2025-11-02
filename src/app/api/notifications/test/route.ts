import { NextRequest, NextResponse } from 'next/server'
import { testTelegramNotification } from '@/lib/notifications/telegram'

export async function POST() {
  try {
    const success = await testTelegramNotification()
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to send test notification'
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error testing notification:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}