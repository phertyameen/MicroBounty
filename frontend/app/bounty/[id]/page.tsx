'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { useBounty } from '@/context/BountyContext'
import { useWallet } from '@/context/WalletContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDistance, format } from 'date-fns'
import { Clock, Users, DollarSign, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { SubmitWorkModal } from '@/components/features/SubmitWorkModal'
import { ApproveBountyReview } from '@/components/features/ApproveBountyReview'
import { CancelBountyModal } from '@/components/features/CancelBountyModal'

export default function BountyDetail() {
  const params = useParams()
  const bountyId = params.id as string
  const { selectedBounty, fetchBountyById, isLoading } = useBounty()
  const { connected, address } = useWallet()
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  useEffect(() => {
    fetchBountyById(bountyId)
  }, [bountyId, fetchBountyById])

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

  if (!selectedBounty) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Bounty Not Found</h1>
            <p className="text-muted-foreground mb-6">This bounty doesn't exist or has been removed.</p>
            <Link href="/">
              <Button>Back to Browse</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const isCreator = address?.toLowerCase() === selectedBounty.creatorAddress.toLowerCase()
  const canSubmit = connected && !isCreator && selectedBounty.status === 'OPEN'
  const canApprove = isCreator && selectedBounty.status === 'UNDER_REVIEW'
  const canCancel = isCreator && (selectedBounty.status === 'OPEN' || selectedBounty.status === 'IN_PROGRESS')

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      OPEN: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
      IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
      UNDER_REVIEW: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
      COMPLETED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    }
    return colors[status] || colors.OPEN
  }

  const formatBudget = (budget: string, decimals: number) => {
    const value = BigInt(budget) / BigInt(10 ** decimals)
    return value.toString()
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* Breadcrumb */}
      <div className="border-b border-border bg-muted/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-primary hover:underline">Browse</Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground truncate">{selectedBounty.title}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-3xl font-bold">{selectedBounty.title}</h1>
                <Badge className={getStatusColor(selectedBounty.status)}>
                  {selectedBounty.status}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Created by {selectedBounty.creatorName || selectedBounty.creatorAddress.slice(0, 10)}...
              </p>
            </div>

            {/* Description */}
            <Card className="p-6">
              <h2 className="font-semibold mb-3">About this bounty</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{selectedBounty.description}</p>
            </Card>

            {/* Requirements */}
            <Card className="p-6">
              <h2 className="font-semibold mb-4">Requirements</h2>
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-sm mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedBounty.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Submissions Tab */}
            <Tabs defaultValue="submissions" className="space-y-4">
              <TabsList>
                <TabsTrigger value="submissions">
                  Submissions ({selectedBounty.submissionCount})
                </TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="submissions" className="space-y-4">
                {selectedBounty.submissionCount > 0 ? (
                  <div className="space-y-3">
                    {[...Array(selectedBounty.submissionCount)].map((_, i) => (
                      <Card key={i} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-medium">Submission #{i + 1}</div>
                            <p className="text-sm text-muted-foreground">Submitted 2 days ago</p>
                          </div>
                          <Badge variant="outline">Pending Review</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">No submissions yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <Card className="p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{format(new Date(selectedBounty.createdAt), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated</span>
                    <span>{formatDistance(new Date(selectedBounty.updatedAt), new Date(), { addSuffix: true })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span>{selectedBounty.category || 'Uncategorized'}</span>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-20 space-y-6">
              {/* Budget */}
              <div>
                <div className="text-sm text-muted-foreground mb-1">Budget</div>
                <div className="text-2xl font-bold text-primary flex items-center gap-2">
                  <DollarSign className="w-6 h-6" />
                  {formatBudget(selectedBounty.budget, selectedBounty.token.decimals)}
                </div>
                <div className="text-sm text-muted-foreground">{selectedBounty.token.symbol}</div>
              </div>

              {/* Deadline */}
              <div>
                <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Deadline
                </div>
                <div className="font-medium">
                  {format(new Date(selectedBounty.deadline), 'MMM dd, yyyy')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDistance(new Date(selectedBounty.deadline), new Date(), { addSuffix: true })}
                </div>
              </div>

              {/* Submissions */}
              <div>
                <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Submissions
                </div>
                <div className="font-medium">{selectedBounty.submissionCount}</div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-border">
                {!connected ? (
                  <div className="text-center py-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-3">Connect wallet to interact</p>
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
                      <Button onClick={() => setShowApproveModal(true)} variant="default" className="w-full">
                        Review Submissions
                      </Button>
                    )}

                    {canCancel && (
                      <Button onClick={() => setShowCancelModal(true)} variant="destructive" className="w-full">
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
      <SubmitWorkModal open={showSubmitModal} onOpenChange={setShowSubmitModal} bounty={selectedBounty} />
      {isCreator && <ApproveBountyReview open={showApproveModal} onOpenChange={setShowApproveModal} bounty={selectedBounty} />}
      {isCreator && <CancelBountyModal open={showCancelModal} onOpenChange={setShowCancelModal} bounty={selectedBounty} />}

      <Footer />
    </div>
  )
}
