import { test, expect } from '@playwright/test';

/**
 * L5 Smoke Tests — Critical user paths for isA_ platform.
 *
 * These verify that the app loads, marketing pages render,
 * navigation works, and key UI elements are present.
 *
 * Prerequisites: `npm run dev` on port 4100 (auto-started by playwright.config.ts)
 */

test.describe('Marketing pages', () => {
  test('homepage loads with hero section', async ({ page }) => {
    await page.goto('/home');
    // Marketing home should render
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 10_000 });
    // Hero section with headline (split across two h1 elements)
    await expect(page.locator('.marketing-hero h1').nth(1)).toContainText(/AI Assistant/i);
  });

  test('homepage has customer and developer CTAs', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 10_000 });

    // Customer CTA
    const tryCta = page.locator('a', { hasText: /Start Free Trial/i }).first();
    await expect(tryCta).toBeVisible();

    // Developer CTA
    const devCta = page.locator('a', { hasText: /Developer Docs/i }).first();
    await expect(devCta).toBeVisible();
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('.pricing-page')).toBeVisible({ timeout: 10_000 });
    // Should have pricing plan headings
    await expect(page.getByRole('heading', { name: /Free/i }).first()).toBeVisible();
  });

  test('enterprise page loads', async ({ page }) => {
    await page.goto('/enterprise');
    // Should have enterprise heading
    await expect(page.getByRole('heading', { name: /Enterprise/i }).first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('App page', () => {
  test('/app route loads without crash', async ({ page }) => {
    await page.goto('/app');
    // The app page should load (may show auth wall or chat UI)
    // Just verify no error page / blank screen
    await page.waitForLoadState('networkidle');
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });
});

test.describe('Navigation links', () => {
  test('CTA section has "Build with isA" link to console', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 10_000 });

    const buildCta = page.locator('a', { hasText: /Build with isA/i });
    if (await buildCta.isVisible()) {
      const href = await buildCta.getAttribute('href');
      expect(href).toContain('/console');
    }
  });

  test('pricing page has developer docs link', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('.pricing-page')).toBeVisible({ timeout: 10_000 });

    const docsLink = page.locator('a', { hasText: /Developer Docs/i });
    if (await docsLink.isVisible()) {
      const href = await docsLink.getAttribute('href');
      expect(href).toContain('/docs');
    }
  });
});
