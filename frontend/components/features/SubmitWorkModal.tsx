'use client'

import { useState } from 'react'
import { Bounty } from '@/lib/types'
import { useBounty } from '@/context/BountyContext'
import { SUBMISSION_NOTES_MAX_LENGTH } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { AlertCircle, Loader2 } from 'lucide-react'

interface SubmitWorkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bounty: Bounty
}

type SubmitStep = 'idle' | 'waiting-wallet' | 'mining'

export function SubmitWorkModal({ open, onOpenChange, bounty }: SubmitWorkModalProps) {
  const { submitWork } = useBounty()
  const [step, setStep] = useState<SubmitStep>('idle')
  const [formData, setFormData] = useState({
    proofUrl: '',
    notes: '',
  })

  const isPending = step !== 'idle'

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.proofUrl.trim()) {
      toast.error('A proof URL is required (e.g. GitHub PR, live demo)')
      return
    }

    if (formData.notes.length > SUBMISSION_NOTES_MAX_LENGTH) {
      toast.error(`Notes must be ${SUBMISSION_NOTES_MAX_LENGTH} characters or fewer`)
      return
    }

    try {
      setStep('waiting-wallet')
      toast.info('Check your wallet to confirm the submission.')

      const success = await submitWork({
        bountyId: bounty.id,
        proofUrl: formData.proofUrl.trim(),
        notes: formData.notes.trim(),
      })

      if (success) {
        toast.success('Work submitted! Waiting for the creator to review.')
        setFormData({ proofUrl: '', notes: '' })
        onOpenChange(false)
      } else {
        setStep('idle')
        toast.error('Submission failed. Check your wallet and try again.')
      }
    } catch (err) {
      setStep('idle')
      toast.error(err instanceof Error ? err.message : 'Submission failed unexpectedly.')
    }
  }

  const buttonLabel = () => {
    if (step === 'waiting-wallet') return 'Confirm in wallet…'
    if (step === 'mining')         return 'Submitting on-chain…'
    return 'Submit Work'
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (isPending) return
        onOpenChange(val)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Work</DialogTitle>
          <DialogDescription>
            Submit your proof of work for "{bounty.title}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Proof URL */}
          <div className="space-y-2">
            <Label htmlFor="proofUrl">
              Proof URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="proofUrl"
              name="proofUrl"
              type="url"
              placeholder="https://github.com/you/repo/pull/1"
              value={formData.proofUrl}
              onChange={handleChange}
              disabled={isPending}
              required
            />
            <p className="text-xs text-muted-foreground">
              Link to your deliverable — GitHub PR, live demo, Figma file, etc.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes{' '}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Briefly describe your approach or any context for the reviewer..."
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              maxLength={SUBMISSION_NOTES_MAX_LENGTH}
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.notes.length}/{SUBMISSION_NOTES_MAX_LENGTH}
            </p>
          </div>

          {/* Info / status card — swaps when pending */}
          {isPending ? (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-3">
              <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {step === 'waiting-wallet'
                  ? 'Waiting for wallet confirmation…'
                  : 'Transaction submitted, waiting for confirmation…'}
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-3">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Your wallet will prompt you to sign this transaction. Once submitted,
                the bounty moves to IN PROGRESS and only the creator can approve or
                cancel.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="gap-2">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {buttonLabel()}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}