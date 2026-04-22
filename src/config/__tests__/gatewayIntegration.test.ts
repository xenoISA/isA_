import { describe, test, expect } from 'vitest';
import {
  GATEWAY_CONFIG,
  GATEWAY_SERVICES,
  GATEWAY_ENDPOINTS,
  LEGACY_TO_GATEWAY_MAP,
  mapLegacyUrl,
  buildUrlWithParams,
  requiresAuth,
  getAuthHeaders,
  saveAuthToken,
  clearAuth,
  SSE_CONFIG,
} from '../gatewayConfig';

/**
 * L3 Integration Tests — Gateway API endpoint configuration.
 *
 * These verify that all gateway endpoints are correctly constructed,
 * legacy URL mapping works end-to-end, and the auth/SSE subsystems
 * are internally consistent.
 */

describe('Gateway endpoint construction', () => {
  test('all service endpoints start with gateway base URL', () => {
    const base = GATEWAY_CONFIG.BASE_URL;
    const endpointGroups = [
      GATEWAY_ENDPOINTS.AGENTS,
      GATEWAY_ENDPOINTS.MATE,
      GATEWAY_ENDPOINTS.MCP,
      GATEWAY_ENDPOINTS.ACCOUNTS,
      GATEWAY_ENDPOINTS.SESSIONS,
      GATEWAY_ENDPOINTS.AUTH,
      GATEWAY_ENDPOINTS.NOTIFICATION,
      GATEWAY_ENDPOINTS.PAYMENT,
    ];

    for (const group of endpointGroups) {
      const baseUrl = typeof group === 'string' ? group : (group as any).BASE;
      expect(baseUrl).toContain(base.replace(/^https?:\/\//, '').split(':')[0]);
    }
  });

  test('AGENTS endpoints include service path', () => {
    expect(GATEWAY_ENDPOINTS.AGENTS.CHAT).toContain('/chat');
    expect(GATEWAY_ENDPOINTS.AGENTS.HEALTH).toContain('/health');
    expect(GATEWAY_ENDPOINTS.AGENTS.EXECUTION.STATUS).toContain('/execution/status');
    expect(GATEWAY_ENDPOINTS.AGENTS.EXECUTION.RESUME_STREAM).toContain('/execution/resume-stream');
  });

  test('MATE endpoints include /v1/ paths', () => {
    expect(GATEWAY_ENDPOINTS.MATE.CHAT).toContain('/v1/chat');
    expect(GATEWAY_ENDPOINTS.MATE.QUERY).toContain('/v1/query');
    expect(GATEWAY_ENDPOINTS.MATE.TOOLS).toContain('/v1/tools');
    expect(GATEWAY_ENDPOINTS.MATE.SKILLS).toContain('/v1/skills');
    expect(GATEWAY_ENDPOINTS.MATE.TEAMS).toContain('/v1/teams');
    expect(GATEWAY_ENDPOINTS.MATE.MEMORY.SESSIONS).toContain('/v1/memory/sessions');
    expect(GATEWAY_ENDPOINTS.MATE.MEMORY.TURNS).toContain('/v1/memory/turns');
  });

  test('SESSIONS endpoints include /api/v1/ paths', () => {
    expect(GATEWAY_ENDPOINTS.SESSIONS.LIST).toContain('/api/v1/sessions');
    expect(GATEWAY_ENDPOINTS.SESSIONS.CREATE).toContain('/api/v1/sessions');
    expect(GATEWAY_ENDPOINTS.SESSIONS.SEARCH).toContain('/api/v1/sessions/search');
  });

  test('ACCOUNTS endpoints include user paths', () => {
    expect(GATEWAY_ENDPOINTS.ACCOUNTS.ME).toContain('/api/v1/users/me');
    expect(GATEWAY_ENDPOINTS.ACCOUNTS.ENSURE).toContain('/api/v1/users/ensure');
    expect(GATEWAY_ENDPOINTS.ACCOUNTS.CREDITS).toContain('{userId}');
  });

  test('AUTH endpoints include auth paths', () => {
    expect(GATEWAY_ENDPOINTS.AUTH.VERIFY_TOKEN).toContain('/api/v1/auth/verify-token');
    expect(GATEWAY_ENDPOINTS.AUTH.DEV_TOKEN).toContain('/api/v1/auth/dev-token');
  });
});

describe('Legacy URL migration (end-to-end)', () => {
  test('all legacy URLs in LEGACY_TO_GATEWAY_MAP resolve to gateway endpoints', () => {
    for (const [legacyUrl, gatewayUrl] of Object.entries(LEGACY_TO_GATEWAY_MAP)) {
      expect(legacyUrl).toMatch(/^http:\/\/localhost:\d+/);
      expect(gatewayUrl).toContain(GATEWAY_CONFIG.BASE_URL);
    }
  });

  test('mapLegacyUrl resolves all known legacy agent URLs', () => {
    const agentUrls = Object.keys(LEGACY_TO_GATEWAY_MAP).filter(u => u.includes(':8080'));
    for (const url of agentUrls) {
      const mapped = mapLegacyUrl(url);
      expect(mapped).not.toBe(url);
      expect(mapped).toContain(GATEWAY_CONFIG.BASE_URL);
    }
  });

  test('mapLegacyUrl resolves all known legacy session URLs', () => {
    const sessionUrls = Object.keys(LEGACY_TO_GATEWAY_MAP).filter(u => u.includes(':3000'));
    for (const url of sessionUrls) {
      const mapped = mapLegacyUrl(url);
      expect(mapped).not.toBe(url);
    }
  });

  test('mapLegacyUrl resolves unknown localhost:8080 URLs via fuzzy match', () => {
    const mapped = mapLegacyUrl('http://localhost:8080/some/new/endpoint');
    expect(mapped).toContain(GATEWAY_ENDPOINTS.AGENTS.BASE);
    expect(mapped).toContain('/some/new/endpoint');
  });

  test('mapLegacyUrl passes through external URLs unchanged', () => {
    const external = 'https://api.stripe.com/v1/charges';
    expect(mapLegacyUrl(external)).toBe(external);
  });
});

describe('URL param builder (end-to-end)', () => {
  test('builds real credit consumption URL', () => {
    const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ACCOUNTS.CREDITS, { userId: 'user_123' });
    expect(url).toContain('/user_123/credits/consume');
    expect(url).not.toContain('{userId}');
  });

  test('builds real session URL', () => {
    const template = GATEWAY_ENDPOINTS.SESSIONS.GET;
    const url = buildUrlWithParams(template, { sessionId: 'sess_abc' });
    expect(url).toContain('/sess_abc');
    expect(url).not.toContain('{sessionId}');
  });

  test('encodes special characters in params', () => {
    const url = buildUrlWithParams('/users/{userId}', { userId: 'user@test.com' });
    expect(url).toContain('user%40test.com');
  });
});

describe('Auth subsystem integration', () => {
  test('saveAuthToken + getAuthHeaders round-trip', () => {
    clearAuth();
    saveAuthToken('test-jwt-token');
    const headers = getAuthHeaders();
    expect(headers.Authorization).toBe('Bearer test-jwt-token');
  });

  test('clearAuth removes token from headers', () => {
    saveAuthToken('token-to-clear');
    clearAuth();
    const headers = getAuthHeaders();
    expect(headers.Authorization).toBeUndefined();
  });

  test('getAuthHeaders returns empty when no token set', () => {
    clearAuth();
    const headers = getAuthHeaders();
    expect(Object.keys(headers)).toHaveLength(0);
  });
});

describe('SSE configuration consistency', () => {
  test('all SSE endpoints are valid gateway URLs', () => {
    const sseEndpoints = Object.values(SSE_CONFIG.SSE_ENDPOINTS);
    for (const endpoint of sseEndpoints) {
      expect(typeof endpoint).toBe('string');
      expect(endpoint.length).toBeGreaterThan(0);
    }
  });

  test('isSSEEndpoint identifies all registered SSE endpoints', () => {
    expect(SSE_CONFIG.isSSEEndpoint(GATEWAY_ENDPOINTS.AGENTS.CHAT)).toBe(true);
    expect(SSE_CONFIG.isSSEEndpoint(GATEWAY_ENDPOINTS.MATE.CHAT)).toBe(true);
    expect(SSE_CONFIG.isSSEEndpoint(GATEWAY_ENDPOINTS.MCP.TOOLS_CALL)).toBe(true);
  });

  test('isSSEEndpoint rejects non-SSE endpoints', () => {
    expect(SSE_CONFIG.isSSEEndpoint(GATEWAY_ENDPOINTS.ACCOUNTS.ME)).toBe(false);
    expect(SSE_CONFIG.isSSEEndpoint(GATEWAY_ENDPOINTS.SESSIONS.LIST)).toBe(false);
    expect(SSE_CONFIG.isSSEEndpoint('https://random.url/path')).toBe(false);
  });

  test('SSE services list includes all streaming backends', () => {
    expect(SSE_CONFIG.SSE_SERVICES).toContain('agents');
    expect(SSE_CONFIG.SSE_SERVICES).toContain('mate');
    expect(SSE_CONFIG.SSE_SERVICES).toContain('mcp');
  });
});

describe('Service name consistency', () => {
  test('all GATEWAY_SERVICES values are lowercase strings', () => {
    for (const [key, value] of Object.entries(GATEWAY_SERVICES)) {
      expect(typeof value).toBe('string');
      expect(value).toBe(value.toLowerCase());
    }
  });

  test('requiresAuth is consistent with endpoint patterns', () => {
    // Health endpoints should not require auth
    expect(requiresAuth(GATEWAY_ENDPOINTS.AGENTS.HEALTH)).toBe(false);
    expect(requiresAuth(GATEWAY_ENDPOINTS.HEALTH)).toBe(false);
    expect(requiresAuth(GATEWAY_ENDPOINTS.READY)).toBe(false);

    // Business endpoints should require auth
    expect(requiresAuth(GATEWAY_ENDPOINTS.AGENTS.CHAT)).toBe(true);
    expect(requiresAuth(GATEWAY_ENDPOINTS.ACCOUNTS.ME)).toBe(true);
    expect(requiresAuth(GATEWAY_ENDPOINTS.SESSIONS.LIST)).toBe(true);
  });
});
