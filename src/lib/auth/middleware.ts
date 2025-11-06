import { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
)

export interface AuthUser {
  walletAddress: string
  userId: string
  isAdmin: boolean
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return null
    }

    const { payload } = await jwtVerify(token, JWT_SECRET)

    return {
      walletAddress: payload.walletAddress as string,
      userId: payload.userId as string,
      isAdmin: (payload.isAdmin as boolean) || false,
    }
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

export function requireAuth(handler: (request: NextRequest, user: AuthUser) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await getAuthUser(request)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    return handler(request, user)
  }
}
