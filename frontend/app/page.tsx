'use client'

import { useEffect } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { BountyCard } from '@/components/features/BountyCard'
import { BountyFilters } from '@/components/features/BountyFilters'
import { useBounty } from '@/context/BountyContext'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function Home() {
  const { bounties, isLoading, fetchBounties, filters } = useBounty()

  useEffect(() => {
    fetchBounties({
      status: [],
      sortBy: 'recent',
    })
  }, [fetchBounties])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-br from-background via-background to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
                Decentralized <span className="text-primary">Bounty Marketplace</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-6 max-w-xl">
                Create tasks, find talent, and complete bounties on the Polkadot Hub with multi-currency support
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

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-primary">1.2M</div>
                <div className="text-xs text-muted-foreground">Total Value</div>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-primary">340</div>
                <div className="text-xs text-muted-foreground">Active Bounties</div>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-primary">1.8K</div>
                <div className="text-xs text-muted-foreground">Creators</div>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <div className="text-2xl font-bold text-primary">3.2K</div>
                <div className="text-xs text-muted-foreground">Workers</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <BountyFilters />
          </div>

          {/* Bounties Grid */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                {filters.search ? `Results for "${filters.search}"` : 'Available Bounties'}
              </h2>
              <p className="text-muted-foreground mt-1">
                {isLoading ? 'Loading...' : `${bounties.length} bounties found`}
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 bg-muted rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : bounties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bounties.map((bounty) => (
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

            {/* Pagination */}
            {bounties.length > 0 && (
              <div className="mt-12 flex justify-center gap-2">
                <Button variant="outline" disabled>
                  Previous
                </Button>
                <Button variant="outline">1</Button>
                <Button variant="outline">2</Button>
                <Button variant="outline">3</Button>
                <Button variant="outline">
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
