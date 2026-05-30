import type { Finding } from '@/types/findings'

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'can', 'not', 'no', 'nor', 'so',
  'yet', 'both', 'either', 'neither', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'than', 'too', 'very', 'just', 'that', 'this',
  'it', 'its', 'as', 'if', 'into', 'through', 'during', 'before', 'after',
  'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
  'any', 'which', 'who', 'whom', 'what', 'without', 'about', 'against',
  'up', 'down', 'while', 'also', 'only', 'same', 'own', 'your', 'their',
])

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t))
}

/**
 * Extract term frequencies from findings' check_name and description fields.
 * Returns a map of term → count, sorted by frequency descending, top 30.
 */
export function extractTerms(findings: Finding[]): Record<string, number> {
  const freq: Record<string, number> = {}

  for (const f of findings) {
    // Weight check_name tokens more (×3) since they're more signal-dense
    for (const token of tokenize(f.check_name)) {
      freq[token] = (freq[token] ?? 0) + 3
    }
    for (const token of tokenize(f.description)) {
      freq[token] = (freq[token] ?? 0) + 1
    }
  }

  // Sort by frequency and return top 30
  return Object.fromEntries(
    Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30),
  )
}
