import { test, expect } from '@playwright/test'

const mockFindings = JSON.stringify({
  findings: [
    { check_name: 'export-check', severity: 'Medium', file_path: 'src/lib.rs', line: 2, function_name: 'foo', description: 'Export test' },
  ],
})

function mockScanFetch(page: import('@playwright/test').Page) {
  return page.addInitScript(`
    (() => {
      if (!navigator.clipboard) {
        navigator.clipboard = { writeText: () => Promise.resolve(), readText: () => Promise.resolve('') };
      }
      const originalFetch = window.fetch;
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/scan') && init?.method === 'POST') {
          return new Response(JSON.stringify(${mockFindings}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return originalFetch(input, init);
      };
    })();
  `)
}

test.describe('Export results', () => {
  test('copies findings as JSON to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await mockScanFetch(page)

    await page.goto('/')
    await page.locator('textarea').first().fill('pub fn test() {}')
    await page.locator('button:has-text("Scan Contract")').click()
    await page.waitForURL(/\/results/)

    // Click the copy findings button
    const copyButton = page.locator('button[title="Copy findings as JSON"]')
    await expect(copyButton).toBeVisible()
    await copyButton.click()

    // Verify "Copied" indicator appears
    await expect(page.locator('text=Copied!').first()).toBeVisible()

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardText).toContain('export-check')
  })
})
