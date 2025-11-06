import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

// Store nonces temporarily (in production, use Redis or database)
const nonceStore = new Map<string, { nonce: string; timestamp: number }>()

// Clean up old nonces (older than 5 minutes)
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
  for (const [key, value] of nonceStore.entries()) {
    if (value.timestamp < fiveMinutesAgo) {
      nonceStore.delete(key)
    }
  }
}, 60 * 1000)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Generate a random nonce
    const nonce = randomBytes(32).toString('hex')

    // Store nonce with timestamp
    nonceStore.set(walletAddress, {
      nonce,
      timestamp: Date.now(),
    })

    return NextResponse.json({ nonce })
  } catch (error) {
    console.error('Error generating nonce:', error)
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    )
  }
}

export { nonceStore }
