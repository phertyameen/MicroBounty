'use client'

import { useState } from 'react'
import { Bounty, BountyStatusIndex } from '@/lib/types'
import { useBounty } from '@/context/BountyContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { CheckCircle, ExternalLink, XCircle } from 'lucide-react'

interface ApproveBountyReviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bounty: Bounty
}

export function ApproveBountyReview({ open, onOpenChange, bounty }: ApproveBountyReviewProps) {
  const { approveBounty, isWritePending } = useBounty()

  // The contract only tracks one hunter per bounty — no submission list
  const hasSubmission = bounty.status === BountyStatusIndex.IN_PROGRESS &&
    bounty.hunter !== '0x0000000000000000000000000000000000000000'

  const handleApprove = async () => {
    const success = await approveBounty(bounty.id)
    if (success) {
      toast.success('Submission approved! Reward transferred to the hunter.')
      onOpenChange(false)
    } else {
      toast.error('Approval failed. Check your wallet and try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Submission</DialogTitle>
          <DialogDescription>
            Review the submitted work for "{bounty.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!hasSubmission ? (
            <p className="text-sm text-muted-foreground">
              No submission has been made yet. The bounty must be IN PROGRESS
              before you can approve.
            </p>
          ) : (
            <>
              {/* Hunter */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Submitted by</Label>
                <p className="font-mono text-sm break-all">{bounty.hunter}</p>
              </div>

              {/* Proof URL */}
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Proof of work</Label>
                <a
                  href={bounty.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
                >
                  {bounty.proofUrl}
                  <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                </a>
              </div>

              {/* Notes */}
              {bounty.submissionNotes && (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Hunter notes</Label>
                  <Card className="p-3 bg-muted/50">
                    <p className="text-sm">{bounty.submissionNotes}</p>
                  </Card>
                </div>
              )}

              {/* Warning */}
              <Card className="p-3 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Approving will immediately transfer the full reward on-chain.
                  This cannot be undone. Your wallet will prompt you to confirm.
                </p>
              </Card>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isWritePending}
            >
              Close
            </Button>
            {hasSubmission && (
              <Button
                onClick={handleApprove}
                disabled={isWritePending}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {isWritePending ? 'Processing...' : 'Approve & Pay'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}