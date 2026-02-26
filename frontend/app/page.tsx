'use client'

import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { BountyCard } from '@/components/features/BountyCard'
import { BountyFilters } from '@/components/features/BountyFilters'
import { useBounty } from '@/context/BountyContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { ethers } from 'ethers'

const PAGE_SIZE = 6

export default function Home() {
  const {
    bounties,
    isLoading,
    fetchBounties,
    fetchPlatformStats,
    filters,
    platformStats,
  } = useBounty()

  const [page, setPage] = useState(1)

  // Fetch bounties + platform stats on mount
  useEffect(() => {
    fetchBounties({ status: [], sortBy: 'recent' })
    fetchPlatformStats()
  }, [fetchBounties, fetchPlatformStats])

  // Reset to page 1 whenever the bounty list changes (filter applied)
  useEffect(() => {
    setPage(1)
  }, [bounties.length, filters])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(bounties.length / PAGE_SIZE))
  const paginated = bounties.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Derive stats from platformStats (all values are raw bigint strings)
  const totalValueDOT = platformStats
    ? parseFloat(ethers.formatUnits(platformStats.totalPaidOutDOT, 10)) +
      parseFloat(ethers.formatUnits(platformStats.totalValueLockedDOT, 10))
    : 0

  const formatStatValue = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toFixed(2)
  }

  const stats = [
    {
      value: platformStats ? `${formatStatValue(totalValueDOT)} PAS` : '—',
      label: 'Total Value',
    },
    {
      value: platformStats ? platformStats.activeBounties.toString() : '—',
      label: 'Active Bounties',
    },
    {
      value: platformStats ? platformStats.totalBounties.toString() : '—',
      label: 'Total Bounties',
    },
    {
      value: platformStats ? platformStats.completedBounties.toString() : '—',
      label: 'Completed',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="border-b border-border bg-gradient-to-br from-background via-background to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                Decentralized <span className="text-primary">Bounty Marketplace</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-6 max-w-xl">
                Create tasks, find talent, and complete bounties on the Polkadot Hub
                with multi-currency support
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/create">
                  <Button size="lg" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Bounty
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </div>
            </div>

            {/* Live stats */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              {stats.map((s) => (
                <div key={s.label} className="bg-card rounded-lg border border-border p-4">
                  <div className="text-2xl font-bold text-primary">
                    {platformStats === null ? (
                      <span className="inline-block w-16 h-6 bg-muted animate-pulse rounded" />
                    ) : (
                      s.value
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Filters sidebar */}
          <div className="lg:col-span-1">
            <BountyFilters />
          </div>

          {/* Bounty grid */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                {filters.search
                  ? `Results for "${filters.search}"`
                  : 'Available Bounties'}
              </h2>
              <p className="text-muted-foreground mt-1">
                {isLoading
                  ? 'Loading...'
                  : `${bounties.length} ${bounties.length === 1 ? 'bounty' : 'bounties'} found`}
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(PAGE_SIZE)].map((_, i) => (
                  <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
                ))}
              </div>
            ) : paginated.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginated.map((bounty) => (
                  <BountyCard key={bounty.id} bounty={bounty} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <p className="text-muted-foreground mb-4">No bounties found</p>
                <Link href="/create">
                  <Button>Create the first bounty</Button>
                </Link>
              </div>
            )}

            {/* Pagination — only shown when there are multiple pages */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? 'default' : 'outline'}
                    onClick={() => setPage(p)}
                    className="w-9"
                  >
                    {p}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}