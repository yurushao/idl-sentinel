'use client'

import { ReactNode } from 'react'
import { WalletContextProvider } from './wallet/wallet-provider'
import { AuthProvider } from '@/lib/auth/auth-context'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletContextProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </WalletContextProvider>
  )
}
