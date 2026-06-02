import { test, expect } from '@playwright/test'

test.describe('Wallet Connect flow', () => {
  test('connects and disconnects when Freighter is present', async ({ page }) => {
    // Inject a mock Freighter API before the page loads
    await page.addInitScript(() => {
      ;(window as any).freighter = {
        isConnected: async () => true,
        getPublicKey: async () => 'GTESTPUBLICKEYABCDEFGHIJKLMNOP',
        getNetworkDetails: async () => ({ networkPassphrase: 'Test SDF Network ; September 2015', networkUrl: '' }),
      }
    })

    await page.goto('/')

    // Connect button should be visible
    const connect = page.locator('button:has-text("Connect Freighter")')
    await expect(connect).toBeVisible()
    await connect.click()

    // After connecting, Disconnect should be visible
    const disconnect = page.locator('button:has-text("Disconnect")')
    await expect(disconnect).toBeVisible()

    // Click disconnect and ensure connect button reappears
    await disconnect.click()
    await expect(page.locator('button:has-text("Connect Freighter")')).toBeVisible()
  })
})
