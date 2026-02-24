'use client'

import Link from 'next/link'
import { useWallet } from '@/context/WalletContext'
import { Button } from '@/components/ui/button'
import { Zap, Menu } from 'lucide-react'
import { useState } from 'react'

export function Navbar() {
  const { connected, address, connect, disconnect } = useWallet()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const navLinks = [
    { href: '/', label: 'Browse' },
    { href: '/create', label: 'Create Bounty' },
    { href: '/history', label: 'History' },
    { href: '/analytics', label: 'Analytics' },
  ]

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <Zap className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline">MicroBounty</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Wallet Button & Mobile Menu */}
          <div className="flex items-center gap-2">
            {connected && address ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-lg bg-accent text-sm font-mono text-accent-foreground">
                  {truncateAddress(address)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnect}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                onClick={connect}
                size="sm"
                className="hidden md:inline-flex"
              >
                Connect Wallet
              </Button>
            )}

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-accent"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-border">
              {connected && address ? (
                <>
                  <div className="px-3 py-2 text-sm font-mono bg-accent rounded-md text-accent-foreground mb-2">
                    {truncateAddress(address)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      disconnect()
                      setMobileMenuOpen(false)
                    }}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    connect()
                    setMobileMenuOpen(false)
                  }}
                  size="sm"
                  className="w-full"
                >
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
