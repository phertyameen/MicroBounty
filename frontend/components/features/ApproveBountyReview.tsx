'use client'

import { useState } from 'react'
import { Bounty } from '@/lib/types'
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react'

interface ApproveBountyReviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bounty: Bounty
}

export function ApproveBountyReview({ open, onOpenChange, bounty }: ApproveBountyReviewProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')

  const mockSubmissions = [
    {
      id: '1',
      workerName: 'Alice Dev',
      description: 'Complete implementation with tests',
      submittedAt: '2 days ago',
    },
    {
      id: '2',
      workerName: 'Bob Coder',
      description: 'Alternative approach using different pattern',
      submittedAt: '1 day ago',
    },
    {
      id: '3',
      workerName: 'Charlie Dev',
      description: 'Optimized version with better performance',
      submittedAt: '6 hours ago',
    },
  ]

  const handleApprove = async () => {
    if (!selectedSubmission) {
      toast.error('Please select a submission')
      return
    }

    setIsProcessing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success('Submission approved! Reward transferred.')
      setSelectedSubmission(null)
      setFeedback('')
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to approve submission')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedSubmission) {
      toast.error('Please select a submission')
      return
    }

    setIsProcessing(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      toast.success('Submission rejected.')
      setSelectedSubmission(null)
      setFeedback('')
    } catch (error) {
      toast.error('Failed to reject submission')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Submissions</DialogTitle>
          <DialogDescription>
            Review and approve/reject submissions for "{bounty.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Submissions List */}
          <div className="space-y-2">
            <Label className="text-base">Submissions ({mockSubmissions.length})</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {mockSubmissions.map((submission) => (
                <Card
                  key={submission.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedSubmission === submission.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedSubmission(submission.id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{submission.workerName}</div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {submission.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {submission.submittedAt}
                      </p>
                    </div>
                    {selectedSubmission === submission.id && (
                      <AlertCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {selectedSubmission && (
            <div className="space-y-2 pt-4 border-t border-border">
              <Label htmlFor="feedback">Feedback (optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Provide feedback to the worker..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Close
            </Button>
            {selectedSubmission && (
              <>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isProcessing ? 'Processing...' : 'Approve & Pay'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
