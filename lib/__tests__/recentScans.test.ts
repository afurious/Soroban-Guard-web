import { addRecent, getRecent, truncateLabel } from '../recentScans'
import type { RecentScan } from '../recentScans'

const STORAGE_KEY = 'sg_recent_scans'

const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value }),
    removeItem: jest.fn((key: string) => { delete store[key] }),
    clear: () => { store = {} },
  }
})()

beforeAll(() => {
  Object.defineProperty(global, 'window', { value: global, writable: true })
  Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, writable: true })
})

beforeEach(() => {
  mockLocalStorage.clear()
  jest.clearAllMocks()
})

describe('getRecent', () => {
  it('returns empty array when nothing stored', () => {
    expect(getRecent()).toEqual([])
  })

  it('returns parsed array from localStorage', () => {
    const data: RecentScan[] = [{ type: 'github', value: 'owner/repo', timestamp: 1 }]
    mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(data))
    expect(getRecent()).toEqual(data)
  })

  it('returns empty array for malformed JSON', () => {
    mockLocalStorage.getItem.mockReturnValueOnce('not-json')
    expect(getRecent()).toEqual([])
  })

  it('returns empty array when parsed value is not an array', () => {
    mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify({ type: 'code' }))
    expect(getRecent()).toEqual([])
  })
})

describe('addRecent', () => {
  it('stores a new entry', () => {
    addRecent('github', 'owner/repo')
    const stored: RecentScan[] = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1])
    expect(stored[0].type).toBe('github')
    expect(stored[0].value).toBe('owner/repo')
  })

  it('deduplicates by type + value', () => {
    addRecent('github', 'owner/repo')
    addRecent('github', 'owner/repo')
    const stored: RecentScan[] = JSON.parse(mockLocalStorage.setItem.mock.calls[1][1])
    expect(stored).toHaveLength(1)
  })

  it('puts the new entry at the front', () => {
    addRecent('github', 'repo-a')
    addRecent('github', 'repo-b')
    const stored: RecentScan[] = JSON.parse(mockLocalStorage.setItem.mock.calls[1][1])
    expect(stored[0].value).toBe('repo-b')
    expect(stored[1].value).toBe('repo-a')
  })

  it('caps at 5 entries', () => {
    for (let i = 0; i < 7; i++) addRecent('code', `code-${i}`)
    const stored: RecentScan[] = JSON.parse(mockLocalStorage.setItem.mock.calls.at(-1)![1])
    expect(stored).toHaveLength(5)
  })

  it('moves an existing entry to the top on re-add', () => {
    addRecent('github', 'a')
    addRecent('github', 'b')
    addRecent('github', 'a')
    const stored: RecentScan[] = JSON.parse(mockLocalStorage.setItem.mock.calls.at(-1)![1])
    expect(stored[0].value).toBe('a')
    expect(stored).toHaveLength(2)
  })
})

describe('truncateLabel', () => {
  const scan = (type: RecentScan['type'], value: string): RecentScan => ({ type, value, timestamp: 0 })

  it('returns short contractId unchanged', () => {
    const s = scan('contractId', 'short-id')
    expect(truncateLabel(s)).toBe('short-id')
  })

  it('truncates long contractId with start + end', () => {
    const value = 'A'.repeat(21) + 'B'.repeat(10)
    const s = scan('contractId', value)
    const result = truncateLabel(s)
    expect(result).toContain('...')
    expect(result.startsWith('A'.repeat(20))).toBe(true)
    expect(result.endsWith('B'.repeat(10))).toBe(true)
  })

  it('returns short github URL unchanged', () => {
    const s = scan('github', 'owner/repo')
    expect(truncateLabel(s)).toBe('owner/repo')
  })

  it('truncates long github URL with trailing ellipsis', () => {
    const s = scan('github', 'a'.repeat(50))
    const result = truncateLabel(s)
    expect(result.endsWith('...')).toBe(true)
    expect(result.length).toBe(40)
  })

  it('returns first line for code type', () => {
    const s = scan('code', 'line one\nline two')
    expect(truncateLabel(s)).toBe('line one')
  })

  it('truncates long first code line', () => {
    const s = scan('code', 'x'.repeat(50))
    const result = truncateLabel(s)
    expect(result.endsWith('...')).toBe(true)
    expect(result.length).toBe(40)
  })

  it('returns short code value unchanged', () => {
    const s = scan('code', 'short')
    expect(truncateLabel(s)).toBe('short')
  })
})
