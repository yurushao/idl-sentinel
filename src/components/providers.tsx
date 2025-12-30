'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from '@/lib/theme/theme-provider'
import { WalletContextProvider } from './wallet/wallet-provider'
import { AuthProvider } from '@/lib/auth/auth-context'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WalletContextProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </WalletContextProvider>
    </ThemeProvider>
  )
}
