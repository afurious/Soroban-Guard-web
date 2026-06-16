import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'API Reference — Soroban Guard',
  description: 'REST API documentation for the Soroban Guard Core scanning endpoint.',
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export default function ApiDocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Soroban Guard
      </Link>

      <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-white">API Reference</h1>
      <p className="mb-12 text-slate-400">
        Soroban Guard Core exposes a single REST endpoint. No authentication is required.
      </p>

      {/* Base URL */}
      <Section title="Base URL">
        <Code>{BASE_URL}</Code>
      </Section>

      {/* Authentication */}
      <Section title="Authentication">
        <p className="text-slate-400">None. The API is publicly accessible.</p>
      </Section>

      {/* POST /scan */}
      <Section title="POST /scan">
        <p className="mb-4 text-slate-400">
          Submits a Soroban contract for static analysis. Accepts raw Rust source code, a public
          GitHub repository URL, or a deployed Soroban contract ID (C-address).
        </p>

        <SubHeading>Request</SubHeading>
        <p className="mb-2 text-sm text-slate-500">Content-Type: application/json</p>
        <Code>{`{
  "source": string  // Rust source | GitHub URL | C-address
}`}</Code>

        <SubHeading>Response</SubHeading>
        <p className="mb-2 text-sm text-slate-500">200 OK — Content-Type: application/json</p>
        <Code>{`{
  "findings": Finding[]
}`}</Code>

        <SubHeading>Finding type</SubHeading>
        <Code>{`interface Finding {
  check_name:    string               // e.g. "unchecked-auth"
  severity:      "Critical" | "High" | "Medium" | "Low"
  file_path:     string               // e.g. "src/lib.rs"
  line:          number               // 1-indexed
  function_name: string               // e.g. "transfer"
  description:   string
  remediation?:  string               // optional fix guidance
}`}</Code>

        <SubHeading>curl example</SubHeading>
        <Code>{`curl -X POST ${BASE_URL}/scan \\
  -H "Content-Type: application/json" \\
  -d '{"source": "fn transfer(env: Env) { env.storage().set(&1u32, &2u32); }"}'`}</Code>

        <SubHeading>Example response</SubHeading>
        <Code>{`{
  "findings": [
    {
      "check_name": "unchecked-auth",
      "severity": "High",
      "file_path": "src/lib.rs",
      "line": 1,
      "function_name": "transfer",
      "description": "Authorization is not verified before executing privileged operation.",
      "remediation": "Add env.require_auth() or env.require_auth_for_args() before mutating state."
    }
  ]
}`}</Code>
      </Section>

      {/* Error responses */}
      <Section title="Error responses">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-slate-500">
              <th className="pb-2 pr-6 font-medium">Status</th>
              <th className="pb-2 font-medium">Meaning</th>
            </tr>
          </thead>
          <tbody className="text-slate-400">
            <tr className="border-b border-[var(--border)]">
              <td className="py-2 pr-6 font-mono">400</td>
              <td className="py-2">Invalid or missing <code className="text-indigo-400">source</code> field</td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="py-2 pr-6 font-mono">429</td>
              <td className="py-2">Rate limit exceeded — check <code className="text-indigo-400">Retry-After</code> header</td>
            </tr>
            <tr>
              <td className="py-2 pr-6 font-mono">500</td>
              <td className="py-2">Internal analysis error</td>
            </tr>
          </tbody>
        </table>
      </Section>

      {/* Rate limits */}
      <Section title="Rate limits">
        <p className="text-slate-400">
          Requests are rate-limited per IP. When the limit is exceeded the API returns{' '}
          <code className="text-indigo-400">429 Too Many Requests</code> with a{' '}
          <code className="text-indigo-400">Retry-After</code> header indicating how many seconds
          to wait before retrying.
        </p>
      </Section>

      {/* Webhook / CI integration */}
      <Section title="CI Webhook">
        <p className="mb-4 text-slate-400">
          Push scan results from CI directly to the dashboard without manual copy-paste.
          POST findings to the webhook endpoint and open the returned URL in a browser.
        </p>

        <SubHeading>POST /api/webhook</SubHeading>
        <p className="mb-2 text-sm text-slate-500">Content-Type: application/json</p>
        <Code>{`{
  "findings": Finding[]   // same shape as POST /scan response
}`}</Code>

        <SubHeading>Response — 201 Created</SubHeading>
        <Code>{`{ "token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" }`}</Code>

        <SubHeading>View results</SubHeading>
        <p className="mb-2 text-slate-400">
          Open <code className="text-indigo-400">/webhook/{'<token>'}</code> in a browser to view
          the findings in the dashboard. Tokens expire after <strong className="text-slate-300">1 hour</strong>.
          Expired or unknown tokens redirect to <code className="text-indigo-400">/</code>.
        </p>

        <SubHeading>curl example (CI step)</SubHeading>
        <Code>{`# 1. Run the scanner and capture output
RESULT=$(curl -s -X POST ${BASE_URL}/scan \\
  -H "Content-Type: application/json" \\
  -d '{"source": "'"$CONTRACT_SOURCE"'"}')

# 2. Push findings to the dashboard webhook
TOKEN=$(curl -s -X POST https://your-dashboard/api/webhook \\
  -H "Content-Type: application/json" \\
  -d "$RESULT" | jq -r .token)

echo "View results: https://your-dashboard/webhook/$TOKEN"`}</Code>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-bold text-white">{title}</h2>
      {children}
    </section>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-slate-500">{children}</h3>
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] p-4 font-mono text-sm text-slate-300">
      <code>{children}</code>
    </pre>
  )
}
