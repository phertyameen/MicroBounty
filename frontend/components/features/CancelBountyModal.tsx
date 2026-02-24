'use client'

import { useState } from 'react'
import { Bounty } from '@/lib/types'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'

interface CancelBountyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bounty: Bounty
}

export function CancelBountyModal({ open, onOpenChange, bounty }: CancelBountyModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCancel = async () => {
    setIsProcessing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success('Bounty cancelled successfully. Funds refunded.')
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to cancel bounty')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <AlertDialogTitle>Cancel Bounty?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Cancelling this bounty will:
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Refund the full budget to your wallet</li>
                  <li>Reject all pending submissions</li>
                  <li>Make the bounty unavailable for new submissions</li>
                </ul>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4">
          <p className="text-sm font-medium text-destructive">
            This action cannot be undone.
          </p>
        </div>

        <div className="flex gap-2 justify-end pt-4">
          <AlertDialogCancel disabled={isProcessing}>
            Keep Bounty
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={isProcessing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing ? 'Cancelling...' : 'Yes, Cancel Bounty'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
