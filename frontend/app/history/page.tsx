'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useWallet } from '@/context/WalletContext'
import { useBounty } from '@/context/BountyContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Download, ExternalLink, Copy, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ethers } from 'ethers'
import { NETWORKS } from '@/lib/constants'
import { BountyStatusIndex } from '@/lib/types'
import type { Bounty, Token } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type DerivedTxType = 'CREATE_BOUNTY' | 'SUBMIT_WORK' | 'APPROVE_BOUNTY' | 'CANCEL_BOUNTY'

interface DerivedTransaction {
  // Unique key for React — no real tx hash available from view calls
  key: string
  type: DerivedTxType
  bountyId: string
  bountyTitle: string
  amount: string
  token: Token
  timestamp: number
  // Role: did the connected wallet create or hunt this bounty?
  role: 'creator' | 'hunter'
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const TYPE_LABELS: Record<DerivedTxType, string> = {
  CREATE_BOUNTY:  'Created Bounty',
  SUBMIT_WORK:    'Submitted Work',
  APPROVE_BOUNTY: 'Approved Bounty',
  CANCEL_BOUNTY:  'Cancelled Bounty',
}

const TYPE_COLORS: Record<DerivedTxType, string> = {
  CREATE_BOUNTY:  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  SUBMIT_WORK:    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  APPROVE_BOUNTY: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  CANCEL_BOUNTY:  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: string, decimals: number): string {
  try {
    return parseFloat(ethers.formatUnits(amount, decimals)).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    })
  } catch {
    return '—'
  }
}

/**
 * Derive one or more DerivedTransaction rows from a single Bounty.
 * Each on-chain timestamp field that is non-zero becomes its own row.
 */
