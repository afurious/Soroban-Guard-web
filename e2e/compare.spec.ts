import { test, expect } from '@playwright/test'

const STORAGE_KEY = 'sg_scan_history'

const scanAFindings = [
  {
    check_name: 'unchecked-auth',
    severity: 'High',
    file_path: 'src/lib.rs',
    line: 42,
    function_name: 'transfer',
    description: 'Authorization is not verified before executing privileged operation.',
  },
  {
    check_name: 'integer-overflow',
    severity: 'Medium',
    file_path: 'src/lib.rs',
    line: 85,
    function_name: 'add_balance',
    description: 'Integer arithmetic may overflow without bounds checking.',
  },
]

const scanBFindings = [
  {
    check_name: 'integer-overflow',
    severity: 'Medium',
    file_path: 'src/lib.rs',
    line: 85,
    function_name: 'add_balance',
    description: 'Integer arithmetic may overflow without bounds checking.',
  },
  {
    check_name: 'uninitialized-storage',
    severity: 'High',
    file_path: 'src/lib.rs',
    line: 120,
    function_name: 'init',
    description: 'Storage variable accessed before initialization.',
  },
]

const records = [
  {
    id: 'scan-a',
    publicKey: 'GPUB1',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    network: 'testnet',
    scannedAt: '2024-01-01T10:00:00.000Z',
    findingCount: 2,
    highCount: 1,
    mediumCount: 1,
    lowCount: 0,
    findings: scanAFindings,
  },
  {
    id: 'scan-b',
    publicKey: 'GPUB1',
    contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    network: 'testnet',
    scannedAt: '2024-01-02T10:00:00.000Z',
    findingCount: 2,
    highCount: 1,
    mediumCount: 1,
    lowCount: 0,
    findings: scanBFindings,
  },
]

async function seedHistory(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key: STORAGE_KEY, data: records },
  )
}

test.describe('/compare page', () => {
  test('shows fixed, new, and persisting findings sections', async ({ page }) => {
    await seedHistory(page)
    await page.goto('/compare?a=scan-a&b=scan-b')

    await expect(page.locator('text=Scan Comparison')).toBeVisible()
    await expect(page.locator('text=/Fixed/i')).toBeVisible()
    await expect(page.locator('text=/New/i')).toBeVisible()
    await expect(page.locator('text=/Persisting/i')).toBeVisible()
  })

  test('fixed column shows removed finding from scan A', async ({ page }) => {
    await seedHistory(page)
    await page.goto('/compare?a=scan-a&b=scan-b')

    // unchecked-auth is in A but not B → fixed
    const fixedSection = page.locator('h2:has-text("Fixed")').locator('..')
    await expect(fixedSection.locator('text=unchecked-auth')).toBeVisible()
  })

  test('new column shows added finding in scan B', async ({ page }) => {
    await seedHistory(page)
    await page.goto('/compare?a=scan-a&b=scan-b')

    // uninitialized-storage is in B but not A → new
    const newSection = page.locator('h2:has-text("New")').locator('..')
    await expect(newSection.locator('text=uninitialized-storage')).toBeVisible()
  })

  test('persisting column shows finding present in both scans', async ({ page }) => {
    await seedHistory(page)
    await page.goto('/compare?a=scan-a&b=scan-b')

    // integer-overflow is in both → persisting
    const persistingSection = page.locator('h2:has-text("Persisting")').locator('..')
    await expect(persistingSection.locator('text=integer-overflow')).toBeVisible()
  })

  test('shows empty state when IDs are missing', async ({ page }) => {
    await page.goto('/compare')
    await expect(page.locator('text=No scans selected for comparison')).toBeVisible()
    await expect(page.locator('text=Browse scan history')).toBeVisible()
  })

  test('back button navigates to home', async ({ page }) => {
    await seedHistory(page)
    await page.goto('/compare?a=scan-a&b=scan-b')

    await page.locator('button:has-text("Soroban Guard")').click()
    await page.waitForURL('/')
    await expect(page).toHaveURL('/')
  })
})
