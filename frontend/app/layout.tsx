import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { WalletProvider } from '@/context/WalletContext'
import { BountyProvider } from '@/context/BountyContext'
import { Toaster } from 'sonner'
import './globals.css'
import { AppKitProvider } from '@/context/appkit'

const geist = Geist({ subsets: ["latin"], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'MicroBounty - Decentralized Task Marketplace',
  description: 'Create and complete bounties on the Polkadot Hub with multi-currency support',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
      <AppKitProvider>
        <WalletProvider>
          <BountyProvider>
            {children}
            <Toaster />
          </BountyProvider>
        </WalletProvider>
        </AppKitProvider>
        <Analytics />
      </body>
    </html>
  )
}