function deriveTxsFromBounty(bounty: Bounty, role: 'creator' | 'hunter'): DerivedTransaction[] {
  const rows: DerivedTransaction[] = []

  if (role === 'creator') {
    // Every bounty has a createdAt
    rows.push({
      key: `${bounty.id}-create`,
      type: 'CREATE_BOUNTY',
      bountyId: bounty.id,
      bountyTitle: bounty.title,
      amount: bounty.reward,
      token: bounty.token,
      timestamp: bounty.createdAt * 1000,
      role,
    })

    // Creator cancelled it — no dedicated cancelledAt on-chain, approximate with
    // submittedAt if a submission existed, otherwise createdAt + 1s
    if (bounty.status === BountyStatusIndex.CANCELLED) {
      rows.push({
        key: `${bounty.id}-cancel`,
        type: 'CANCEL_BOUNTY',
        bountyId: bounty.id,
        bountyTitle: bounty.title,
        amount: bounty.reward,
        token: bounty.token,
        timestamp: (bounty.submittedAt > 0 ? bounty.submittedAt : bounty.createdAt + 1) * 1000,
        role,
      })
    }

    // Creator approved the submission
    if (bounty.completedAt > 0) {
      rows.push({
        key: `${bounty.id}-approve`,
        type: 'APPROVE_BOUNTY',
        bountyId: bounty.id,
        bountyTitle: bounty.title,
        amount: bounty.reward,
        token: bounty.token,
        timestamp: bounty.completedAt * 1000,
        role,
      })
    }
  }

  // Hunter submitted work
  if (role === 'hunter' && bounty.submittedAt > 0) {
    rows.push({
      key: `${bounty.id}-submit`,
      type: 'SUBMIT_WORK',
      bountyId: bounty.id,
      bountyTitle: bounty.title,
      amount: bounty.reward,
      token: bounty.token,
      timestamp: bounty.submittedAt * 1000,
      role,
    })
  }

  return rows
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { connected, address } = useWallet()
  const { fetchBountiesByCreator, fetchUserSubmissions } = useBounty()

  const [allTxs, setAllTxs]         = useState<DerivedTransaction[]>([])
  const [isLoading, setIsLoading]   = useState(false)
  const [search, setSearch]         = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [page, setPage]             = useState(1)

  // ── Fetch & derive on mount / wallet change ────────────────────────────────

  const loadHistory = useCallback(async () => {
    if (!address) return
    setIsLoading(true)
    try {
      const [created, submitted] = await Promise.all([
        fetchBountiesByCreator(address),
        fetchUserSubmissions(address),
      ])

      // Deduplicate: skip bounties from `submitted` already covered by `created`
      const createdIds = new Set(created.map((b) => b.id))

      const creatorTxs = created.flatMap((b) => deriveTxsFromBounty(b, 'creator'))
      const hunterTxs  = submitted
        .filter((b) => !createdIds.has(b.id))
        .flatMap((b) => deriveTxsFromBounty(b, 'hunter'))

      const merged = [...creatorTxs, ...hunterTxs]
        .sort((a, b) => b.timestamp - a.timestamp)

      setAllTxs(merged)
    } catch (err) {
      toast.error('Failed to load transaction history')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [address, fetchBountiesByCreator, fetchUserSubmissions])

  useEffect(() => {
    if (connected && address) loadHistory()
  }, [connected, address, loadHistory])

  // ── Filter & paginate ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return allTxs.filter((tx) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        tx.bountyTitle.toLowerCase().includes(q) ||
        tx.bountyId.includes(q)
      const matchesType = filterType === 'all' || tx.type === filterType
      return matchesSearch && matchesType
    })
  }, [allTxs, search, filterType])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── CSV export ─────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const header = 'Type,BountyId,BountyTitle,Amount,Token,Role,Timestamp\n'
    const rows = filtered.map((tx) =>
      [
        tx.type,
        tx.bountyId,
        `"${tx.bountyTitle.replace(/"/g, '""')}"`,
        tx.amount,
        tx.token.symbol,
        tx.role,
        new Date(tx.timestamp).toISOString(),
      ].join(',')
    )
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'transactions.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // ── Not connected guard ────────────────────────────────────────────────────

  if (!connected) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <Card className="p-12 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto" />
            <h2 className="text-2xl font-bold">Wallet Not Connected</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Connect your wallet to view your transaction history.
            </p>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border bg-gradient-to-br from-background via-background to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Transaction History</h1>
              <p className="text-lg text-muted-foreground">
                All your bounty-related on-chain activity
              </p>
            </div>
            <Button
              variant="outline"
              className="gap-2 mt-1"
              onClick={loadHistory}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Search by bounty title or ID…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
            <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CREATE_BOUNTY">Create Bounty</SelectItem>
                <SelectItem value="SUBMIT_WORK">Submit Work</SelectItem>
                <SelectItem value="APPROVE_BOUNTY">Approve Bounty</SelectItem>
                <SelectItem value="CANCEL_BOUNTY">Cancel Bounty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? 'Loading…'
                : `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''} found`}
            </p>
            <Button
              variant="outline"
              className="gap-2"
              onClick={exportCSV}
              disabled={filtered.length === 0}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : allTxs.length === 0 ? (
          <Card className="p-12 text-center space-y-2">
            <p className="text-muted-foreground">
              No on-chain activity found for this wallet.
            </p>
            <Link href="/create">
              <Button className="mt-4">Create a Bounty</Button>
            </Link>
          </Card>
        ) : paginated.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No transactions match your filters.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginated.map((tx) => (
              <TransactionRow
                key={tx.key}
                tx={tx}
                onCopy={copyToClipboard}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                onClick={() => setPage(p)}
                className="w-9"
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({
  tx,
  onCopy,
}: {
  tx: DerivedTransaction
  onCopy: (text: string) => void
}) {
  return (
    <Card className="p-4 hover:bg-muted/50 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">

        {/* Type + role badges */}
        <div className="flex flex-col gap-2">
          <Badge className={TYPE_COLORS[tx.type]}>
            {TYPE_LABELS[tx.type]}
          </Badge>
          <Badge variant="outline" className="w-fit text-xs capitalize">
            {tx.role}
          </Badge>
        </div>

        {/* Bounty link & ID */}
        <div className="md:col-span-2">
          <Link
            href={`/bounty/${tx.bountyId}`}
            className="text-primary hover:underline text-sm font-medium block mb-1"
          >
            {tx.bountyTitle}
          </Link>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              Bounty #{tx.bountyId}
            </code>
            <button
              onClick={() => onCopy(tx.bountyId)}
              className="text-muted-foreground hover:text-foreground"
              title="Copy bounty ID"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
          <div className="font-semibold text-primary">
            {formatAmount(tx.amount, tx.token.decimals)}
          </div>
          <div className="text-xs text-muted-foreground">
            {tx.token.logo} {tx.token.symbol}
          </div>
        </div>

        {/* Date */}
        <div className="text-right">
          <div className="text-sm">{format(new Date(tx.timestamp), 'MMM dd, yyyy')}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(tx.timestamp), 'HH:mm:ss')}
          </div>
        </div>

      </div>
    </Card>
  )
}