import { createLinearIssue, findingDescription } from '@/lib/linear'
import type { Finding } from '@/types/findings'

const finding: Finding = {
  check_name: 'integer-overflow',
  severity: 'High',
  file_path: 'src/lib.rs',
  line: 85,
  function_name: 'add_balance',
  description: 'Integer arithmetic may overflow without bounds checking.',
  remediation: 'Use checked arithmetic operations.',
}

const findingNoRemediation: Finding = {
  check_name: 'unchecked-auth',
  severity: 'Critical',
  file_path: 'src/contract.rs',
  line: 10,
  function_name: 'transfer',
  description: 'Missing authorization check.',
}

beforeEach(() => {
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.resetAllMocks()
})

describe('findingDescription', () => {
  it('includes all finding fields', () => {
    const desc = findingDescription(finding)
    expect(desc).toContain('Severity: High')
    expect(desc).toContain('Check: integer-overflow')
    expect(desc).toContain('Function: add_balance')
    expect(desc).toContain('File: src/lib.rs')
    expect(desc).toContain('Line: 85')
    expect(desc).toContain('Integer arithmetic may overflow without bounds checking.')
  })

  it('includes remediation when present', () => {
    const desc = findingDescription(finding)
    expect(desc).toContain('Remediation:')
    expect(desc).toContain('Use checked arithmetic operations.')
  })

  it('omits remediation block when absent', () => {
    const desc = findingDescription(findingNoRemediation)
    expect(desc).not.toContain('Remediation:')
  })
})

describe('createLinearIssue', () => {
  it('returns issue url on success', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          issueCreate: {
            success: true,
            issue: { url: 'https://linear.app/team/issue/ABC-1' },
          },
        },
      }),
    } as unknown as Response)

    const url = await createLinearIssue('lin_api_key', 'team-123', finding)
    expect(url).toBe('https://linear.app/team/issue/ABC-1')
  })

  it('sends correct graphql mutation payload', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { issueCreate: { success: true, issue: { url: 'https://linear.app/issue/1' } } },
      }),
    } as unknown as Response)

    await createLinearIssue('lin_api_key', 'team-123', finding)

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toBe('https://api.linear.app/graphql')
    const body = JSON.parse((init as RequestInit).body as string)
    expect(body.variables.input.teamId).toBe('team-123')
    expect(body.variables.input.title).toContain('High')
    expect(body.variables.input.title).toContain('integer-overflow')
    expect(body.variables.input.priority).toBe(1)
  })

  it('falls back to generic message when url is absent', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { issueCreate: { success: true, issue: {} } },
      }),
    } as unknown as Response)

    const result = await createLinearIssue('lin_api_key', 'team-123', finding)
    expect(result).toBe('Created Linear issue')
  })

  it('throws on API errors array', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ errors: [{ message: 'Unauthorized' }] }),
    } as unknown as Response)

    await expect(createLinearIssue('key', 'team', finding)).rejects.toThrow('Unauthorized')
  })

  it('throws on non-ok response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as unknown as Response)

    await expect(createLinearIssue('key', 'team', finding)).rejects.toThrow('Linear API error 401')
  })
})
