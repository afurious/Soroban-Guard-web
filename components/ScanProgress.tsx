'use client'

import { useEffect, useState } from 'react'

const STEPS = ['Uploading', 'Parsing', 'Analyzing', 'Done'] as const
// Approximate % completion at each step boundary
const STEP_PCT = [0, 30, 65, 100]

interface Props {
  loading: boolean
  /** For batch scans: how many contracts have been scanned so far */
  batchCurrent?: number
  /** For batch scans: total number of contracts */
  batchTotal?: number
}

export default function ScanProgress({ loading, batchCurrent, batchTotal }: Props) {
  const [step, setStep] = useState(-1)
  const [elapsed, setElapsed] = useState(0)
  // Timestamps (ms since epoch) recorded when each step becomes active
  const [stepTimes, setStepTimes] = useState<number[]>([])

  const isBatch = batchTotal !== undefined && batchTotal > 1

  useEffect(() => {
    if (!loading) {
      setStep(-1)
      setElapsed(0)
      setStepTimes([])
      return
    }
    const start = Date.now()
    setStep(0)
    setElapsed(0)
    setStepTimes([start])

    // Advance through steps, recording a timestamp for each
    const timers = STEPS.slice(1).map((_, i) =>
      setTimeout(() => {
        setStep(i + 1)
        setStepTimes(prev => {
          const next = [...prev]
          next[i + 1] = Date.now()
          return next
        })
      }, (i + 1) * 1500),
    )

    // Tick elapsed ms for percentage interpolation + live display
    const ticker = setInterval(() => setElapsed(s => s + 100), 100)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(ticker)
    }
  }, [loading])

  if (!loading) return null

  // Interpolate percentage between step boundaries
  const stepDuration = 1500 // ms per step
  const withinStep = Math.min(elapsed - step * stepDuration, stepDuration)
  const pctInStep = step < STEPS.length - 1 ? withinStep / stepDuration : 1
  const pct = Math.round(
    STEP_PCT[step] + (STEP_PCT[Math.min(step + 1, STEPS.length - 1)] - STEP_PCT[step]) * pctInStep,
  )

  return (
    <div className="mt-4 space-y-3" role="status" aria-label="Scan progress">
      {/* Batch indicator */}
      {isBatch && (
        <p className="text-center text-sm text-slate-400">
          <span className="font-semibold text-indigo-300">{batchCurrent ?? 0}</span>
          {' of '}
          <span className="font-semibold text-indigo-300">{batchTotal}</span>
          {' contracts scanned'}
        </p>
      )}

      {/* Progress bar */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[#1a1d27]">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${isBatch ? Math.round(((batchCurrent ?? 0) / batchTotal!) * 100) : pct}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((label, i) => {
          const done = i < step
          const active = i === step
          // Duration of a completed step in seconds
          const stepDuration =
            done && stepTimes[i] != null && stepTimes[i + 1] != null
              ? ((stepTimes[i + 1] - stepTimes[i]) / 1000).toFixed(1) + 's'
              : null
          // Live elapsed for the active step in seconds
          const liveElapsed =
            active && stepTimes[i] != null
              ? ((elapsed - i * 1500) / 1000).toFixed(1) + 's'
              : null
          return (
            <div
              key={label}
              className={`flex flex-1 flex-col items-center gap-1.5 ${active ? 'animate-step-in' : ''}`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors duration-500 ${
                  done
                    ? 'bg-indigo-600 text-white'
                    : active
                      ? 'bg-indigo-500/30 text-indigo-300 ring-2 ring-indigo-500'
                      : 'bg-[#1a1d27] text-slate-600 ring-1 ring-[#2a2d3a]'
                }`}
              >
                {done ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : active ? (
                  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs transition-colors duration-500 ${
                  done ? 'text-indigo-400' : active ? 'text-white' : 'text-slate-600'
                }`}
              >
                {label}
                {stepDuration && (
                  <span className="ml-1 text-slate-500">— {stepDuration}</span>
                )}
                {liveElapsed && (
                  <span className="ml-1 text-slate-400">{liveElapsed}</span>
                )}
              </span>
            </div>
          )
        })}
      </div>

      {/* Percentage label (single scan only) */}
      {!isBatch && (
        <p className="text-center text-xs text-slate-500">
          {pct}%
        </p>
      )}
    </div>
  )
}
