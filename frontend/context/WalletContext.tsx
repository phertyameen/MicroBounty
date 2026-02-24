'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { WalletState } from '@/lib/types'

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  switchNetwork: (chainId: number) => Promise<void>
  updateBalance: (tokenId: string, balance: string) => void
}

const defaultWalletState: WalletState = {
  connected: false,
  address: null,
  chainId: null,
  balance: {},
  isLoading: false,
  error: null,
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(defaultWalletState)

  const connect = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      // Mock wallet connection
      // In real app, this would use ethers.js or web3.js to connect
      await new Promise((resolve) => setTimeout(resolve, 500))
      setState((prev) => ({
        ...prev,
        connected: true,
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        isLoading: false,
      }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
        isLoading: false,
      }))
    }
  }, [])

  const disconnect = useCallback(() => {
    setState(defaultWalletState)
  }, [])

  const switchNetwork = useCallback(async (chainId: number) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setState((prev) => ({ ...prev, chainId, isLoading: false }))
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to switch network',
        isLoading: false,
      }))
    }
  }, [])

  const updateBalance = useCallback((tokenId: string, balance: string) => {
    setState((prev) => ({
      ...prev,
      balance: { ...prev.balance, [tokenId]: balance },
    }))
  }, [])

  const value: WalletContextType = {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    updateBalance,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
