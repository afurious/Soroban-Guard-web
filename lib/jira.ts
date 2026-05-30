import type { Finding } from '@/types/findings'

interface JiraIssueResponse {
  key?: string
  self?: string
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

function findingBody(finding: Finding): string {
  return [
    `Severity: ${finding.severity}`,
    `Check: ${finding.check_name}`,
    `Function: ${finding.function_name}`,
    `File: ${finding.file_path}`,
    `Line: ${finding.line}`,
    '',
    'Description:',
    finding.description,
    ...(finding.remediation ? ['', 'Remediation:', finding.remediation] : []),
  ].join('\n')
}

export function toJiraDoc(text: string) {
  return {
    type: 'doc',
    version: 1,
    content: text.split('\n').map(line => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  }
}

export async function createJiraIssue(
  baseUrl: string,
  email: string,
  apiToken: string,
  projectKey: string,
  finding: Finding,
): Promise<string> {
  const root = normalizeBaseUrl(baseUrl)
  const response = await fetch(`${root}/rest/api/3/issue`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${email}:${apiToken}`)}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        summary: `[Soroban Guard] ${finding.check_name} in ${finding.function_name}`,
        description: toJiraDoc(findingBody(finding)),
        issuetype: { name: 'Task' },
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || `Jira API error ${response.status}`)
  }

  const data = (await response.json()) as JiraIssueResponse
  return data.key ? `${root}/browse/${data.key}` : data.self ?? root
}
