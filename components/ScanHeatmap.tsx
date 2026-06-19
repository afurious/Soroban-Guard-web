'use client'

import { useMemo, useState } from 'react'
import type { Finding, Severity } from '@/types/findings'

interface Props {
  entries: { date: string; findings?: Finding[] }[]
  selectedDate?: string | null
  onDayClick?: (date: string | null) => void
}

type DaySeverity = 'none' | Severity

const SEVERITY_ORDER: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Info']

function highestSeverity(findings: Finding[]): DaySeverity {
  if (findings.length === 0) return 'none'
  for (const sev of SEVERITY_ORDER) {
    if (findings.some(f => f.severity === sev)) return sev
  }
  return 'Low'
}

function severityLabel(s: DaySeverity): string {
  if (s === 'none') return 'no scans'
  return s
}

const CELL_STYLES: Record<DaySeverity, string> = {
  none: 'bg-[#1a1d27]',
  Info: 'bg-slate-500/15 border border-slate-500/30',
  Low: 'bg-sky-500/15 border border-sky-500/30',
  Medium: 'bg-amber-500/15 border-2 border-amber-500/30',
  High: 'bg-red-500/15 border-2 border-dashed border-red-500/30',
  Critical: 'bg-rose-500/15 border-2 border-rose-500/30 ring-1 ring-inset ring-rose-500/50',
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function ScanHeatmap({ entries, selectedDate, onDayClick }: Props) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const { daySeverity, dayCounts } = useMemo(() => {
    const sev: Record<string, DaySeverity> = {}
    const cnt: Record<string, number> = {}
    for (const e of entries) {
      const key = e.date.slice(0, 10)
      cnt[key] = (cnt[key] ?? 0) + 1
      const daySev = e.findings ? highestSeverity(e.findings) : 'none'
      if (!sev[key] || SEVERITY_ORDER.indexOf(daySev as Severity) < SEVERITY_ORDER.indexOf(sev[key] as Severity)) {
        sev[key] = daySev
      }
    }
    return { daySeverity: sev, dayCounts: cnt }
  }, [entries])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const start = new Date(today)
  start.setDate(start.getDate() - 364)
  start.setDate(start.getDate() - start.getDay())

  const weeks: Date[][] = useMemo(() => {
    const w: Date[][] = []
    let current = new Date(start)
    while (current <= today) {
      const week: Date[] = []
      for (let d = 0; d < 7; d++) {
        week.push(new Date(current))
        current.setDate(current.getDate() + 1)
      }
      w.push(week)
    }
    return w
  }, [])

  const monthLabels = useMemo(() => {
    const labels: { label: string; col: number }[] = []
    let lastMonth = -1
    weeks.forEach((week, col) => {
      const month = week[0].getMonth()
      if (month !== lastMonth) {
        labels.push({ label: MONTHS[month], col })
        lastMonth = month
      }
    })
    return labels
  }, [weeks])

  const todayStr = today.toISOString().slice(0, 10)

  return (
    <div className="rounded-xl border border-[#2a2d3a] bg-[#12151f] p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-300">Scan activity — last 52 weeks</h2>

      {/* Month labels row */}
      <div className="relative mb-1 flex" style={{ paddingLeft: '1.5rem' }}>
        {monthLabels.map(({ label, col }) => (
          <span
            key={`${label}-${col}`}
            className="absolute text-[10px] text-slate-500"
            style={{ left: `calc(1.5rem + ${col} * 14px)` }}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="flex gap-[2px]">
        {/* Day-of-week labels — separate column so they don't scroll away */}
        <div className="flex shrink-0 flex-col gap-[2px]" style={{ width: '1.5rem' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <span
              key={i}
              className="flex h-[14px] items-center justify-end pr-1 text-[9px] text-slate-600"
            >
              {i % 2 === 1 ? d : ''}
            </span>
          ))}
        </div>

        {/* Scrollable grid */}
        <div className="overflow-x-auto">
          <div className="flex gap-[2px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((day) => {
                  const key = day.toISOString().slice(0, 10)
                  const count = dayCounts[key] ?? 0
                  const sev = daySeverity[key] ?? 'none'
                  const isFuture = day > new Date()
                  const isSelected = selectedDate === key
                  const label = `${count} scan${count !== 1 ? 's' : ''}, ${severityLabel(sev)} on ${day.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`

                  return (
                    <button
                      key={key}
                      onClick={() => {
                        if (isFuture || !onDayClick) return
                        onDayClick(isSelected ? null : key)
                      }}
                      disabled={isFuture}
                      className={`h-[14px] w-[14px] rounded-[2px] transition-colors ${
                        isSelected ? 'ring-2 ring-white/60' : ''
                      } ${
                        isFuture
                          ? 'cursor-default opacity-0 pointer-events-none'
                          : onDayClick
                            ? 'cursor-pointer hover:opacity-80'
                            : 'cursor-default'
                      } ${CELL_STYLES[sev]}`}
                      onMouseEnter={e => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        setTooltip({ text: label, x: rect.left + rect.width / 2, y: rect.top })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      aria-label={label}
                      title={label}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500">
        <span>Less</span>
        {(['none', 'Info', 'Low', 'Medium', 'High', 'Critical'] as DaySeverity[]).map(s => (
          <div key={s} className="flex items-center gap-1">
            <span className={`inline-block h-3 w-3 rounded-[2px] ${CELL_STYLES[s]}`} />
            <span>{s === 'none' ? 'None' : s}</span>
          </div>
        ))}
        <span>More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-[#1e2130] border border-[#2a2d3a] px-2.5 py-1.5 text-xs text-slate-200 shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 6 }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
