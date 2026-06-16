'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import type { Finding, Severity } from '@/types/findings'
import { decodeWorkspace } from '@/lib/share'
import FindingsTable from '@/components/FindingsTable'
import EmptyState from '@/components/EmptyState'
import SeverityBadge from '@/components/SeverityBadge'
import ThemeToggle from '@/components/ThemeToggle'

export default function WorkspacePage() {
  const params = useParams()
  const router = useRouter()
  const [findings, setFindings] = useState<Finding[] | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [sourceOpen, setSourceOpen] = useState(false)

  useEffect(() => {
    const token = typeof params.token === 'string' ? params.token : Array.isArray(params.token) ? params.token[0] : ''
    const ws = decodeWorkspace(token)
    if (!ws) {
      router.replace('/')
      return
    }
    setFindings(ws.findings)
    setSource(ws.source)
  }, [params.token, router])

  if (findings === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <svg className="spinner h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      </div>
    )
  }

  const counts: Record<Severity, number> = { Critical: 0, High: 0, Medium: 0, Low: 0, Info: 0,
}
  for (const f of findings) counts[f.severity]++

  const sorted = [...findings].sort((a, b) => {
    const order: Record<Severity, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Info: 4,
}
    return order[a.severity] - order[b.severity]
  })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-400 transition hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Soroban Guard
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              Shared workspace
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-white">Shared Scan Results</h1>
          <p className="mb-6 text-sm text-slate-500">
            {findings.length === 0
              ? 'No issues detected.'
              : `${findings.length} finding${findings.length !== 1 ? 's' : ''} detected.`}
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryCard label="Total" value={findings.length} color="text-white" bg="bg-[#1a1d27]" />
            <SummaryCard label="High" value={counts.High} color="text-red-400" bg="bg-red-500/5" border="border-red-500/20" />
            <SummaryCard label="Medium" value={counts.Medium} color="text-amber-400" bg="bg-amber-500/5" border="border-amber-500/20" />
            <SummaryCard label="Low" value={counts.Low} color="text-sky-400" bg="bg-sky-500/5" border="border-sky-500/20" />
          </div>
        </div>

        {/* Collapsible source panel */}
        {source && (
          <div className="mb-6 rounded-xl border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setSourceOpen(v => !v)}
              className="flex w-full items-center justify-between px-5 py-3 text-sm font-medium text-slate-300 hover:bg-[var(--bg-hover)] transition-colors"
              aria-expanded={sourceOpen}
            >
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Contract source
                <span className="text-xs text-slate-500 font-normal">(read-only)</span>
              </span>
              <svg
                className={`h-4 w-4 text-slate-500 transition-transform ${sourceOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {sourceOpen && (
              <div className="max-h-96 overflow-auto border-t border-[var(--border)] bg-[#0d0f17]">
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {source.split('\n').map((line, i) => (
                      <tr key={i}>
                        <td className="select-none w-10 px-3 py-0.5 text-right font-mono text-slate-600" aria-hidden="true">
                          {i + 1}
                        </td>
                        <td className="px-3 py-0.5 font-mono whitespace-pre text-slate-300">
                          {line || ' '}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {findings.length === 0 ? (
          <EmptyState onScanAnother={() => router.push('/')} />
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-400">Findings — click a row to expand details</h2>
              <div className="flex gap-2">
                {(['High', 'Medium', 'Low'] as Severity[]).map(s =>
                  counts[s] > 0 ? <SeverityBadge key={s} severity={s} size="sm" /> : null,
                )}
              </div>
            </div>
            <FindingsTable findings={sorted} />
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--border)] py-6 text-center text-xs text-slate-600">
        Soroban Guard · Veritas Vaults Network
      </footer>
    </div>
  )
}

function SummaryCard({
  label, value, color, bg, border = 'border-[var(--border)]',
}: {
  label: string; value: number; color: string; bg: string; border?: string
}) {
  return (
    <div className={`rounded-xl border ${border} ${bg} px-5 py-4`}>
      <p className="mb-1 text-xs text-slate-500">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
