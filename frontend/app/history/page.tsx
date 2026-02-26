'use client'

import { useState, useMemo } from 'react'
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
import { AlertCircle, Download, ExternalLink, Copy, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ethers } from 'ethers'
import { NETWORKS, TOKENS, STATUS_COLORS } from '@/lib/constants'
import type { Transaction } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const TYPE_LABELS: Record<string, string> = {
  CREATE_BOUNTY:    'Created Bounty',
  SUBMIT_WORK:      'Submitted Work',
  APPROVE_BOUNTY:   'Approved Bounty',
  CANCEL_BOUNTY:    'Cancelled Bounty',
}

const TYPE_COLORS: Record<string, string> = {
  CREATE_BOUNTY:  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  SUBMIT_WORK:    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  APPROVE_BOUNTY: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  CANCEL_BOUNTY:  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  SUCCESS: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  FAILED:  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
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

function explorerTxUrl(hash: string): string {
  return `${NETWORKS.POLKADOT_HUB_TESTNET.explorerUrl}/tx/${hash}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { connected, address } = useWallet()
  const { transactions } = useBounty()

  const [search, setSearch]             = useState('')
  const [filterType, setFilterType]     = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [page, setPage]                 = useState(1)

  // ── Filter & paginate ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const q = search.toLowerCase()
      const matchesSearch =
        !q ||
        tx.hash.toLowerCase().includes(q) ||
        tx.bountyId?.includes(q)
      const matchesType   = filterType === 'all'   || tx.type   === filterType
      const matchesStatus = filterStatus === 'all' || tx.status === filterStatus

      return matchesSearch && matchesType && matchesStatus
    })
  }, [transactions, search, filterType, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── CSV export ─────────────────────────────────────────────────────────────

  const exportCSV = () => {
    const header = 'Hash,Type,Status,From,BountyId,Amount,Token,Timestamp,Block\n'
    const rows = filtered.map((tx) =>
      [
        tx.hash,
        tx.type,
        tx.status,
        tx.from,
        tx.bountyId ?? '',
        tx.amount ?? '',
        tx.token?.symbol ?? '',
        new Date(tx.timestamp).toISOString(),
        tx.blockNumber ?? '',
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
          <h1 className="text-4xl font-bold mb-2">Transaction History</h1>
          <p className="text-lg text-muted-foreground">
            All your bounty-related on-chain transactions
          </p>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by bounty ID or tx hash…"
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

            <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''} found
            </p>
            <Button variant="outline" className="gap-2" onClick={exportCSV} disabled={filtered.length === 0}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Transaction list */}
        {transactions.length === 0 ? (
          <Card className="p-12 text-center space-y-2">
            <p className="text-muted-foreground">
              No transactions yet. Create or interact with a bounty to see activity here.
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
                key={tx.hash}
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
  tx: Transaction
  onCopy: (text: string) => void
}) {
  const isPending = tx.status === 'PENDING'

  return (
    <Card className="p-4 hover:bg-muted/50 transition-colors">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">

        {/* Type & Status */}
        <div className="flex flex-col gap-2">
          <Badge className={TYPE_COLORS[tx.type] ?? TYPE_COLORS.CREATE_BOUNTY}>
            {TYPE_LABELS[tx.type] ?? tx.type}
          </Badge>
          <Badge className={STATUS_BADGE_COLORS[tx.status] ?? STATUS_BADGE_COLORS.FAILED}>
            {isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />}
            {tx.status}
          </Badge>
        </div>

        {/* Bounty link & hash */}
        <div className="md:col-span-2">
          {tx.bountyId && (
            <Link
              href={`/bounty/${tx.bountyId}`}
              className="text-primary hover:underline text-sm font-medium block mb-1"
            >
              Bounty #{tx.bountyId}
            </Link>
          )}
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-[10rem]">
              {tx.hash.slice(0, 14)}…
            </code>
            <button
              onClick={() => onCopy(tx.hash)}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
              title="Copy full hash"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
          {tx.amount && tx.amount !== '0' && tx.token ? (
            <>
              <div className="font-semibold text-primary">
                {formatAmount(tx.amount, tx.token.decimals)}
              </div>
              <div className="text-xs text-muted-foreground">
                {tx.token.logo} {tx.token.symbol}
              </div>
            </>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </div>

        {/* Date */}
        <div className="text-right">
          <div className="text-sm">{format(new Date(tx.timestamp), 'MMM dd, yyyy')}</div>
          <div className="text-xs text-muted-foreground">{format(new Date(tx.timestamp), 'HH:mm:ss')}</div>
          {tx.blockNumber && (
            <div className="text-xs text-muted-foreground">Block #{tx.blockNumber}</div>
          )}
        </div>

        {/* Explorer link */}
        <div className="flex justify-end">
          <a
            href={explorerTxUrl(tx.hash)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="ghost" size="sm" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">View</span>
            </Button>
          </a>
        </div>

      </div>
    </Card>
  )
}