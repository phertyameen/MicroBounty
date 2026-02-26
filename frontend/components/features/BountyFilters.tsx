'use client'

import { useBounty } from '@/context/BountyContext'
import { BountyStatus, Category, CATEGORY_LABELS } from '@/lib/types'
import { TOKENS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { X } from 'lucide-react'
import { useState } from 'react'

export function BountyFilters() {
  const { updateFilters, clearFilters } = useBounty()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatuses, setSelectedStatuses] = useState<BountyStatus[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | undefined>(undefined)
  const [selectedToken, setSelectedToken] = useState<string | undefined>(undefined)
  // sortBy values match BountyFilters type — no 'budget-high/low', no 'deadline'
  const [sortBy, setSortBy] = useState<'recent' | 'reward-high' | 'reward-low' | 'oldest'>('recent')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleStatusChange = (status: BountyStatus, checked: boolean) => {
    const newStatuses = checked
      ? [...selectedStatuses, status]
      : selectedStatuses.filter((s) => s !== status)
    setSelectedStatuses(newStatuses)
    updateFilters({ status: newStatuses })
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    updateFilters({ search: value })
  }

  const handleSortChange = (value: string) => {
    const v = value as typeof sortBy
    setSortBy(v)
    updateFilters({ sortBy: v })
  }

  const handleCategoryChange = (value: string) => {
    const cat = value === 'all' ? undefined : Number(value) as Category
    setSelectedCategory(cat)
    updateFilters({ category: cat })
  }

  const handleTokenChange = (value: string) => {
    const token = value === 'all' ? undefined : value
    setSelectedToken(token)
    updateFilters({ paymentToken: token })
  }

  const handleClear = () => {
    setSearchTerm('')
    setSelectedStatuses([])
    setSelectedCategory(undefined)
    setSelectedToken(undefined)
    setSortBy('recent')
    clearFilters()
  }

  const hasActiveFilters =
    searchTerm ||
    selectedStatuses.length > 0 ||
    selectedCategory !== undefined ||
    selectedToken !== undefined ||
    sortBy !== 'recent'

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Search bounties..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1"
        />
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleClear}
            title="Clear filters"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="reward-high">Reward: High to Low</SelectItem>
            <SelectItem value="reward-low">Reward: Low to High</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full sm:w-auto"
        >
          {showAdvanced ? 'Hide' : 'Show'} Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card className="p-6 space-y-6">
          {/* Status */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Status</Label>
            <div className="space-y-2">
              {Object.values(BountyStatus).map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={selectedStatuses.includes(status)}
                    onCheckedChange={(checked) =>
                      handleStatusChange(status, checked as boolean)
                    }
                  />
                  <Label htmlFor={`status-${status}`} className="font-normal cursor-pointer">
                    {status.replace('_', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Category — maps to contract uint8 enum */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Category</Label>
            <Select
              value={selectedCategory !== undefined ? String(selectedCategory) : 'all'}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([index, label]) => (
                  <SelectItem key={index} value={index}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Token */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Payment Token</Label>
            <Select
              value={selectedToken ?? 'all'}
              onValueChange={handleTokenChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="All tokens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tokens</SelectItem>
                {Object.values(TOKENS).map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    {token.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}
    </div>
  )
}