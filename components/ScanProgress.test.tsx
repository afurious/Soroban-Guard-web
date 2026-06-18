import { render, screen, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import ScanProgress from './ScanProgress'

describe('ScanProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when not loading', () => {
    const { container } = render(<ScanProgress loading={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the first step active immediately on load', () => {
    render(<ScanProgress loading={true} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    // Step 1 (Uploading) should have the spinner svg
    const labels = screen.getAllByText(/Uploading|Parsing|Analyzing|Done/i)
    expect(labels[0]).toHaveClass('text-white')
  })

  it('advances to the next step after 1500ms', () => {
    render(<ScanProgress loading={true} />)
    act(() => { vi.advanceTimersByTime(1500) })
    const labels = screen.getAllByText(/Uploading|Parsing|Analyzing|Done/i)
    // Uploading should now be done (indigo-400)
    expect(labels[0]).toHaveClass('text-indigo-400')
    // Parsing should be active (white)
    expect(labels[1]).toHaveClass('text-white')
  })

  it('shows per-step elapsed duration for a completed step', () => {
    render(<ScanProgress loading={true} />)
    // Advance past step 0→1 transition
    act(() => { vi.advanceTimersByTime(1600) })
    // The completed "Uploading" step should show a duration like "— 1.5s"
    expect(screen.getByText(/—\s*\d+\.\d+s/)).toBeInTheDocument()
  })

  it('shows live elapsed time for the active step', () => {
    render(<ScanProgress loading={true} />)
    // Tick the interval a bit within step 0
    act(() => { vi.advanceTimersByTime(900) })
    // Should show something like "0.9s" next to the active step label
    expect(screen.getByText(/0\.\d+s/)).toBeInTheDocument()
  })

  it('renders batch indicator when batchTotal > 1', () => {
    render(<ScanProgress loading={true} batchCurrent={2} batchTotal={5} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText(/contracts scanned/i)).toBeInTheDocument()
  })

  it('cleans up timers on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = render(<ScanProgress loading={true} />)
    unmount()
    expect(clearTimeoutSpy).toHaveBeenCalled()
    expect(clearIntervalSpy).toHaveBeenCalled()
  })
})
