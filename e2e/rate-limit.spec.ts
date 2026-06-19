import { test, expect } from '@playwright/test'

const mockFindings = JSON.stringify({ findings: [] })

/**
 * Mock /scan fetch by overriding window.fetch before the page loads.
 * Each response is a pair [status, body, headers?].
 */
function mockScanFetch(
  page: import('@playwright/test').Page,
  responses: Array<[number, string, Record<string, string>?]>,
) {
  return page.addInitScript(`
    (() => {
      const originalFetch = window.fetch;
      let callCount = 0;
      const responses = ${JSON.stringify(responses)};
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/scan') && init?.method === 'POST') {
          const idx = Math.min(callCount++, responses.length - 1);
          const [status, body, headers = {}] = responses[idx];
          return new Response(body, { status, headers: { 'Content-Type': 'application/json', ...headers } });
        }
        return originalFetch(input, init);
      };
    })();
  `)
}

test.describe('Rate limit (429) handling', () => {
  test('shows countdown banner when API returns 429', async ({ page }) => {
    await mockScanFetch(page, [[429, 'Rate limited', { 'Retry-After': '5' }]])

    await page.goto('/')
    await page.locator('textarea').first().fill('pub fn test() {}')
    await page.locator('button:has-text("Scan Contract")').click()

    // The error banner shows 'Rate limited'
    await expect(page.locator('text=Rate limited').first()).toBeVisible()
  })

  test('scan button is disabled during countdown', async ({ page }) => {
    await mockScanFetch(page, [[429, 'Rate limited', { 'Retry-After': '10' }]])

    await page.goto('/')
    await page.locator('textarea').first().fill('pub fn test() {}')
    await page.locator('button:has-text("Scan Contract")').click()

    // Button should now show the countdown and be disabled
    const btn = page.locator('button:has-text("Rate limited — retry in")')
    await expect(btn).toBeVisible()
    await expect(btn).toBeDisabled()
  })

  test('can retry scan after rate limit countdown expires', async ({ page }) => {
    // First call → 429 with 2s retry
    await mockScanFetch(page, [
      [429, 'Rate limited', { 'Retry-After': '2' }],
      [200, mockFindings],
    ])

    await page.goto('/')
    await page.locator('textarea').first().fill('pub fn test() {}')
    await page.locator('button:has-text("Scan Contract")').click()

    // Error banner appears
    await expect(page.locator('text=Rate limited').first()).toBeVisible()

    // Wait for countdown to expire (button text changes back from "Rate limited — retry in Xs")
    const scanBtn = page.locator('button:has-text("Scan Contract")')
    await expect(scanBtn).toBeVisible({ timeout: 10_000 })

    // Click scan again — this time the mock returns 200
    await scanBtn.click()
    await page.waitForURL(/\/results/, { timeout: 10_000 })
    await expect(page).toHaveURL(/\/results/)
  })

  test('non-429 errors still show generic error message', async ({ page }) => {
    await mockScanFetch(page, [[500, 'Internal Server Error']])

    await page.goto('/')
    await page.locator('textarea').first().fill('pub fn test() {}')
    await page.locator('button:has-text("Scan Contract")').click()

    // Generic error banner should appear, no countdown
    await expect(page.locator('text=Internal Server Error')).toBeVisible()
    await expect(page.locator('text=Rate limited')).not.toBeVisible()
  })
})
