/**
 * Freighter wallet integration.
 *
 * Freighter is the official Stellar browser extension wallet.
 * Docs: https://docs.freighter.app/
 *
 * This module wraps the window.freighter API with typed helpers and
 * graceful fallbacks when the extension is not installed.
 */

import type { StellarNetwork } from '@/types/stellar'
import { NETWORKS } from '@/types/stellar'

// Freighter injects window.freighter — we type just what we need
interface FreighterAPI {
  isConnected(): Promise<boolean>
  getPublicKey(): Promise<string>
  getNetwork(): Promise<string>
  getNetworkDetails(): Promise<{ networkPassphrase: string; networkUrl: string }>
  signTransaction(xdr: string, opts?: { network?: string; networkPassphrase?: string }): Promise<string>
}

function getFreighter(): FreighterAPI | null {
  if (typeof window === 'undefined') return null
  return (window as Window & { freighter?: FreighterAPI }).freighter ?? null
}

export function isFreighterInstalled(): boolean {
  return getFreighter() !== null
}

export async function connectFreighter(): Promise<string | null> {
  const freighter = getFreighter()
  if (!freighter) return null

  try {
    const connected = await freighter.isConnected()
    if (!connected) return null
    return await freighter.getPublicKey()
  } catch {
    return null
  }
}

export async function getFreighterNetwork(): Promise<StellarNetwork | null> {
  const freighter = getFreighter()
  if (!freighter) return null

  try {
    const details = await freighter.getNetworkDetails()
    const passphrase = details.networkPassphrase

    const match = Object.values(NETWORKS).find(
      n => n.networkPassphrase === passphrase,
    )
    return match ?? NETWORKS.testnet
  } catch {
    return null
  }
}

export async function signTransaction(
  xdr: string,
  network: StellarNetwork,
): Promise<string | null> {
  const freighter = getFreighter()
  if (!freighter) return null

  try {
    return await freighter.signTransaction(xdr, {
      networkPassphrase: network.networkPassphrase,
    })
  } catch {
    return null
  }
}

export async function getFreighterNetworkPassphrase(): Promise<string | null> {
  const freighter = getFreighter()
  if (!freighter) return null

  try {
    const details = await freighter.getNetworkDetails()
    return details.networkPassphrase
  } catch {
    return null
  }
}
