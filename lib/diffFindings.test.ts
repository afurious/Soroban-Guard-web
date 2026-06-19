import { diffFindings } from './diffFindings'
import type { Finding } from '@/types/findings'

const f = (check_name: string, severity: Finding['severity'] = 'High'): Finding => ({
  check_name,
  severity,
  file_path: 'src/lib.rs',
  line: 1,
  function_name: 'fn',
  description: '',
})

test('identical scans — no added, no resolved', () => {
  const findings = [f('unchecked-auth'), f('integer-overflow')]
  const result = diffFindings(findings, findings)
  expect(result.added).toHaveLength(0)
  expect(result.resolved).toHaveLength(0)
  expect(result.unchanged).toHaveLength(2)
})

test('new findings — appear in added', () => {
  const before = [f('unchecked-auth')]
  const after = [f('unchecked-auth'), f('integer-overflow')]
  const result = diffFindings(before, after)
  expect(result.added).toHaveLength(1)
  expect(result.added[0].check_name).toBe('integer-overflow')
  expect(result.resolved).toHaveLength(0)
})

test('resolved findings — appear in resolved', () => {
  const before = [f('unchecked-auth'), f('integer-overflow')]
  const after = [f('unchecked-auth')]
  const result = diffFindings(before, after)
  expect(result.resolved).toHaveLength(1)
  expect(result.resolved[0].check_name).toBe('integer-overflow')
  expect(result.added).toHaveLength(0)
})

test('changed severity — same key treated as unchanged, different severity is a new+resolved pair', () => {
  // key = check_name::file_path::line — severity is NOT part of the key
  // so same check_name/file/line with different severity → unchanged (not a new+resolved pair)
  const before = [f('unchecked-auth', 'High')]
  const after = [f('unchecked-auth', 'Critical')]
  const result = diffFindings(before, after)
  // The key matches, so it lands in unchanged — severity change is not tracked separately
  expect(result.unchanged).toHaveLength(1)
  expect(result.unchanged[0].severity).toBe('Critical')
  expect(result.added).toHaveLength(0)
  expect(result.resolved).toHaveLength(0)
})
