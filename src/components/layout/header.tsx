"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Monitor, Settings, Activity, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '@/lib/auth/auth-context';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: "Dashboard", href: "/", icon: Monitor },
  { name: "Programs", href: "/programs", icon: Activity },
  { name: "Changes", href: "/changes", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Monitor className="h-5 w-5" />
                <div>
                  <span className="text-lg font-semibold">IDL Sentinel</span>
                </div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <WalletButton />
          </div>
        </div>
      </div>
    </header>
  );
}

function WalletButton() {
  const { publicKey, connected } = useWallet();
  const { isAuthenticated, signIn, signOut, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by not rendering wallet button on server
  if (!mounted) {
    return (
      <div className="h-10 w-[140px] bg-muted/50 rounded-md animate-pulse" />
    );
  }

  if (!connected) {
    return <WalletMultiButton />;
  }

  if (connected && !isAuthenticated && !isLoading) {
    return (
      <Button onClick={signIn} disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <WalletMultiButton />
        <Button onClick={signOut} variant="outline" size="sm">
          Sign Out
        </Button>
      </div>
    );
  }

  return <WalletMultiButton />;
}
