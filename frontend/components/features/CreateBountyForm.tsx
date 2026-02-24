'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Button as ButtonComponent } from '@/components/ui/button'
import { TOKENS, AVAILABLE_SKILLS, BOUNTY_CATEGORIES } from '@/lib/constants'
import { toast } from 'sonner'
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

interface CreateBountyFormProps {
  onSuccess?: () => void
}

export function CreateBountyForm({ onSuccess }: CreateBountyFormProps) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    budget: '',
    tokenId: 'usdc',
    deadline: '',
    skills: [] as string[],
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSkillToggle = (skill: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      skills: checked
        ? [...prev.skills, skill]
        : prev.skills.filter((s) => s !== skill),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!formData.description.trim()) {
      toast.error('Description is required')
      return
    }
    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      toast.error('Budget must be greater than 0')
      return
    }
    if (!formData.deadline) {
      toast.error('Deadline is required')
      return
    }
    if (formData.skills.length === 0) {
      toast.error('Select at least one skill')
      return
    }

    setIsSubmitting(true)
    try {
      // Mock submission
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast.success('Bounty created successfully!')
      setFormData({
        title: '',
        description: '',
        category: '',
        budget: '',
        tokenId: 'usdc',
        deadline: '',
        skills: [],
      })
      setStep(1)
      onSuccess?.()
    } catch (error) {
      toast.error('Failed to create bounty')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canProceedStep1 = formData.title && formData.description && formData.category
  const canProceedStep2 = formData.budget && formData.tokenId && formData.deadline
  const canSubmit = canProceedStep1 && canProceedStep2 && formData.skills.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Step Indicator */}
      <div className="flex gap-2 justify-center">
        <div
          className={`h-2 w-12 rounded-full transition-colors ${
            step >= 1 ? 'bg-primary' : 'bg-muted'
          }`}
        />
        <div
          className={`h-2 w-12 rounded-full transition-colors ${
            step >= 2 ? 'bg-primary' : 'bg-muted'
          }`}
        />
        <div
          className={`h-2 w-12 rounded-full transition-colors ${
            step >= 3 ? 'bg-primary' : 'bg-muted'
          }`}
        />
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Basic Information</h2>
            <p className="text-muted-foreground">Tell us about your bounty</p>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Bounty Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Smart Contract Security Audit"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Detailed description of what needs to be done..."
                value={formData.description}
                onChange={handleChange}
                rows={6}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {BOUNTY_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Budget & Timeline */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Budget & Timeline</h2>
            <p className="text-muted-foreground">Set the budget and deadline</p>
          </div>

          <div className="space-y-4">
            {/* Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget Amount</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  placeholder="1000"
                  value={formData.budget}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                />
              </div>

              {/* Token */}
              <div className="space-y-2">
                <Label htmlFor="tokenId">Token</Label>
                <Select value={formData.tokenId} onValueChange={(value) => setFormData((prev) => ({ ...prev, tokenId: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TOKENS).map(([key, token]) => (
                      <SelectItem key={token.id} value={token.id}>
                        {token.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Deadline */}
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                value={formData.deadline}
                onChange={handleChange}
              />
            </div>

            {/* Info */}
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  A {5}% platform fee will be deducted from the budget
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Step 3: Skills & Review */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Required Skills</h2>
            <p className="text-muted-foreground">Select at least one skill</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_SKILLS.map((skill) => (
                <div key={skill} className="flex items-center space-x-2">
                  <Checkbox
                    id={`skill-${skill}`}
                    checked={formData.skills.includes(skill)}
                    onCheckedChange={(checked) =>
                      handleSkillToggle(skill, checked as boolean)
                    }
                  />
                  <Label htmlFor={`skill-${skill}`} className="font-normal cursor-pointer">
                    {skill}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <Card className="p-6 space-y-4 bg-muted/50">
            <h3 className="font-semibold">Bounty Preview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Title:</span>
                <span className="font-medium">{formData.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget:</span>
                <span className="font-medium">
                  {formData.budget} {TOKENS[formData.tokenId]?.symbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deadline:</span>
                <span className="font-medium">{formData.deadline}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skills:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="space-x-2">
          {step < 3 ? (
            <Button
              type="button"
              onClick={() => {
                if (step === 1 && !canProceedStep1) {
                  toast.error('Please fill in all required fields')
                  return
                }
                if (step === 2 && !canProceedStep2) {
                  toast.error('Please fill in all required fields')
                  return
                }
                setStep((s) => Math.min(3, s + 1))
              }}
              className="gap-2"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Bounty'}
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}
