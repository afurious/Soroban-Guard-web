import { tokenize, extractTerms } from '../wordCloud'
import type { Finding } from '@/types/findings'

describe('tokenize', () => {
  it('splits on non-alphanumeric characters', () => {
    expect(tokenize('hello world')).toContain('hello')
    expect(tokenize('hello world')).toContain('world')
  })

  it('lowercases all tokens', () => {
    expect(tokenize('Hello WORLD')).toEqual(expect.arrayContaining(['hello', 'world']))
  })

  it('filters out tokens shorter than 3 characters', () => {
    expect(tokenize('a bb ccc')).not.toContain('a')
    expect(tokenize('a bb ccc')).not.toContain('bb')
    expect(tokenize('a bb ccc')).toContain('ccc')
  })

  it('filters out stop words', () => {
    expect(tokenize('the quick brown fox')).not.toContain('the')
    expect(tokenize('the quick brown fox')).toContain('quick')
    expect(tokenize('the quick brown fox')).toContain('brown')
  })

  it('preserves hyphens and underscores in tokens', () => {
    const result = tokenize('my-func my_var')
    expect(result).toContain('my-func')
    expect(result).toContain('my_var')
  })

  it('returns an empty array for empty input', () => {
    expect(tokenize('')).toEqual([])
  })

  it('strips punctuation', () => {
    const result = tokenize('buffer!overflow')
    expect(result).toContain('buffer')
    expect(result).toContain('overflow')
  })
})

const makeFinding = (check_name: string, description: string): Finding => ({
  check_name,
  severity: 'High',
  file_path: 'src/lib.rs',
  line: 1,
  function_name: 'fn_name',
  description,
})

describe('extractTerms', () => {
  it('returns an empty object for no findings', () => {
    expect(extractTerms([])).toEqual({})
  })

  it('counts tokens from check_name with weight 3', () => {
    const findings = [makeFinding('reentrancy', '')]
    const result = extractTerms(findings)
    expect(result['reentrancy']).toBe(3)
  })

  it('counts tokens from description with weight 1', () => {
    const findings = [makeFinding('', 'overflow detected')]
    const result = extractTerms(findings)
    expect(result['overflow']).toBe(1)
    expect(result['detected']).toBe(1)
  })

  it('accumulates counts across multiple findings', () => {
    const findings = [
      makeFinding('reentrancy', 'reentrancy risk'),
      makeFinding('reentrancy', ''),
    ]
    const result = extractTerms(findings)
    expect(result['reentrancy']).toBe(3 + 1 + 3) // desc + check_name×2
  })

  it('returns at most 30 entries', () => {
    const findings = Array.from({ length: 40 }, (_, i) =>
      makeFinding(`term${i}term`, '')
    )
    expect(Object.keys(extractTerms(findings)).length).toBeLessThanOrEqual(30)
  })

  it('sorts entries by frequency descending', () => {
    const findings = [
      makeFinding('reentrancy', 'overflow'),
      makeFinding('reentrancy', ''),
    ]
    const entries = Object.entries(extractTerms(findings))
    expect(entries[0][0]).toBe('reentrancy')
  })
})
