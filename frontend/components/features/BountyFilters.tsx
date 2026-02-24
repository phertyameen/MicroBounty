'use client'

import { useBounty } from '@/context/BountyContext'
import { BountyStatus } from '@/lib/types'
import { AVAILABLE_SKILLS, TOKENS } from '@/lib/constants'
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
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'recent' | 'budget-high' | 'budget-low' | 'deadline'>('recent')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleStatusChange = (status: BountyStatus, checked: boolean) => {
    const newStatuses = checked
      ? [...selectedStatuses, status]
      : selectedStatuses.filter((s) => s !== status)
    setSelectedStatuses(newStatuses)
    updateFilters({ status: newStatuses })
  }

  const handleSkillChange = (skill: string, checked: boolean) => {
    const newSkills = checked
      ? [...selectedSkills, skill]
      : selectedSkills.filter((s) => s !== skill)
    setSelectedSkills(newSkills)
    updateFilters({ skills: newSkills })
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    updateFilters({ search: value })
  }

  const handleSortChange = (value: string) => {
    setSortBy(value as typeof sortBy)
    updateFilters({ sortBy: value as typeof sortBy })
  }

  const handleClear = () => {
    setSearchTerm('')
    setSelectedStatuses([])
    setSelectedSkills([])
    setSortBy('recent')
    clearFilters()
  }

  const hasActiveFilters = searchTerm || selectedStatuses.length > 0 || selectedSkills.length > 0 || sortBy !== 'recent'

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

      {/* Sort & Display Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={sortBy} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="budget-high">Budget: High to Low</SelectItem>
            <SelectItem value="budget-low">Budget: Low to High</SelectItem>
            <SelectItem value="deadline">Deadline Soon</SelectItem>
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
          {/* Status Filter */}
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
                    {status}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Skills Filter */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Skills</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_SKILLS.map((skill) => (
                <div key={skill} className="flex items-center space-x-2">
                  <Checkbox
                    id={`skill-${skill}`}
                    checked={selectedSkills.includes(skill)}
                    onCheckedChange={(checked) =>
                      handleSkillChange(skill, checked as boolean)
                    }
                  />
                  <Label htmlFor={`skill-${skill}`} className="font-normal cursor-pointer text-sm">
                    {skill}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
