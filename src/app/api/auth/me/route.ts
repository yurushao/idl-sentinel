import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verify JWT
    const { payload } = await jwtVerify(token, JWT_SECRET)

    return NextResponse.json({
      walletAddress: payload.walletAddress,
      userId: payload.userId,
      isAdmin: payload.isAdmin || false,
    })
  } catch (error) {
    console.error('Error verifying token:', error)
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
}
