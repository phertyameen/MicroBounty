'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useBounty, DOT_ADDRESS, CATEGORY_LABELS } from '@/context/BountyContext'
import { useWallet } from '@/context/WalletContext'
import { BountyStatusIndex } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDistance, format } from 'date-fns'
import { Clock, DollarSign, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { SubmitWorkModal } from '@/components/features/SubmitWorkModal'
import { ApproveBountyReview } from '@/components/features/ApproveBountyReview'
import { CancelBountyModal } from '@/components/features/CancelBountyModal'

// Maps BountyStatusIndex → display string + colour
const STATUS_META: Record<number, { label: string; className: string }> = {
  [BountyStatusIndex.OPEN]: {
    label: 'Open',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  },
  [BountyStatusIndex.IN_PROGRESS]: {
    label: 'In Progress',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  },
  [BountyStatusIndex.COMPLETED]: {
    label: 'Completed',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  },
  [BountyStatusIndex.CANCELLED]: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
  },
}

/** Format a raw reward bigint string using the token's decimals */
function formatReward(raw: string, decimals: number): string {
  try {
    return parseFloat(ethers.formatUnits(raw, decimals)).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    })
  } catch {
    return raw
  }
}

/** Shorten an address for display */
function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function BountyDetail() {
  const params = useParams()
  const bountyId = params.id as string

  const { selectedBounty, fetchBountyById, isLoading, error, submitWork, approveBounty, cancelBounty } = useBounty()
  const { connected, address } = useWallet()

  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  useEffect(() => {
    if (bountyId) fetchBountyById(bountyId)
  }, [bountyId, fetchBountyById])

  // ── Loading ────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-4 border-border border-t-primary animate-spin mx-auto mb-4" />
            <p>Loading bounty...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Error / not found ──────────────────────────────────────
  if (error || !selectedBounty) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Bounty Not Found</h1>
            <p className="text-muted-foreground mb-6">
              {error ?? "This bounty doesn't exist or has been removed."}
            </p>
            <Link href="/">
              <Button>Back to Browse</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Derived state ──────────────────────────────────────────
  const bounty = selectedBounty
  const statusMeta = STATUS_META[bounty.status] ?? STATUS_META[BountyStatusIndex.OPEN]
  const isNative = bounty.paymentToken === DOT_ADDRESS

  const isCreator = address?.toLowerCase() === bounty.creator.toLowerCase()
  const isHunter  = address?.toLowerCase() === bounty.hunter.toLowerCase()

  // Match contract logic exactly:
  // submitWork: status === OPEN and not creator
  const canSubmit  = connected && !isCreator && bounty.status === BountyStatusIndex.OPEN
  // approveBounty: creator + IN_PROGRESS
  const canApprove = connected && isCreator && bounty.status === BountyStatusIndex.IN_PROGRESS
  // cancelBounty: creator + OPEN only (contract reverts on anything else)
  const canCancel  = connected && isCreator && bounty.status === BountyStatusIndex.OPEN

  const createdDate   = new Date(bounty.createdAt * 1000)   // contract stores unix seconds
  const submittedDate = bounty.submittedAt ? new Date(bounty.submittedAt * 1000) : null
  const completedDate = bounty.completedAt ? new Date(bounty.completedAt * 1000) : null

  const categoryLabel = CATEGORY_LABELS[bounty.category] ?? 'Other'
  const formattedReward = formatReward(bounty.reward, bounty.token.decimals)
  const explorerBase = 'https://blockscout-testnet.polkadot.io'

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-primary hover:underline">Browse</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground truncate">{bounty.title}</span>
          </nav>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left column ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-3xl font-bold">{bounty.title}</h1>
                <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Created by{' '}
                <a
                  href={`${explorerBase}/address/${bounty.creator}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {shortAddr(bounty.creator)}
                  <ExternalLink className="w-3 h-3" />
                </a>
                {' · '}
                <span title={format(createdDate, 'PPpp')}>
                  {formatDistance(createdDate, new Date(), { addSuffix: true })}
                </span>
              </p>
            </div>

            {/* Description */}
            <Card className="p-6">
              <h2 className="font-semibold mb-3">About this bounty</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{bounty.description}</p>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="submission" className="space-y-4">
              <TabsList>
                <TabsTrigger value="submission">Submission</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              {/* Submission tab */}
              <TabsContent value="submission" className="space-y-4">
                {bounty.status === BountyStatusIndex.OPEN && (
                  <div className="text-center py-8 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">No submissions yet — be the first!</p>
                  </div>
                )}

                {bounty.status !== BountyStatusIndex.OPEN && bounty.hunter !== ethers.ZeroAddress && (
                  <Card className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="font-medium">
                          Hunter:{' '}
                          <a
                            href={`${explorerBase}/address/${bounty.hunter}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {shortAddr(bounty.hunter)}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        {submittedDate && (
                          <p className="text-sm text-muted-foreground">
                            Submitted {formatDistance(submittedDate, new Date(), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">{statusMeta.label}</Badge>
                    </div>

                    {bounty.proofUrl && (
                      <div>
                        <span className="text-sm font-medium">Proof: </span>
                        <a
                          href={bounty.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {bounty.proofUrl.length > 60
                            ? bounty.proofUrl.slice(0, 60) + '…'
                            : bounty.proofUrl}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}

                    {bounty.submissionNotes && (
                      <div>
                        <span className="text-sm font-medium">Notes: </span>
                        <span className="text-sm text-muted-foreground">{bounty.submissionNotes}</span>
                      </div>
                    )}
                  </Card>
                )}
              </TabsContent>

              {/* Details tab */}
              <TabsContent value="details">
                <Card className="p-6 space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bounty ID</span>
                    <span className="font-mono">#{bounty.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span>{categoryLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(createdDate, 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                  {submittedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Submitted</span>
                      <span>{format(submittedDate, 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  )}
                  {completedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span>{format(completedDate, 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment token</span>
                    {isNative ? (
                      <span>Native PAS</span>
                    ) : (
                      <a
                        href={`${explorerBase}/address/${bounty.paymentToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {bounty.token.symbol} ({shortAddr(bounty.paymentToken)})
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Sidebar ──────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-20 space-y-6">

              {/* Reward */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Reward</div>
                <div className="text-2xl font-bold text-primary flex items-center gap-2">
                  <DollarSign className="w-6 h-6" />
                  {formattedReward}
                </div>
                <div className="text-sm text-muted-foreground">{bounty.token.symbol}</div>
              </div>

              {/* Timeline */}
              <div>
                <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Timeline
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posted</span>
                    <span>{formatDistance(createdDate, new Date(), { addSuffix: true })}</span>
                  </div>
                  {submittedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Submitted</span>
                      <span>{formatDistance(submittedDate, new Date(), { addSuffix: true })}</span>
                    </div>
                  )}
                  {completedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span>{formatDistance(completedDate, new Date(), { addSuffix: true })}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-border">
                {!connected ? (
                  <div className="text-center py-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Connect wallet to interact</p>
                  </div>
                ) : (
                  <>
                    {canSubmit && (
                      <Button onClick={() => setShowSubmitModal(true)} className="w-full">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Submit Work
                      </Button>
                    )}
                    {canApprove && (
                      <Button onClick={() => setShowApproveModal(true)} className="w-full">
                        Approve &amp; Pay Hunter
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        onClick={() => setShowCancelModal(true)}
                        variant="destructive"
                        className="w-full"
                      >
                        Cancel Bounty
                      </Button>
                    )}
                    {!canSubmit && !canApprove && !canCancel && (
                      <div className="text-center py-4 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">No actions available</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>

        </div>
      </main>

      {/* Modals */}
      <SubmitWorkModal
        open={showSubmitModal}
        onOpenChange={setShowSubmitModal}
        bounty={bounty}
      />
      {isCreator && (
        <ApproveBountyReview
          open={showApproveModal}
          onOpenChange={setShowApproveModal}
          bounty={bounty}
        />
      )}
      {isCreator && (
        <CancelBountyModal
          open={showCancelModal}
          onOpenChange={setShowCancelModal}
          bounty={bounty}
        />
      )}

      <Footer />
    </div>
  )
}