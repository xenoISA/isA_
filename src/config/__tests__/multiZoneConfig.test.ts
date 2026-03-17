import { describe, test, expect } from 'vitest';
import { surfaceUrls, surfaceLinks } from '../surfaceConfig';

/**
 * Multi-Zone Configuration Tests
 *
 * Validates that all frontend zones use the correct ports and paths
 * for the unified entry point architecture (Epic #9).
 *
 * Port allocation:
 *   isA_        → 4100 (marketing + agentic chat)
 *   isA_Console → 4200 (management interface, basePath: /console)
 *   isA_Docs    → 4300 (documentation portal, basePath: /docs)
 */

describe('Multi-Zone port allocation', () => {
  test('marketing surface defaults to port 4100', () => {
    expect(surfaceUrls.marketing).toContain('4100');
  });

  test('app surface defaults to port 4100', () => {
    expect(surfaceUrls.app).toContain('4100');
  });

  test('console surface defaults to port 4200', () => {
    expect(surfaceUrls.console).toContain('4200');
  });

  test('docs surface defaults to port 4300', () => {
    expect(surfaceUrls.docs).toContain('4300');
  });
});

describe('Multi-Zone basePath configuration', () => {
  test('console URL includes /console basePath', () => {
    expect(surfaceUrls.console).toContain('/console');
  });

  test('docs URL includes /docs basePath', () => {
    expect(surfaceUrls.docs).toContain('/docs');
  });

  test('app URL includes /app path', () => {
    expect(surfaceUrls.app).toContain('/app');
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

  test('marketing links use marketing base', () => {
    expect(surfaceLinks.marketingHome).toContain(surfaceUrls.marketing);
    expect(surfaceLinks.marketingPricing).toContain(surfaceUrls.marketing);
  });
});

describe('Multi-Zone no port conflicts', () => {
  test('each zone uses a distinct port', () => {
    const portPattern = /:(\d{4})/;
    const appPort = surfaceUrls.marketing.match(portPattern)?.[1];
    const consolePort = surfaceUrls.console.match(portPattern)?.[1];
    const docsPort = surfaceUrls.docs.match(portPattern)?.[1];

    // All three zones must have distinct ports
    expect(appPort).not.toBe(consolePort);
    expect(appPort).not.toBe(docsPort);
    expect(consolePort).not.toBe(docsPort);

    // marketing and app share port 4100 (same zone: isA_)
    const appSurfacePort = surfaceUrls.app.match(portPattern)?.[1];
    expect(appSurfacePort).toBe(appPort);
  });

  test('no surface uses infrastructure ports (3000, 3001, 5173)', () => {
    const forbiddenPorts = ['3000', '3001', '5173', '5174'];

    for (const [key, url] of Object.entries(surfaceUrls)) {
      for (const port of forbiddenPorts) {
        expect(url, `${key} should not use legacy port ${port}`).not.toContain(`:${port}`);
      }
    }
  });
});
