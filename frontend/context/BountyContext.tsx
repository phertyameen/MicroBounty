'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { Bounty, BountyFilters } from '@/lib/types'

interface BountyContextType {
  bounties: Bounty[]
  selectedBounty: Bounty | null
  filters: BountyFilters
  isLoading: boolean
  error: string | null
  fetchBounties: (filters: BountyFilters) => Promise<void>
  fetchBountyById: (id: string) => Promise<void>
  selectBounty: (bounty: Bounty | null) => void
  addBounty: (bounty: Bounty) => void
  updateFilters: (filters: Partial<BountyFilters>) => void
  clearFilters: () => void
}

const defaultFilters: BountyFilters = {
  status: [],
  sortBy: 'recent',
}

const BountyContext = createContext<BountyContextType | undefined>(undefined)

export function BountyProvider({ children }: { children: React.ReactNode }) {
  const [bounties, setBounties] = useState<Bounty[]>([])
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null)
  const [filters, setFilters] = useState<BountyFilters>(defaultFilters)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBounties = useCallback(async (filterParams: BountyFilters) => {
    setIsLoading(true)
    setError(null)
    try {
      // Mock data fetch - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 800))

      // Mock bounties data
      const mockBounties: Bounty[] = [
        {
          id: '1',
          title: 'Smart Contract Audit',
          description: 'Comprehensive security audit for our token contract',
          status: 'OPEN',
          creatorAddress: '0xCreatorAddress1',
          creatorName: 'Alice',
          budget: '5000000000', // 5 USDC in wei
          token: { id: 'usdc', symbol: 'USDC', address: '0x...', decimals: 6, chainId: 1 },
          skills: ['Smart Contracts', 'Security Audit'],
          deadline: Date.now() + 30 * 24 * 60 * 60 * 1000,
          createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now(),
          submissionCount: 3,
          category: 'Development',
        },
        {
          id: '2',
          title: 'Frontend UI Design',
          description: 'Design modern UI for our DeFi application',
          status: 'OPEN',
          creatorAddress: '0xCreatorAddress2',
          creatorName: 'Bob',
          budget: '2000000000', // 2 USDC in wei
          token: { id: 'usdc', symbol: 'USDC', address: '0x...', decimals: 6, chainId: 1 },
          skills: ['UI/UX Design', 'Frontend Development'],
          deadline: Date.now() + 14 * 24 * 60 * 60 * 1000,
          createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now(),
          submissionCount: 5,
          category: 'Design',
        },
        {
          id: '3',
          title: 'API Documentation',
          description: 'Complete API documentation for REST endpoints',
          status: 'IN_PROGRESS',
          creatorAddress: '0xCreatorAddress3',
          creatorName: 'Charlie',
          budget: '1500000000', // 1.5 USDC in wei
          token: { id: 'usdc', symbol: 'USDC', address: '0x...', decimals: 6, chainId: 1 },
          skills: ['Documentation', 'API Development'],
          deadline: Date.now() + 7 * 24 * 60 * 60 * 1000,
          createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now(),
          submissionCount: 2,
          category: 'Documentation',
        },
      ]

      setBounties(mockBounties)
      setFilters(filterParams)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bounties')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchBountyById = useCallback(async (id: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      const bounty = bounties.find((b) => b.id === id)
      if (bounty) {
        setSelectedBounty(bounty)
      } else {
        setError('Bounty not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bounty')
    } finally {
      setIsLoading(false)
    }
  }, [bounties])

  const selectBounty = useCallback((bounty: Bounty | null) => {
    setSelectedBounty(bounty)
  }, [])

  const addBounty = useCallback((bounty: Bounty) => {
    setBounties((prev) => [bounty, ...prev])
  }, [])

  const updateFilters = useCallback((newFilters: Partial<BountyFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  const value: BountyContextType = {
    bounties,
    selectedBounty,
    filters,
    isLoading,
    error,
    fetchBounties,
    fetchBountyById,
    selectBounty,
    addBounty,
    updateFilters,
    clearFilters,
  }

  return (
    <BountyContext.Provider value={value}>
      {children}
    </BountyContext.Provider>
  )
}

export function useBounty() {
  const context = useContext(BountyContext)
  if (context === undefined) {
    throw new Error('useBounty must be used within a BountyProvider')
  }
  return context
}
