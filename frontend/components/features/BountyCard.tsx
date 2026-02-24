import Link from 'next/link'
import { Bounty } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistance } from 'date-fns'
import { Clock, Users } from 'lucide-react'

interface BountyCardProps {
  bounty: Bounty
}

export function BountyCard({ bounty }: BountyCardProps) {
  const formatBudget = (budget: string, decimals: number) => {
    const value = BigInt(budget) / BigInt(10 ** decimals)
    return value.toString()
  }

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

  const timeUntilDeadline = formatDistance(new Date(bounty.deadline), new Date(), {
    addSuffix: true,
  })

  return (
    <Link href={`/bounty/${bounty.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group">
        <div className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-start gap-2 mb-3">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
              {bounty.title}
            </h3>
            <Badge className={`whitespace-nowrap flex-shrink-0 ${getStatusColor(bounty.status)}`}>
              {bounty.status}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {bounty.description}
          </p>

          {/* Skills */}
          <div className="flex flex-wrap gap-1 mb-4">
            {bounty.skills.slice(0, 2).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {bounty.skills.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{bounty.skills.length - 2}
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border pt-4 space-y-3">
            {/* Budget */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Budget</span>
              <span className="font-semibold text-primary">
                {formatBudget(bounty.budget, bounty.token.decimals)} {bounty.token.symbol}
              </span>
            </div>

            {/* Deadline & Submissions */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{timeUntilDeadline}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{bounty.submissionCount} submissions</span>
              </div>
            </div>

            {/* Creator */}
            <div className="text-xs text-muted-foreground truncate">
              by {bounty.creatorName || bounty.creatorAddress.slice(0, 10)}...
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
