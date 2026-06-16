import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import WalletConnect from './WalletConnect'

// ── module mocks ──────────────────────────────────────────────────────────────

vi.mock('@/lib/wallet', () => ({
  isFreighterInstalled: vi.fn(),
}))

vi.mock('@/lib/WalletContext', () => ({
  useWallet: vi.fn(),
}))

vi.mock('@/components/ContractIdBadge', () => ({
  default: ({ id }: { id: string }) => <span data-testid="contract-id-badge">{id}</span>,
}))

// ── helpers ───────────────────────────────────────────────────────────────────

import { isFreighterInstalled } from '@/lib/wallet'
import { useWallet } from '@/lib/WalletContext'

const mockIsFreighterInstalled = vi.mocked(isFreighterInstalled)
const mockUseWallet = vi.mocked(useWallet)

const testNetwork = { name: 'testnet' as const, networkPassphrase: '', horizonUrl: '', sorobanRpcUrl: '' }

beforeEach(() => {
  vi.clearAllMocks()
  mockUseWallet.mockReturnValue({
    publicKey: null,
    network: testNetwork,
    connect: vi.fn().mockResolvedValue(null),
    disconnect: vi.fn(),
  })
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('WalletConnect — Freighter not installed', () => {
  beforeEach(() => {
    mockIsFreighterInstalled.mockReturnValue(false)
  })

  it('renders an "Install Freighter" link', () => {
    render(<WalletConnect />)
    const link = screen.getByRole('link', { name: /install freighter/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://freighter.app')
  })

  it('opens the link in a new tab', () => {
    render(<WalletConnect />)
    expect(screen.getByRole('link')).toHaveAttribute('target', '_blank')
  })

  it('does not render a connect button', () => {
    render(<WalletConnect />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('WalletConnect — connected state', () => {
  const publicKey = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTU'
  const disconnect = vi.fn()

  beforeEach(() => {
    mockIsFreighterInstalled.mockReturnValue(true)
    mockUseWallet.mockReturnValue({
      publicKey,
      network: { name: 'mainnet' as const, networkPassphrase: '', horizonUrl: '', sorobanRpcUrl: '' },
      disconnect,
      connect: vi.fn(),
    })
  })

  it('displays the public key via ContractIdBadge', () => {
    render(<WalletConnect />)
    expect(screen.getByTestId('contract-id-badge')).toHaveTextContent(publicKey)
  })

  it('displays the network name', () => {
    render(<WalletConnect />)
    expect(screen.getByText('mainnet')).toBeInTheDocument()
  })

  it('renders a Disconnect button', () => {
    render(<WalletConnect />)
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
  })

  it('calls disconnect when Disconnect is clicked', () => {
    render(<WalletConnect />)
    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('does not show the Connect Freighter button', () => {
    render(<WalletConnect />)
    expect(screen.queryByRole('button', { name: /connect freighter/i })).not.toBeInTheDocument()
  })

  it('does not show network name when network is null', () => {
    mockUseWallet.mockReturnValue({
      publicKey,
      network: null as never,
      disconnect,
      connect: vi.fn(),
    })
    render(<WalletConnect />)
    expect(screen.queryByText('mainnet')).not.toBeInTheDocument()
  })
})

describe('WalletConnect — disconnected, Freighter installed', () => {
  const connect = vi.fn()

  beforeEach(() => {
    mockIsFreighterInstalled.mockReturnValue(true)
    mockUseWallet.mockReturnValue({ publicKey: null, network: testNetwork, connect, disconnect: vi.fn() })
  })

  it('renders the Connect Freighter button', () => {
    render(<WalletConnect />)
    expect(screen.getByRole('button', { name: /connect freighter/i })).toBeInTheDocument()
  })

  it('calls connect when the button is clicked', async () => {
    connect.mockResolvedValue({ publicKey: 'GTEST', network: testNetwork })
    render(<WalletConnect />)
    fireEvent.click(screen.getByRole('button', { name: /connect freighter/i }))
    await waitFor(() => expect(connect).toHaveBeenCalledOnce())
  })

  it('does not show the Install Freighter link', () => {
    render(<WalletConnect />)
    expect(screen.queryByRole('link', { name: /install freighter/i })).not.toBeInTheDocument()
  })
})
