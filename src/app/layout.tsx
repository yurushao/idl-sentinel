import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"
import { Analytics } from "@vercel/analytics/next"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "IDL Sentinel",
  description: "Monitor Solana program IDL changes in real-time",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  )
}
