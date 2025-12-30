'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import bs58 from 'bs58'

interface AuthContextType {
  isAuthenticated: boolean
  walletAddress: string | null
  isAdmin: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const { publicKey, signMessage, disconnect, connected } = useWallet()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const wasConnectedRef = useRef(false)

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus()
  }, [])

  // Check for wallet mismatch when publicKey changes
  useEffect(() => {
    if (publicKey && connected) {
      // Wallet is connected - check for mismatch and track connection state
      wasConnectedRef.current = true
      checkAuthStatus()
    } else if (!connected && wasConnectedRef.current) {
      // Wallet was connected and is now disconnected - clear auth state
      // This handles explicit disconnection by the user
      setWalletAddress(null)
      setIsAuthenticated(false)
      setIsAdmin(false)
      wasConnectedRef.current = false
    }
    // If publicKey is null and wasConnectedRef.current is false, we're still autoconnecting
    // In this case, don't clear auth state - let JWT maintain the session
  }, [publicKey, connected])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()

        // Check for wallet mismatch
        if (publicKey && data.walletAddress !== publicKey.toBase58()) {
          console.warn('Wallet mismatch detected!')
          console.log('JWT wallet:', data.walletAddress)
          console.log('Connected wallet:', publicKey.toBase58())
          console.log('Auto-signing out...')

          // Clear auth state
          await fetch('/api/auth/signout', { method: 'POST' })
          setIsAuthenticated(false)
          setWalletAddress(null)
          setIsAdmin(false)
          return
        }

        setIsAuthenticated(true)
        setWalletAddress(data.walletAddress)
        setIsAdmin(data.isAdmin || false)
      } else {
        setIsAuthenticated(false)
        setWalletAddress(null)
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setIsAuthenticated(false)
      setIsAdmin(false)
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async () => {
    if (!publicKey || !signMessage) {
      throw new Error('Wallet not connected')
    }

    try {
      setIsLoading(true)

      // Get nonce from server
      const nonceResponse = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: publicKey.toBase58() }),
      })

      if (!nonceResponse.ok) {
        throw new Error('Failed to get nonce')
      }

      const { nonce } = await nonceResponse.json()

      // Create message to sign
      const message = `Sign this message to authenticate with IDL Sentinel.\n\nNonce: ${nonce}`
      const messageBytes = new TextEncoder().encode(message)

      // Sign the message
      const signature = await signMessage(messageBytes)

      // Verify signature on server
      const verifyResponse = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: publicKey.toBase58(),
          signature: bs58.encode(signature),
          message,
        }),
      })

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify signature')
      }

      const { token } = await verifyResponse.json()

      setIsAuthenticated(true)
      setWalletAddress(publicKey.toBase58())

      // Fetch user details to get admin status
      await checkAuthStatus()
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', { method: 'POST' })
      setIsAuthenticated(false)
      setWalletAddress(null)
      setIsAdmin(false)
      await disconnect()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        walletAddress,
        isAdmin,
        signIn,
        signOut,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
