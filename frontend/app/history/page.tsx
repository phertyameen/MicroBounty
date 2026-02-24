'use client'

import { useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useWallet } from '@/context/WalletContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle, Download, ExternalLink, Copy } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format } from 'date-fns'

const mockTransactions = [
  {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    type: 'CREATE_BOUNTY',
    status: 'SUCCESS',
    from: '0x1234567890123456789012345678901234567890',
    bountyId: '1',
    bountyTitle: 'Smart Contract Audit',
    amount: '5000000000',
    token: { symbol: 'USDC', decimals: 6 },
    timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    blockNumber: 123456,
  },
  {
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    type: 'SUBMIT_WORK',
    status: 'SUCCESS',
    from: '0x9876543210987654321098765432109876543210',
    bountyId: '2',
    bountyTitle: 'Frontend UI Design',
    amount: '0',
    token: { symbol: 'USDC', decimals: 6 },
    timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000,
    blockNumber: 123789,
  },
  {
    hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    type: 'APPROVE_SUBMISSION',
    status: 'SUCCESS',
    from: '0x1234567890123456789012345678901234567890',
    bountyId: '1',
    bountyTitle: 'Smart Contract Audit',
    amount: '5000000000',
    token: { symbol: 'USDC', decimals: 6 },
    timestamp: Date.now() - 12 * 60 * 60 * 1000,
    blockNumber: 124000,
  },
  {
    hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
    type: 'CANCEL_BOUNTY',
    status: 'SUCCESS',
    from: '0x1234567890123456789012345678901234567890',
    bountyId: '3',
    bountyTitle: 'Content Writing',
    amount: '1000000000',
    token: { symbol: 'USDC', decimals: 6 },
    timestamp: Date.now() - 6 * 60 * 60 * 1000,
    blockNumber: 124100,
  },
]

export default function HistoryPage() {
  const { connected, address } = useWallet()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const getTransactionTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      CREATE_BOUNTY: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      SUBMIT_WORK: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      APPROVE_SUBMISSION: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      CANCEL_BOUNTY: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
      CLAIM_REWARD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    }
    return colors[type] || colors.CREATE_BOUNTY
  }

  const getStatusColor = (status: string) => {
    return status === 'SUCCESS'
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      : status === 'PENDING'
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
  }

  const getTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      CREATE_BOUNTY: 'Created Bounty',
      SUBMIT_WORK: 'Submitted Work',
      APPROVE_SUBMISSION: 'Approved Submission',
      CANCEL_BOUNTY: 'Cancelled Bounty',
      CLAIM_REWARD: 'Claimed Reward',
    }
    return labels[type] || type
  }

  const filteredTransactions = mockTransactions.filter((tx) => {
    const matchesSearch = searchTerm === '' || tx.bountyTitle.toLowerCase().includes(searchTerm.toLowerCase()) || tx.hash.includes(searchTerm)
    const matchesType = filterType === 'all' || tx.type === filterType
    const matchesStatus = filterStatus === 'all' || tx.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <section className="border-b border-border bg-gradient-to-br from-background via-background to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-2">Transaction History</h1>
          <p className="text-lg text-muted-foreground">
            View all your bounty-related transactions on the blockchain
          </p>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by bounty title or tx hash..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CREATE_BOUNTY">Create Bounty</SelectItem>
                <SelectItem value="SUBMIT_WORK">Submit Work</SelectItem>
                <SelectItem value="APPROVE_SUBMISSION">Approve Submission</SelectItem>
                <SelectItem value="CANCEL_BOUNTY">Cancel Bounty</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="SUCCESS">Success</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
            </p>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Transactions Table */}
        {filteredTransactions.length > 0 ? (
          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <Card key={tx.hash} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
                  {/* Type & Status */}
                  <div className="space-y-2">
                    <Badge className={getTransactionTypeColor(tx.type)}>
                      {getTypeLabel(tx.type)}
                    </Badge>
                    <Badge className={getStatusColor(tx.status)}>
                      {tx.status}
                    </Badge>
                  </div>

                  {/* Bounty & Hash */}
                  <div className="md:col-span-2">
                    <div className="font-medium text-sm mb-1">
                      {tx.bountyId && (
                        <Link href={`/bounty/${tx.bountyId}`} className="text-primary hover:underline">
                          {tx.bountyTitle}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {tx.hash.slice(0, 12)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(tx.hash)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    {tx.amount !== '0' && (
                      <>
                        <div className="font-semibold text-primary">
                          {(BigInt(tx.amount) / BigInt(10 ** tx.token.decimals)).toString()}
                        </div>
                        <div className="text-xs text-muted-foreground">{tx.token.symbol}</div>
                      </>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-right">
                    <div className="text-sm">{format(new Date(tx.timestamp), 'MMM dd, yyyy')}</div>
                    <div className="text-xs text-muted-foreground">{format(new Date(tx.timestamp), 'HH:mm:ss')}</div>
                  </div>

                  {/* Explorer Link */}
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No transactions found</p>
          </Card>
        )}

        {/* Pagination */}
        {filteredTransactions.length > 0 && (
          <div className="mt-12 flex justify-center gap-2">
            <Button variant="outline" disabled>
              Previous
            </Button>
            <Button variant="outline">1</Button>
            <Button variant="outline">2</Button>
            <Button variant="outline">
              Next
            </Button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
