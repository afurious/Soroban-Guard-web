"use client"

import React from 'react'

type Props = {
  children: React.ReactNode
}

type State = {
  hasError: boolean
  error?: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
    this.reset = this.reset.bind(this)
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Uncaught error in component tree:', error, info)
  }

  reset() {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="rounded-lg border p-6 text-center bg-[var(--bg)]">
            <h2 className="mb-2 text-lg font-semibold text-white">Something went wrong</h2>
            <p className="mb-4 text-sm text-slate-400">An unexpected error occurred while rendering this page.</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={this.reset}
                className="rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded border px-3 py-1 text-sm text-slate-200"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children as React.ReactElement
  }
}
