import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import CLIDocsPage from './page'

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))

describe('CLIDocsPage', () => {
  it('renders all code blocks', () => {
    render(<CLIDocsPage />)

    // Each CodeBlock renders a <pre> element
    const codeBlocks = document.querySelectorAll('pre')
    // clone, install, run, request-body, curl, fetch, response, error = 8 blocks
    expect(codeBlocks.length).toBe(8)
  })

  it('renders key section headings', () => {
    render(<CLIDocsPage />)
    expect(screen.getByText('Installation & Setup')).toBeInTheDocument()
    expect(screen.getByText('REST API Usage')).toBeInTheDocument()
    expect(screen.getByText('Response Format')).toBeInTheDocument()
    expect(screen.getByText('Error Handling')).toBeInTheDocument()
  })

  it('renders copy buttons for each code block', () => {
    render(<CLIDocsPage />)
    const copyButtons = screen.getAllByTitle('Copy to clipboard')
    expect(copyButtons.length).toBe(8)
  })

  it('contains expected CLI commands in code blocks', () => {
    render(<CLIDocsPage />)
    expect(screen.getByText(/cargo build --release/)).toBeInTheDocument()
    expect(screen.getAllByText(/soroban-guard-core/).length).toBeGreaterThan(0)
    expect(screen.getByText(/curl -X POST/)).toBeInTheDocument()
  })
})
