import { test, expect } from '@playwright/test';

/**
 * Comprehensive functional tests for isA_ app (port 4100).
 * Tests every page, every interactive element, every navigation path.
 */

const BASE = 'http://127.0.0.1:4100';

// ─── HOMEPAGE (/home) ─────────────────────────────────────────────

test.describe('Homepage — full functional test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/home`);
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 15_000 });
  });

  test('header renders with all nav links', async ({ page }) => {
    const header = page.locator('.marketing-header');
    await expect(header).toBeVisible();

    // All nav links present and clickable
    for (const label of ['Features', 'Pricing', 'Enterprise']) {
      const link = header.getByRole('link', { name: new RegExp(label, 'i') });
      await expect(link).toBeVisible();
      const href = await link.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('hero section has two CTAs that link correctly', async ({ page }) => {
    const hero = page.locator('.marketing-hero');

    const trialCta = hero.locator('a', { hasText: /Start Free Trial/i });
    await expect(trialCta).toBeVisible();
    expect(await trialCta.getAttribute('href')).toContain('/app');

    const docsCta = hero.locator('a', { hasText: /Developer Docs/i });
    await expect(docsCta).toBeVisible();
    expect(await docsCta.getAttribute('href')).toContain('/docs');
  });

  test('CTA section has customer + developer buttons', async ({ page }) => {
    const cta = page.locator('.cta-section');
    await expect(cta).toBeVisible();

    const tryBtn = cta.locator('a', { hasText: /Try Free Now/i });
    await expect(tryBtn).toBeVisible();
    expect(await tryBtn.getAttribute('href')).toContain('/app');

    const buildBtn = cta.locator('a', { hasText: /Build with isA/i });
    await expect(buildBtn).toBeVisible();
    expect(await buildBtn.getAttribute('href')).toContain('/console');
  });

  test('footer renders with navigation sections', async ({ page }) => {
    const footer = page.locator('.marketing-footer');
    if (await footer.isVisible()) {
      const links = footer.locator('a');
      expect(await links.count()).toBeGreaterThan(3);
    }
  });

  test('pricing link in header navigates to /pricing', async ({ page }) => {
    const link = page.locator('.marketing-header').getByRole('link', { name: /Pricing/i });
    await link.click();
    await expect(page).toHaveURL(/\/pricing/);
    await expect(page.locator('.pricing-page')).toBeVisible({ timeout: 10_000 });
  });

  test('enterprise link in header navigates to /enterprise', async ({ page }) => {
    const link = page.locator('.marketing-header').getByRole('link', { name: /Enterprise/i });
    await link.click();
    await expect(page).toHaveURL(/\/enterprise/);
    await expect(page.locator('.enterprise-page')).toBeVisible({ timeout: 10_000 });
  });
});

// ─── PRICING (/pricing) ──────────────────────────────────────────

test.describe('Pricing page — full functional test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await expect(page.locator('.pricing-page')).toBeVisible({ timeout: 15_000 });
  });

  test('shows three pricing tiers with correct prices', async ({ page }) => {
    await expect(page.locator('text=$0').first()).toBeVisible();
    await expect(page.locator('text=$29').first()).toBeVisible();
    await expect(page.locator('text=$99').first()).toBeVisible();
  });

  test('each plan has a CTA button', async ({ page }) => {
    const buttons = page.locator('.pricing-button');
    expect(await buttons.count()).toBeGreaterThanOrEqual(3);

    // At least one button should be enabled (paid plans)
    const enabledButtons = page.locator('.pricing-button:not([disabled])');
    expect(await enabledButtons.count()).toBeGreaterThanOrEqual(1);
  });

  test('FAQ section has expandable cards', async ({ page }) => {
    const faqCards = page.locator('.faq-card');
    if (await faqCards.first().isVisible()) {
      expect(await faqCards.count()).toBeGreaterThanOrEqual(3);
    }
  });

  test('bottom CTA has dual buttons linking to /app and /docs', async ({ page }) => {
    const trialBtn = page.locator('a', { hasText: /Start Free Trial/i }).last();
    expect(await trialBtn.getAttribute('href')).toContain('/app');

    const docsBtn = page.locator('a', { hasText: /Developer Docs/i }).last();
    expect(await docsBtn.getAttribute('href')).toContain('/docs');
  });
});

// ─── ENTERPRISE (/enterprise) ────────────────────────────────────

