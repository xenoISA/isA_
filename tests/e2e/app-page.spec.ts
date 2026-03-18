import { test, expect } from '@playwright/test';

/**
 * E2E tests for /app page — the main chat application.
 * These tests verify the app actually loads and renders functional UI.
 */

test.describe('App Page (/app)', () => {
  test('returns 200 (no SSR crash)', async ({ page }) => {
    const response = await page.goto('/app', { waitUntil: 'commit' });
    expect(response?.status()).toBe(200);

    // Wait for DOM to load — the page may redirect or show auth
    await page.waitForLoadState('domcontentloaded');

    // Verify no SSR error in the page source
    const html = await page.content();
    expect(html).not.toContain('window is not defined');
    expect(html).not.toContain('document is not defined');
    expect(html).not.toContain('"statusCode":500');
  });

  test('renders app layout (not Next.js error dialog)', async ({ page }) => {
    await page.goto('/app');
    await page.waitForLoadState('networkidle');

    // Next.js error dialog indicates a runtime crash — should not be present
    // Note: #__next-build-watcher is normal in dev mode, ignore it
    const errorDialog = page.locator('[data-nextjs-dialog-overlay]');
    await expect(errorDialog).toHaveCount(0);
  });
});

test.describe('Cross-surface CTA links', () => {
  test('homepage "Start Free Trial" links to /app', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 15_000 });

    const trialLink = page.locator('.marketing-hero a', { hasText: /Start Free Trial/i });
    await expect(trialLink).toBeVisible();
    const href = await trialLink.getAttribute('href');
    expect(href).toContain('/app');
  });

  test('homepage "Developer Docs" links to /docs', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 15_000 });

    const docsLink = page.locator('.marketing-hero a', { hasText: /Developer Docs/i });
    await expect(docsLink).toBeVisible();
    const href = await docsLink.getAttribute('href');
    expect(href).toContain('/docs');
  });

  test('CTA "Build with isA" links to /console', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 15_000 });

    const buildLink = page.locator('a', { hasText: /Build with isA/i });
    await expect(buildLink).toBeVisible();
    const href = await buildLink.getAttribute('href');
    expect(href).toContain('/console');
  });
});
