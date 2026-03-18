import { test, expect } from '@playwright/test';

/**
 * Responsive design tests across viewport sizes.
 * Verifies marketing pages render correctly at desktop, tablet, and mobile.
 */

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 812 },
];

for (const vp of viewports) {
  test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('homepage renders without overflow', async ({ page }) => {
      await page.goto('/home');
      await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 15_000 });

      // No horizontal scrollbar
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
    });

    test('pricing page renders without overflow', async ({ page }) => {
      await page.goto('/pricing');
      await expect(page.locator('.pricing-page')).toBeVisible({ timeout: 15_000 });

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    });

    test('CTAs are visible and clickable', async ({ page }) => {
      await page.goto('/home');
      await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 15_000 });

      // Primary CTA should be visible at all viewports
      const cta = page.locator('.marketing-hero a', { hasText: /Start Free Trial/i });
      await expect(cta).toBeVisible();

      // CTA should be within viewport bounds
      const box = await cta.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 10);
    });
  });
}
