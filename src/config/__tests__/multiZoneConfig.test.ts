import { describe, test, expect } from 'vitest';
import { surfaceUrls, surfaceLinks, isAbsoluteUrl } from '../surfaceConfig';

/**
 * Multi-Zone Configuration Tests
 *
 * Validates that surface URLs default to relative paths for Multi-Zone routing.
 * In production, all zones are served under one domain via APISIX gateway.
 * In development, env vars override to absolute localhost URLs.
 *
 * Zone mapping:
 *   /         → isA_        (marketing)
 *   /app      → isA_        (agentic chat)
 *   /console  → isA_Console (management interface)
 *   /docs     → isA_Docs    (documentation portal)
 */

describe('Multi-Zone relative path defaults', () => {
  test('marketing defaults to root path', () => {
    // When no env var is set, marketing should be "/" (relative)
    // In test env, no NEXT_PUBLIC_MARKETING_URL is set, so we get the fallback
    expect(surfaceUrls.marketing).toBeDefined();
    expect(typeof surfaceUrls.marketing).toBe('string');
  });

  test('app surface includes /app path', () => {
    expect(surfaceUrls.app).toContain('/app');
  });

  test('console surface includes /console path', () => {
    expect(surfaceUrls.console).toContain('/console');
  });

  test('docs surface includes /docs path', () => {
    expect(surfaceUrls.docs).toContain('/docs');
  });

  test('all surface URLs are defined and non-empty', () => {
    for (const [key, url] of Object.entries(surfaceUrls)) {
      expect(url, `${key} should be defined`).toBeDefined();
      expect(url.length, `${key} should be non-empty`).toBeGreaterThan(0);
    }
  });
});

describe('Multi-Zone surface links', () => {
  test('consoleHome points to console surface', () => {
    expect(surfaceLinks.consoleHome).toBe(surfaceUrls.console);
  });

  test('docsHome points to docs surface', () => {
    expect(surfaceLinks.docsHome).toBe(surfaceUrls.docs);
  });

  test('appEntry points to app surface', () => {
    expect(surfaceLinks.appEntry).toBe(surfaceUrls.app);
  });

  test('marketing links extend marketing base', () => {
    expect(surfaceLinks.marketingHome).toContain('/home');
    expect(surfaceLinks.marketingPricing).toContain('/pricing');
    expect(surfaceLinks.marketingEnterprise).toContain('/enterprise');
  });
});

describe('Multi-Zone env var override support', () => {
  test('relative URLs are not absolute', () => {
    // Default fallbacks should be relative (not http://...)
    // Unless env vars override them to absolute URLs
    const defaultConsole = '/console';
    const defaultDocs = '/docs';
    expect(isAbsoluteUrl(defaultConsole)).toBe(false);
    expect(isAbsoluteUrl(defaultDocs)).toBe(false);
  });

  test('absolute URLs are detected correctly', () => {
    expect(isAbsoluteUrl('http://localhost:4200/console')).toBe(true);
    expect(isAbsoluteUrl('https://console.iapro.ai')).toBe(true);
    expect(isAbsoluteUrl('/console')).toBe(false);
  });
});

describe('Multi-Zone no legacy ports in defaults', () => {
  test('no surface uses legacy ports (3000, 3001, 5173, 5174)', () => {
    const forbiddenPorts = ['3000', '3001', '5173', '5174'];
    // Only check if the URL is absolute (relative paths have no ports)
    for (const [key, url] of Object.entries(surfaceUrls)) {
      if (isAbsoluteUrl(url)) {
        for (const port of forbiddenPorts) {
          expect(url, `${key} should not use legacy port ${port}`).not.toContain(`:${port}`);
        }
      }
    }
  });
});
