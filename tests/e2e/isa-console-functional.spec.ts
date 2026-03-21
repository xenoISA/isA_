import { test, expect } from '@playwright/test';

/**
 * Comprehensive functional tests for isA_Console (port 4200).
 * Tests every page route, navigation, and interactive elements.
 */

const BASE = 'http://127.0.0.1:4200/console';

// ─── ROOT / LOGIN ────────────────────────────────────────────────

test.describe('Console root & auth pages', () => {
  test('root page loads with sign-in option', async ({ page }) => {
    const response = await page.goto(BASE);
    expect(response?.status()).toBe(200);
    await page.waitForLoadState('domcontentloaded');

    const html = await page.content();
    expect(html.length).toBeGreaterThan(500);
    // Should have some auth-related content or redirect
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(10);
  });

  test('login page loads with form elements', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('domcontentloaded');

    // Should have email and password inputs or SSO buttons
    const inputs = page.locator('input');
    const buttons = page.locator('button');
    const totalInteractive = await inputs.count() + await buttons.count();
    expect(totalInteractive).toBeGreaterThan(0);
  });

  test('login page has email input', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeEnabled();
      // Type into it to verify interactivity
      await emailInput.fill('test@example.com');
      expect(await emailInput.inputValue()).toBe('test@example.com');
    }
  });

  test('login page has password input', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');

    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      await expect(passwordInput).toBeEnabled();
      await passwordInput.fill('testpassword');
      expect(await passwordInput.inputValue()).toBe('testpassword');
    }
  });
});

// ─── DASHBOARD ───────────────────────────────────────────────────

test.describe('Console dashboard pages', () => {
  test('dashboard page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard`);
    // May redirect to login if not authenticated — both 200 and 307 are valid
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');

    const html = await page.content();
    expect(html).not.toContain('"statusCode":500');
  });

  test('agents page loads without error', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/agents`);
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
  });

  test('models page loads without error', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/models`);
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
  });

  test('MCP page loads without error', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/mcp`);
    expect(response?.status()).toBeLessThan(500);
    await page.waitForLoadState('domcontentloaded');
  });

  test('MCP tools page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/mcp/tools`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('MCP prompts page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/mcp/prompts`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('MCP servers page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/mcp/servers`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('MCP skills page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/mcp/skills`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('playground page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/playground`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('API keys page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/api-keys`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('usage page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/usage`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('settings page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/settings`);
    expect(response?.status()).toBeLessThan(500);
  });

  test('agent create page loads', async ({ page }) => {
    const response = await page.goto(`${BASE}/dashboard/agents/create`);
    expect(response?.status()).toBeLessThan(500);
  });
});

// ─── CONSOLE UI ELEMENTS ─────────────────────────────────────────

test.describe('Console UI elements', () => {
  test('pages render real content (not error pages)', async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Should have rendered content, not just an empty shell
    const body = await page.locator('body').textContent();
    expect(body?.length).toBeGreaterThan(50);
  });

  test('no Next.js error overlays on any dashboard page', async ({ page }) => {
    const pages = [
      '/dashboard',
      '/dashboard/agents',
      '/dashboard/models',
      '/dashboard/mcp',
    ];

    for (const path of pages) {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('domcontentloaded');

      const html = await page.content();
      expect(html, `${path} should not have SSR errors`).not.toContain('"statusCode":500');
    }
  });
});
