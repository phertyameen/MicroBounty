import Link from 'next/link'
import { Bounty, BountyStatusIndex, CATEGORY_LABELS } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistance } from 'date-fns'
import { Clock, Coins } from 'lucide-react'
import { STATUS_COLORS } from '@/lib/constants'
import { ethers } from 'ethers'

interface BountyCardProps {
  bounty: Bounty
}

// Map BountyStatusIndex number → display string
const STATUS_LABELS: Record<BountyStatusIndex, string> = {
  [BountyStatusIndex.OPEN]: 'OPEN',
  [BountyStatusIndex.IN_PROGRESS]: 'IN PROGRESS',
  [BountyStatusIndex.COMPLETED]: 'COMPLETED',
  [BountyStatusIndex.CANCELLED]: 'CANCELLED',
}

// Map BountyStatusIndex → STATUS_COLORS key
const STATUS_COLOR_MAP: Record<BountyStatusIndex, keyof typeof STATUS_COLORS> = {
  [BountyStatusIndex.OPEN]: 'OPEN',
  [BountyStatusIndex.IN_PROGRESS]: 'IN_PROGRESS',
  [BountyStatusIndex.COMPLETED]: 'COMPLETED',
  [BountyStatusIndex.CANCELLED]: 'CANCELLED',
}

export function BountyCard({ bounty }: BountyCardProps) {
  const createdAgo = formatDistance(new Date(bounty.createdAt * 1000), new Date(), {
    addSuffix: true,
  })

  const statusLabel = STATUS_LABELS[bounty.status] ?? 'OPEN'
  const statusColorKey = STATUS_COLOR_MAP[bounty.status] ?? 'OPEN'
  const categoryLabel = CATEGORY_LABELS[bounty.category] ?? 'Other'

  return (
    <Link href={`/bounty/${bounty.id}`}>
      <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group">
        <div className="p-6 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-start gap-2 mb-3">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 flex-1">
              {bounty.title}
            </h3>
            <Badge className={`whitespace-nowrap flex-shrink-0 ${STATUS_COLORS[statusColorKey]}`}>
              {statusLabel}
            </Badge>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {bounty.description}
          </p>

          {/* Category badge */}
          <div className="mb-4">
            <Badge variant="secondary" className="text-xs">
              {categoryLabel}
            </Badge>
          </div>

          {/* Footer */}
          <div className="border-t border-border pt-4 space-y-3">
            {/* Reward */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Reward</span>
              <span className="font-semibold text-primary flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                {ethers.formatUnits(bounty.reward, bounty.token.decimals)} {bounty.token.symbol}
              </span>
            </div>

            {/* Created & hunter */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{createdAgo}</span>
              </div>
              {bounty.hunter !== '0x0000000000000000000000000000000000000000' && (
                <span className="truncate">
                  Hunter: {bounty.hunter.slice(0, 6)}…{bounty.hunter.slice(-4)}
                </span>
              )}
            </div>

            {/* Creator */}
            <div className="text-xs text-muted-foreground truncate">
              by {bounty.creatorName ?? `${bounty.creator.slice(0, 6)}…${bounty.creator.slice(-4)}`}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}