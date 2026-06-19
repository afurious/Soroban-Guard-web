import { test, expect } from '@playwright/test'
import { encodeFindings } from '../lib/share'

const finding = { check_name: 'perm-check', severity: 'High' as const, file_path: 'src/lib.rs', line: 10, function_name: 'transfer', description: 'Permalink finding' }

test('navigates to results via permalink URL and displays findings', async ({ page }) => {
  const encoded = encodeFindings([finding])
  await page.goto(`/results?r=${encoded}`)
  await page.waitForURL(/\/results/)

  // Verify findings are displayed
  await expect(page.locator('text=perm-check').first()).toBeVisible()
  await expect(page.locator('text=Permalink finding').first()).toBeVisible()
})
