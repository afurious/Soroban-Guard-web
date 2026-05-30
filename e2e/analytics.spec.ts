import { test, expect } from '@playwright/test'

const STORAGE_KEY = 'sg_scan_history'

const analyticsRecords = [
  {
    id: 'rec-1',
    publicKey: 'GPUB1',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0001',
    network: 'testnet',
    scannedAt: '2024-01-01T10:00:00.000Z',
    findingCount: 3,
    highCount: 2,
    mediumCount: 1,
    lowCount: 0,
    findings: [
      { check_name: 'unchecked-auth', severity: 'High', file_path: 'src/lib.rs', line: 10, function_name: 'transfer', description: 'Auth check missing.' },
      { check_name: 'unchecked-auth', severity: 'High', file_path: 'src/lib.rs', line: 20, function_name: 'withdraw', description: 'Auth check missing.' },
      { check_name: 'integer-overflow', severity: 'Medium', file_path: 'src/lib.rs', line: 30, function_name: 'add_balance', description: 'May overflow.' },
    ],
  },
  {
    id: 'rec-2',
    publicKey: 'GPUB1',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0002',
    network: 'testnet',
    scannedAt: '2024-01-02T10:00:00.000Z',
    findingCount: 2,
    highCount: 1,
    mediumCount: 1,
    lowCount: 0,
    findings: [
      { check_name: 'unchecked-auth', severity: 'High', file_path: 'src/lib.rs', line: 10, function_name: 'transfer', description: 'Auth check missing.' },
      { check_name: 'integer-overflow', severity: 'Medium', file_path: 'src/lib.rs', line: 30, function_name: 'add_balance', description: 'May overflow.' },
    ],
  },
  {
    id: 'rec-3',
    publicKey: 'GPUB1',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0003',
    network: 'mainnet',
    scannedAt: '2024-01-03T10:00:00.000Z',
    findingCount: 1,
    highCount: 0,
    mediumCount: 1,
    lowCount: 0,
    findings: [
      { check_name: 'integer-overflow', severity: 'Medium', file_path: 'src/lib.rs', line: 30, function_name: 'add_balance', description: 'May overflow.' },
    ],
  },
]

async function seedAnalytics(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key: STORAGE_KEY, data: analyticsRecords },
  )
}

test.describe('/analytics page', () => {
  test('renders stat cards with seeded data', async ({ page }) => {
    await seedAnalytics(page)
    await page.goto('/analytics')

    await expect(page.locator('text=Portfolio Analytics')).toBeVisible()
    await expect(page.locator('text=Total scans')).toBeVisible()
    await expect(page.locator('text=Avg findings / scan')).toBeVisible()
    await expect(page.locator('text=Total high')).toBeVisible()
    await expect(page.locator('text=Total medium')).toBeVisible()
  })

  test('renders top checks bar chart', async ({ page }) => {
    await seedAnalytics(page)
    await page.goto('/analytics')

    await expect(page.locator('text=Top 5 most frequent checks')).toBeVisible()
    await expect(page.locator('text=unchecked-auth')).toBeVisible()
    await expect(page.locator('text=integer-overflow')).toBeVisible()
  })

  test('shows empty state when fewer than 3 scans', async ({ page }) => {
    const twoRecords = analyticsRecords.slice(0, 2)
    await page.addInitScript(
      ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
      { key: STORAGE_KEY, data: twoRecords },
    )
    await page.goto('/analytics')

    await expect(page.locator('text=Not enough data yet')).toBeVisible()
    await expect(page.locator('text=Run at least')).toBeVisible()
  })

  test('shows empty state when no history exists', async ({ page }) => {
    await page.goto('/analytics')

    await expect(page.locator('text=Not enough data yet')).toBeVisible()
    await expect(page.locator('a:has-text("Scan a contract")')).toBeVisible()
  })

  test('check trend section renders with enough data', async ({ page }) => {
    await seedAnalytics(page)
    await page.goto('/analytics')

    await expect(page.locator('text=Findings severity trend by check')).toBeVisible()
    await expect(page.locator('aria-label=Select check name')).toBeVisible()
  })

  test('back link navigates to /history', async ({ page }) => {
    await seedAnalytics(page)
    await page.goto('/analytics')

    await page.locator('a:has-text("Scan History")').click()
    await page.waitForURL('/history')
    await expect(page).toHaveURL('/history')
  })
})
