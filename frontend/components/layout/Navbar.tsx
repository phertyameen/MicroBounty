'use client'

import Link from 'next/link'
import { useWallet } from '@/context/WalletContext'
import { Button } from '@/components/ui/button'
import { Zap, Menu, ChevronDown, Wallet } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

const truncateAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-3)}`

const navLinks = [
  { href: '/', label: 'Browse' },
  { href: '/create', label: 'Create Bounty' },
  { href: '/history', label: 'History' },
  { href: '/analytics', label: 'Analytics' },
]

// ── Wallet dropdown — extracted outside Navbar for stable identity ─────────────

interface WalletDropdownProps {
  address: string
  walletName: string | null
  pasBalance: { formatted: string } | null
  tokenBalances: Record<string, { symbol: string; formatted: string }>
  onDisconnect: () => void
  mobile?: boolean
}

function WalletDropdown({
  address,
  walletName,
  pasBalance,
  tokenBalances,
  onDisconnect,
  mobile = false,
}: WalletDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click — only active when dropdown is open
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className={mobile ? 'w-full' : 'relative'}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 transition-colors ${mobile ? 'w-full' : ''}`}
      >
        <Wallet className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div className="text-left flex-1">
          {walletName && (
            <p className="text-xs text-muted-foreground leading-none mb-0.5">{walletName}</p>
          )}
          <p className="text-sm font-mono text-accent-foreground leading-none">
            {truncateAddress(address)}
          </p>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Panel */}
      {open && (
        <div
          className={`
            ${mobile ? 'relative mt-1' : 'absolute right-0 top-full mt-1'}
            w-56 rounded-lg border border-border bg-popover shadow-lg z-50 p-3 space-y-3
          `}
        >
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Balances
            </p>

            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">PAS</span>
              <span className="font-medium font-mono">
                {pasBalance ? pasBalance.formatted : '—'}
              </span>
            </div>

            {Object.values(tokenBalances).map((tb) => (
              <div key={tb.symbol} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{tb.symbol}</span>
                <span className="font-medium font-mono">{tb.formatted}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-border pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setOpen(false)
                onDisconnect()
              }}
            >
              Disconnect
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Navbar ─────────────────────────────────────────────────────────────────────

export function Navbar() {
  const { connected, address, connect, disconnect, walletName, pasBalance, tokenBalances } =
    useWallet()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleDisconnect = () => {
    disconnect()
    setMobileMenuOpen(false)
  }

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

          {/* Desktop nav */}
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

          {/* Desktop wallet */}
          <div className="flex items-center gap-2">
            {connected && address ? (
              <div className="hidden md:block">
                <WalletDropdown
                  address={address}
                  walletName={walletName}
                  pasBalance={pasBalance}
                  tokenBalances={tokenBalances}
                  onDisconnect={handleDisconnect}
                />
              </div>
            ) : (
              <Button onClick={connect} size="sm" className="hidden md:inline-flex">
                Connect Wallet
              </Button>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg hover:bg-accent"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
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
                <WalletDropdown
                  address={address}
                  walletName={walletName}
                  pasBalance={pasBalance}
                  tokenBalances={tokenBalances}
                  onDisconnect={handleDisconnect}
                  mobile
                />
              ) : (
                <Button
                  onClick={() => { connect(); setMobileMenuOpen(false) }}
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