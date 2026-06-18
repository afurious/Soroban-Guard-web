import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ScanInput from '@/components/ScanInput'

// Mock all lib imports that ScanInput uses
jest.mock('@/lib/sampleContract', () => ({ SAMPLE_CONTRACT: '// sample' }))
jest.mock('@/lib/ipfs', () => ({ isValidCid: jest.fn(), fetchFromIpfs: jest.fn() }))
jest.mock('@/lib/npm', () => ({ isValidNpmPackage: jest.fn(), fetchNpmSource: jest.fn() }))
jest.mock('@/lib/notifications', () => ({ requestPermission: jest.fn() }))
jest.mock('@/lib/stellar', () => ({
  extractContractIdFromUrl: jest.fn(() => null),
  getContractWasmSize: jest.fn(() => Promise.resolve(null)),
  isValidContractId: jest.fn((id: string) => id.length === 56 && id.startsWith('C')),
}))
jest.mock('@/lib/gist', () => ({ isValidGistUrl: jest.fn(), fetchGistFiles: jest.fn(), fetchGistFileContent: jest.fn() }))

const noop = jest.fn()

beforeEach(() => {
  noop.mockClear()
  localStorage.clear()
})

function setup(props = {}) {
  return render(<ScanInput onScan={noop} loading={false} {...props} />)
}

describe('tab switching', () => {
  it('renders Paste Code tab active by default', () => {
    setup()
    expect(screen.getByPlaceholderText(/paste your contract/i)).toBeInTheDocument()
  })

  it('switches to GitHub URL tab', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /github url/i }))
    expect(screen.getByPlaceholderText('https://github.com/org/repo')).toBeInTheDocument()
  })

  it('switches to Contract ID tab', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /contract id/i }))
    expect(screen.getByPlaceholderText(/CAAAA/)).toBeInTheDocument()
  })
})

describe('form submission', () => {
  it('submit button is disabled when code is empty', () => {
    setup()
    expect(screen.getByRole('button', { name: /scan contract/i })).toBeDisabled()
  })

  it('calls onScan with code when form is submitted', async () => {
    setup()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'fn main() {}' } })
    await userEvent.click(screen.getByRole('button', { name: /scan contract/i }))
    expect(noop).toHaveBeenCalledWith('fn main() {}', 'code', expect.anything())
  })

  it('calls onScan with github url', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /github url/i }))
    await userEvent.type(screen.getByRole('textbox'), 'https://github.com/org/repo')
    await userEvent.click(screen.getByRole('button', { name: /scan contract/i }))
    expect(noop).toHaveBeenCalledWith('https://github.com/org/repo', 'github', expect.anything())
  })
})

describe('validation', () => {
  it('shows error for invalid GitHub URL', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /github url/i }))
    await userEvent.type(screen.getByRole('textbox'), 'not-a-url')
    expect(await screen.findByText(/invalid url/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /scan contract/i })).toBeDisabled()
  })

  it('shows error for non-github URL', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /github url/i }))
    await userEvent.type(screen.getByRole('textbox'), 'https://gitlab.com/org/repo')
    expect(await screen.findByText(/github\.com/i)).toBeInTheDocument()
  })

  it('disables submit for invalid contract ID (too short)', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /contract id/i }))
    await userEvent.type(screen.getByRole('textbox'), 'CSHORT')
    expect(screen.getByRole('button', { name: /scan contract/i })).toBeDisabled()
  })

  it('enables submit for valid contract ID', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /contract id/i }))
    await userEvent.type(screen.getByRole('textbox'), 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM')
    expect(screen.getByRole('button', { name: /scan contract/i })).not.toBeDisabled()
  })
})

describe('keyboard shortcut', () => {
  it('Ctrl+Enter submits the form when canSubmit is true', async () => {
    setup()
    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'fn main() {}' } })
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
    expect(noop).toHaveBeenCalled()
  })

  it('Ctrl+Enter does nothing when input is empty', () => {
    setup()
    const textarea = screen.getByRole('textbox')
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true })
    expect(noop).not.toHaveBeenCalled()
  })
})

describe('loading state', () => {
  it('disables submit button while loading', () => {
    setup({ loading: true })
    expect(screen.getByRole('button', { name: /scanning/i })).toBeDisabled()
  })
})

describe('rate limit', () => {
  it('shows countdown when rate limited', () => {
    setup({ countdown: 30 })
    expect(screen.getByRole('button', { name: /rate limited/i })).toBeDisabled()
    expect(screen.getByText(/retry in 30s/i)).toBeInTheDocument()
  })
})
