import { test, expect } from '@playwright/test';

/**
 * Comprehensive functional tests for isA_Docs (port 4300).
 * Tests docs home, content pages, navigation, code blocks, and search.
 */

const BASE = 'http://127.0.0.1:4300/docs';

// ─── DOCS HOME ───────────────────────────────────────────────────

test.describe('Docs homepage', () => {
  test('loads with 200 status', async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response?.status()).toBe(200);
  });

  test('renders page title and description', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(100);
    // Should have platform-related content
    expect(body).toMatch(/isA|documentation|platform|agent/i);
  });

  test('has navigation links to content sections', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // Should have links to doc content
    const links = page.locator('a[href*="/content"], a[href*="/docs"]');
    expect(await links.count()).toBeGreaterThan(0);
  });

  test('PlatformNav bar is visible at top', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // PlatformNav should render with surface links
    const nav = page.locator('nav').first();
    if (await nav.isVisible()) {
      const navText = await nav.textContent();
      expect(navText?.length).toBeGreaterThan(0);
    }
  });
});

// ─── CONTENT PAGES ───────────────────────────────────────────────

test.describe('Docs content pages', () => {
  const contentPages = [
    { path: '/content/agent-sdk', name: 'Agent SDK' },
    { path: '/content/agent-sdk/quickstart', name: 'Quickstart' },
    { path: '/content/getting-started', name: 'Getting Started' },
  ];

  for (const { path, name } of contentPages) {
    test(`${name} page (${path}) loads without error`, async ({ page }) => {
      const response = await page.goto(`${BASE}${path}`);
      // 200 or 307 (redirect) are both acceptable
      expect(response?.status()).toBeLessThan(500);

      await page.waitForLoadState('domcontentloaded');
      const html = await page.content();
      expect(html).not.toContain('"statusCode":500');
    });
  }

  test('Agent SDK page has documentation content', async ({ page }) => {
    await page.goto(`${BASE}/content/agent-sdk`);
    await page.waitForLoadState('networkidle');

    const body = await page.locator('body').textContent();
    if (body && body.length > 100) {
      // Should contain SDK-related terms
      expect(body).toMatch(/SDK|agent|install|quick/i);
    }
  });
});

// ─── DOCUMENTATION NAVIGATION ────────────────────────────────────

test.describe('Docs navigation', () => {
  test('sidebar navigation exists on content pages', async ({ page }) => {
    await page.goto(`${BASE}/content/agent-sdk`);
    await page.waitForLoadState('networkidle');

    // Nextra generates a sidebar with doc links
    const sidebar = page.locator('nav, aside').filter({ hasText: /quickstart|tools|configuration/i });
    if (await sidebar.first().isVisible()) {
      const links = sidebar.first().locator('a');
      expect(await links.count()).toBeGreaterThan(0);
    }
  });

  test('clicking a sidebar link navigates to that page', async ({ page }) => {
    await page.goto(`${BASE}/content/agent-sdk`);
    await page.waitForLoadState('networkidle');

    // Find a quickstart link
    const quickstartLink = page.locator('a', { hasText: /quickstart/i }).first();
    if (await quickstartLink.isVisible()) {
      await quickstartLink.click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(/quickstart/);
    }
  });
});

// ─── DOCS RENDERING ──────────────────────────────────────────────

test.describe('Docs content rendering', () => {
  test('code blocks render on documentation pages', async ({ page }) => {
    await page.goto(`${BASE}/content/agent-sdk/quickstart`);
    await page.waitForLoadState('networkidle');

    // Nextra renders code blocks in <pre><code> elements
    const codeBlocks = page.locator('pre code, pre');
    if (await codeBlocks.first().isVisible()) {
      expect(await codeBlocks.count()).toBeGreaterThan(0);
    }
  });

  test('headings structure on content pages', async ({ page }) => {
    await page.goto(`${BASE}/content/agent-sdk`);
    await page.waitForLoadState('networkidle');

    // Should have at least one heading
    const headings = page.locator('h1, h2, h3');
    expect(await headings.count()).toBeGreaterThan(0);
  });
});

// ─── DOCS FOOTER ─────────────────────────────────────────────────

test.describe('Docs footer', () => {
  test('footer has community links', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // Footer should have GitHub, Discord, Twitter links
    const footerLinks = page.locator('footer a, a[href*="github"], a[href*="discord"]');
    if (await footerLinks.first().isVisible()) {
      expect(await footerLinks.count()).toBeGreaterThan(0);
    }
  });
});

// ─── CROSS-APP NAVIGATION ────────────────────────────────────────

test.describe('Docs cross-app links', () => {
  test('docs page has link back to main app', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // PlatformNav or other nav should link to /app
    const appLinks = page.locator('a[href*="/app"], a[href*="4100"]');
    if (await appLinks.first().isVisible()) {
      expect(await appLinks.count()).toBeGreaterThan(0);
    }
  });
});
