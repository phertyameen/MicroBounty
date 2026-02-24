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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'

interface SubmitWorkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bounty: Bounty
}

export function SubmitWorkModal({ open, onOpenChange, bounty }: SubmitWorkModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    attachmentUrl: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.description.trim()) {
      toast.error('Please provide a description')
      return
    }

    setIsSubmitting(true)
    try {
      // Mock submission
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast.success('Work submitted successfully! Waiting for creator review.')
      setFormData({ description: '', attachmentUrl: '' })
      onOpenChange(false)
    } catch (error) {
      toast.error('Failed to submit work')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Work</DialogTitle>
          <DialogDescription>
            Submit your work for "{bounty.title}"
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your work, approach, and deliverables..."
              value={formData.description}
              onChange={handleChange}
              rows={5}
            />
          </div>

          {/* Attachment */}
          <div className="space-y-2">
            <Label htmlFor="attachmentUrl">Attachment URL (optional)</Label>
            <Input
              id="attachmentUrl"
              name="attachmentUrl"
              type="url"
              placeholder="https://example.com/your-work"
              value={formData.attachmentUrl}
              onChange={handleChange}
            />
          </div>

          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex gap-3">
            <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              The bounty creator will review your submission. You'll receive feedback within 7 days.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Work'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