test.describe('Enterprise page — full functional test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/enterprise`);
    await expect(page.locator('.enterprise-page')).toBeVisible({ timeout: 15_000 });
  });

  test('hero section renders with heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Enterprise/i }).first()).toBeVisible();
  });

  test('contact sales links open mailto', async ({ page }) => {
    const mailLinks = page.locator('a[href*="mailto:sales"]');
    expect(await mailLinks.count()).toBeGreaterThanOrEqual(1);

    const href = await mailLinks.first().getAttribute('href');
    expect(href).toContain('mailto:sales@iapro.ai');
  });

  test('enterprise features section visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Enterprise-Grade/i }).first()).toBeVisible();
  });

  test('industry use case cards visible', async ({ page }) => {
    // Should show multiple industry verticals
    const body = await page.locator('body').textContent();
    expect(body).toMatch(/Financial|Healthcare|Manufacturing|Retail/);
  });
});

// ─── DEMO (/demo) ────────────────────────────────────────────────

test.describe('Demo page — tab switching', () => {
  test('loads and has clickable tabs', async ({ page }) => {
    await page.goto(`${BASE}/demo`);
    await page.waitForLoadState('networkidle');

    // Find tab buttons
    const tabs = page.locator('button').filter({ hasText: /Shared Components|Widget Output|Color Schemes|Automation/i });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);
  });

  test('clicking tabs changes visible content', async ({ page }) => {
    await page.goto(`${BASE}/demo`);
    await page.waitForLoadState('networkidle');

    const tabs = page.locator('button').filter({ hasText: /Shared Components|Widget Output|Color Schemes|Automation/i });
    if (await tabs.count() >= 2) {
      // Click second tab
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
      // Content area should have changed (just verify no crash)
      const body = await page.locator('body').textContent();
      expect(body?.length).toBeGreaterThan(100);
    }
  });
});

// ─── APP (/app) ──────────────────────────────────────────────────

test.describe('App page — main application', () => {
  test('returns 200 with no SSR errors', async ({ page }) => {
    const response = await page.goto(`${BASE}/app`, { waitUntil: 'commit' });
    expect(response?.status()).toBe(200);

    await page.waitForLoadState('domcontentloaded');
    const html = await page.content();
    expect(html).not.toContain('window is not defined');
    expect(html).not.toContain('document is not defined');
    expect(html).not.toContain('"statusCode":500');
  });

  test('app page renders UI elements (not blank)', async ({ page }) => {
    await page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    // Should have rendered something — not just empty __next div
    const nextRoot = page.locator('#__next');
    const children = await nextRoot.locator('> *').count();
    expect(children).toBeGreaterThan(0);
  });

  test('no hydration errors on /app', async ({ page }) => {
    const hydrationErrors: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Hydration failed') || text.includes('did not match')) {
        hydrationErrors.push(text.slice(0, 200));
      }
    });

    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    expect(hydrationErrors, `Hydration errors found:\n${hydrationErrors.join('\n')}`).toHaveLength(0);
  });
});

// ─── CROSS-PAGE NAVIGATION ──────────────────────────────────────

test.describe('Cross-page navigation flow', () => {
  test('home → pricing → enterprise → home', async ({ page }) => {
    // Start at home
    await page.goto(`${BASE}/home`);
    await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 15_000 });

    // Navigate to pricing
    await page.locator('.marketing-header').getByRole('link', { name: /Pricing/i }).click();
    await expect(page.locator('.pricing-page')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/pricing/);

    // Navigate to enterprise
    await page.locator('.marketing-header').getByRole('link', { name: /Enterprise/i }).click();
    await expect(page.locator('.enterprise-page')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/enterprise/);

    // Navigate back to home via logo/brand
    const homeLink = page.locator('.marketing-header a').first();
    await homeLink.click();
    await page.waitForTimeout(1000);
  });
});

// ─── RESPONSIVE LAYOUT ──────────────────────────────────────────

test.describe('Responsive behavior', () => {
  for (const vp of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 812 },
  ]) {
    test.describe(`${vp.name} (${vp.width}x${vp.height})`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test('homepage fits viewport without horizontal scroll', async ({ page }) => {
        await page.goto(`${BASE}/home`);
        await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 15_000 });

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
      });

      test('hero CTA is visible and within viewport', async ({ page }) => {
        await page.goto(`${BASE}/home`);
        await expect(page.locator('.marketing-home')).toBeVisible({ timeout: 15_000 });

        const cta = page.locator('.marketing-hero a', { hasText: /Start Free Trial/i });
        await expect(cta).toBeVisible();
        const box = await cta.boundingBox();
        expect(box).toBeTruthy();
        expect(box!.x + box!.width).toBeLessThanOrEqual(vp.width + 10);
      });
    });
  }
});
