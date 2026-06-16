'use client'

import { useEffect, useRef, useState } from 'react'

import type { Finding, Severity } from '@/types/findings'
import type { PageSize } from '@/lib/preferences'
import { getPageSize, setPageSize, getNumericPageSize } from '@/lib/preferences'
import BottomSheet from './BottomSheet'
import SeverityBadge from './SeverityBadge'
import FindingCard from './FindingCard'
import CheckTooltip from './CheckTooltip'

type SortKey = 'severity' | 'file_path' | 'function_name' | 'line'

interface SortConfig {
  key: SortKey
  direction: 'asc' | 'desc'
}

interface Props {
  findings: Finding[]
  searchQuery?: string
  pageSize?: number
  forceExpandedIndex?: number | null
  onMuteChange?: () => void
}

const SEVERITY_ORDER: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4 }
const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low', 'Info']

const columns = [
  { key: 'severity' as SortKey, label: 'Severity' },
  { key: 'file_path' as SortKey, label: 'File', hideOnMobile: true },
  { key: 'function_name' as SortKey, label: 'Function' },
  { key: 'line' as SortKey, label: 'Line' },
]

export default function FindingsTable({ findings, searchQuery = '', pageSize = 20, forceExpandedIndex, onMuteChange }: Props) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [mobileOpenIndex, setMobileOpenIndex] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [isPrint, setIsPrint] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activeSeverity, setActiveSeverity] = useState<Severity | null>(null)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'severity', direction: 'asc' })
  const didScrollToHash = useRef(false)

  useEffect(() => {
    if (forceExpandedIndex !== undefined) {
      setExpandedIndex(forceExpandedIndex ?? null)
    }
  }, [forceExpandedIndex])

  // Handle URL hash: #finding-{index} — scroll to and expand on load
  useEffect(() => {
    if (didScrollToHash.current) return
    const hash = window.location.hash
    const match = hash.match(/^#finding-(\d+)$/)
    if (!match) return
    const idx = parseInt(match[1], 10)
    if (isNaN(idx)) return
    didScrollToHash.current = true
    const targetPage = Math.floor(idx / pageSize)
    setCurrentPage(targetPage)
    setExpandedIndex(idx)
    setTimeout(() => {
      const el = document.querySelector(`[data-finding-index="${idx}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }, [pageSize])

  useEffect(() => {
    const printQuery = window.matchMedia('print')
    const handlePrintChange = (e: MediaQueryListEvent) => setIsPrint(e.matches)
    setIsPrint(printQuery.matches)
    printQuery.addEventListener('change', handlePrintChange)
    return () => printQuery.removeEventListener('change', handlePrintChange)
  }, [])

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 639px)')
    const handleMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mobileQuery.matches)
    mobileQuery.addEventListener('change', handleMobileChange)
    return () => mobileQuery.removeEventListener('change', handleMobileChange)
  }, [])

  const q = searchQuery.trim().toLowerCase()

  const severityFiltered = activeSeverity
    ? findings.filter(f => f.severity === activeSeverity)
    : findings

  const searched = q
    ? severityFiltered.filter(
        finding =>
          finding.check_name.toLowerCase().includes(q) ||
          finding.function_name.toLowerCase().includes(q) ||
          finding.file_path.toLowerCase().includes(q) ||
          finding.description.toLowerCase().includes(q),
      )
    : severityFiltered

  const sorted = [...searched].sort((a, b) => {
    const { key, direction } = sortConfig
    const dir = direction === 'asc' ? 1 : -1

    if (key === 'severity') {
      return (SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]) * dir
    }
    if (key === 'line') {
      return (a.line - b.line) * dir
    }
    const aVal = a[key].toLowerCase()
    const bVal = b[key].toLowerCase()
    if (aVal < bVal) return -1 * dir
    if (aVal > bVal) return 1 * dir
    return 0
  })

  useEffect(() => {
    setCurrentPage(0)
  }, [q, activeSeverity, sortConfig])

  const totalPages = Math.ceil(sorted.length / pageSize)
  const start = currentPage * pageSize
  const end = start + pageSize
  const paginatedFindings = sorted.slice(start, end)

  function handleRowClick(pageIndex: number, globalIndex: number) {
    if (isMobile) {
      setMobileOpenIndex(prev => (prev === pageIndex ? null : pageIndex))
      setExpandedIndex(null)
      return
    }
    const next = expandedIndex === globalIndex ? null : globalIndex
    setExpandedIndex(next)
    if (next !== null) {
      history.replaceState(null, '', `#finding-${next}`)
    } else {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  function handleKeyDown(e: KeyboardEvent, globalIndex: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setExpandedIndex(prev => (prev === globalIndex ? null : globalIndex))
    }
  }

  function handleSeverityToggle(severity: Severity) {
    setActiveSeverity(prev => (prev === severity ? null : severity))
    setExpandedIndex(null)
    setMobileOpenIndex(null)
  }

  function handleSortToggle(key: SortKey) {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
    setExpandedIndex(null)
    setMobileOpenIndex(null)
  }

  function SortIndicator({ columnKey }: { columnKey: SortKey }) {
    if (sortConfig.key !== columnKey) {
      return <span className="ml-1 inline-block text-slate-600">&#x21D5;</span>
    }
    return (
      <span className="ml-1 inline-block text-indigo-400">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  return (

    <div>
      {/* Severity filter chips */}
      {findings.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {SEVERITIES.map(severity => {
            const count = findings.filter(f => f.severity === severity).length
            if (count === 0) return null
            const isActive = activeSeverity === severity
            return (
              <button
                key={severity}
                onClick={() => handleSeverityToggle(severity)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/50'
                    : 'bg-[var(--bg-tertiary)] text-slate-400 hover:bg-[var(--bg-hover)] hover:text-slate-200'
                }`}
                aria-pressed={isActive}
              >
                <SeverityBadge severity={severity} size="sm" includeIcon={false} />
                <span>{severity}</span>
                <span className="ml-0.5 rounded-md bg-[var(--bg)] px-1.5 py-0.5 text-[10px] tabular-nums text-slate-500">
                  {count}
                </span>
              </button>
            )
          })}
          {activeSeverity && (
            <button
              onClick={() => setActiveSeverity(null)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-slate-500 transition-colors hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
      {sorted.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-5 py-10 text-center text-sm text-slate-500">
          {activeSeverity
            ? `No ${activeSeverity} severity findings match your search.`
            : 'No findings match your search.'}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            {/* Sortable table header */}
            <div className="hidden grid-cols-[120px_1fr_1fr_80px_1fr] gap-4 border-b border-[var(--border)] bg-[var(--bg-tertiary)] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:grid">
              {columns.map(col => (
                <button
                  key={col.key}
                  onClick={() => handleSortToggle(col.key)}
                  className={`flex items-center gap-1 text-left transition-colors hover:text-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    col.hideOnMobile ? 'hidden lg:flex' : ''
                  }`}
                >
                  <span>{col.label}</span>
                  <SortIndicator columnKey={col.key} />
                </button>
              ))}
              <span className="text-left">Description</span>
            </div>
            {paginatedFindings.map((finding, i) => {
              const globalIndex = start + i
              const isExpanded = !isMobile && expandedIndex === globalIndex
              const isMobileOpen = isMobile && mobileOpenIndex === i
              return (
                <div key={globalIndex} data-finding-index={globalIndex}>
                  <button
                    onClick={() => handleRowClick(i, globalIndex)}
                    className={`w-full border-b border-[var(--border)] px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      isExpanded || isMobileOpen ? 'bg-[var(--bg-hover)]' : 'bg-[var(--bg)]'
                    }`}
                    aria-expanded={isExpanded || isMobileOpen}
                  >
                    <div className="flex items-start justify-between gap-3 sm:hidden">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={finding.severity} size="sm" />
                          <CheckTooltip checkName={finding.check_name} />
                        </div>
                        <p className="line-clamp-2 text-sm text-slate-400">{finding.description}</p>
                      </div>
                      <ChevronIcon expanded={expandedIndex === globalIndex} />
                    </div>
                    <div className="hidden grid-cols-[120px_1fr_1fr_80px_1fr] items-center gap-4 sm:grid">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={finding.severity} size="sm" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{finding.severity}</span>
                      </div>
                      <CheckTooltip checkName={finding.check_name} />
                      <span className="truncate font-mono text-sm text-slate-300">{finding.function_name}</span>
                      <span className="font-mono text-sm text-slate-400">{finding.line}</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="line-clamp-1 text-sm text-slate-400">{finding.description}</span>
                        <ChevronIcon expanded={expandedIndex === globalIndex} />
                      </div>
                    </div>
                  </button>
                  {(expandedIndex === globalIndex || isPrint) && (
                    <div className="border-b border-[var(--border)] bg-[var(--bg-tertiary)] px-5 py-4 last:border-b-0">
                      <FindingCard finding={finding} onMuteChange={onMuteChange} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Showing {start + 1}&#8211;{Math.min(end, sorted.length)} of {sorted.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-slate-400 transition disabled:opacity-50 hover:enabled:bg-[var(--bg-hover)] hover:enabled:text-white"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-slate-400 transition disabled:opacity-50 hover:enabled:bg-[var(--bg-hover)] hover:enabled:text-white"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {mobileOpenIndex !== null && paginatedFindings[mobileOpenIndex] && (
        <BottomSheet
          open
          title={paginatedFindings[mobileOpenIndex].check_name}
          onClose={() => setMobileOpenIndex(null)}
        >
          <FindingCard finding={paginatedFindings[mobileOpenIndex]} onMuteChange={onMuteChange} />
        </BottomSheet>
      )}
    </div>
  )
}
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={`h-4 w-4 flex-shrink-0 text-slate-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}
