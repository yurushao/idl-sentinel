"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Monitor, Settings, Blocks, Bell, Loader2, Menu, X } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "@/lib/auth/auth-context";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Programs", href: "/programs", icon: Blocks },
  { name: "Changes", href: "/changes", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {/* <Monitor className="h-5 w-5" /> */}
                <div>
                  <span className="text-lg font-semibold">IDL Sentinel</span>
                </div>
              </div>
            </Link>

            <nav className="hidden items-center space-x-1 md:flex">
              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t py-4 md:hidden">
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

function WalletButton() {
  const { publicKey, connected, disconnect } = useWallet();
  const { isAuthenticated, signIn, signOut, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [hasAttemptedAutoSignIn, setHasAttemptedAutoSignIn] = useState(false);
  const previousWalletRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle wallet disconnection - sign out from app
  useEffect(() => {
    if (!connected && isAuthenticated) {
      signOut();
    }
    if (!connected) {
      setHasAttemptedAutoSignIn(false);
      previousWalletRef.current = null;
    }
  }, [connected, isAuthenticated, signOut]);

  // Handle wallet switch - re-authenticate with new wallet
  useEffect(() => {
    if (mounted && connected && publicKey && isAuthenticated) {
      const connectedAddress = publicKey.toBase58();

      // If we have a previous wallet and it's different, user switched wallets
      if (previousWalletRef.current && previousWalletRef.current !== connectedAddress) {
        console.log("Wallet switched, re-authenticating...");
        signOut().then(() => {
          setHasAttemptedAutoSignIn(false);
          previousWalletRef.current = null;
        });
      } else if (!previousWalletRef.current) {
        // First time authenticating, track this wallet
        previousWalletRef.current = connectedAddress;
      }
    }
  }, [mounted, connected, publicKey, isAuthenticated, signOut]);

  // Auto sign-in when wallet connects (only once per connection)
  useEffect(() => {
    if (mounted && connected && !isAuthenticated && !isLoading && !hasAttemptedAutoSignIn) {
      setHasAttemptedAutoSignIn(true);
      signIn().catch((error) => {
        // If user cancels, disconnect wallet so they can try again
        console.log("Sign-in cancelled or failed:", error.message || error);
        disconnect();
      });
    }
  }, [mounted, connected, isAuthenticated, isLoading, hasAttemptedAutoSignIn, signIn, disconnect]);

  // Prevent hydration mismatch by not rendering wallet button on server
  if (!mounted) {
    return <div className="h-10 w-[140px] animate-pulse rounded-md bg-muted/50" />;
  }

  if (!connected) {
    return (
      <div className="wallet-button-small">
        <WalletMultiButton />
      </div>
    );
  }

  if (connected && !isAuthenticated && isLoading) {
    return (
      <Button disabled={true} size="sm">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Signing in...
      </Button>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="wallet-button-small">
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="wallet-button-small">
      <WalletMultiButton />
    </div>
  );
}
