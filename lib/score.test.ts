import { calculateScore } from './score'
import type { Finding } from '@/types/findings'

const f = (severity: Finding['severity']): Finding => ({
  check_name: 'x',
  severity,
  file_path: 'src/lib.rs',
  line: 1,
  function_name: 'fn',
  description: '',
})

test('no findings — returns 100', () => {
  expect(calculateScore([])).toBe(100)
})

test('all Critical — score = max(0, 100 - n*20)', () => {
  // 1 Critical → 100 - 20 = 80
  expect(calculateScore([f('Critical')])).toBe(80)
  // 5 Critical → 100 - 100 = 0
  expect(calculateScore(Array(5).fill(f('Critical')))).toBe(0)
  // 6 Critical → clamped to 0
  expect(calculateScore(Array(6).fill(f('Critical')))).toBe(0)
})

test('mixed severities — correctly weighted sum', () => {
  // 1 Critical(20) + 1 High(15) + 1 Medium(7) + 1 Low(2) = 44 → 100 - 44 = 56
  const findings = [f('Critical'), f('High'), f('Medium'), f('Low')]
  expect(calculateScore(findings)).toBe(56)
})
