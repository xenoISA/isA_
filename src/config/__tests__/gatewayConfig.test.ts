import { describe, test, expect } from 'vitest';
import {
  GATEWAY_CONFIG,
  GATEWAY_SERVICES,
  GATEWAY_ENDPOINTS,
  buildUrlWithParams,
  requiresAuth,
  mapLegacyUrl,
  SSE_CONFIG,
} from '../gatewayConfig';

describe('GATEWAY_CONFIG', () => {
  test('BASE_URL is a valid URL', () => {
    expect(GATEWAY_CONFIG.BASE_URL).toMatch(/^https?:\/\/.+/);
  });

  test('timeout values are positive', () => {
    expect(GATEWAY_CONFIG.TIMEOUT.DEFAULT).toBeGreaterThan(0);
    expect(GATEWAY_CONFIG.TIMEOUT.CHAT_SSE).toBeGreaterThan(0);
    expect(GATEWAY_CONFIG.TIMEOUT.UPLOAD).toBeGreaterThan(0);
  });

  test('auth keys are defined', () => {
    expect(GATEWAY_CONFIG.AUTH.TOKEN_KEY).toBeTruthy();
    expect(GATEWAY_CONFIG.AUTH.AUTH_HEADER).toBe('Authorization');
  });
});

describe('GATEWAY_SERVICES', () => {
  test('core services are defined', () => {
    expect(GATEWAY_SERVICES.AGENTS).toBe('agents');
    expect(GATEWAY_SERVICES.ACCOUNTS).toBe('accounts');
    expect(GATEWAY_SERVICES.SESSIONS).toBe('sessions');
    expect(GATEWAY_SERVICES.AUTH).toBe('auth');
  });
});

describe('GATEWAY_ENDPOINTS', () => {
  test('agent endpoints are constructed from base URL', () => {
    expect(GATEWAY_ENDPOINTS.AGENTS.BASE).toContain(GATEWAY_CONFIG.BASE_URL);
    expect(GATEWAY_ENDPOINTS.AGENTS.CHAT).toContain('/chat');
  });

  test('health endpoint is at base URL', () => {
    expect(GATEWAY_ENDPOINTS.HEALTH).toBe(`${GATEWAY_CONFIG.BASE_URL}/health`);
  });
});

describe('buildUrlWithParams', () => {
  test('replaces single placeholder', () => {
    const result = buildUrlWithParams('/users/{userId}/credits', { userId: '123' });
    expect(result).toBe('/users/123/credits');
  });

  test('replaces multiple placeholders', () => {
    const result = buildUrlWithParams('/orgs/{orgId}/users/{userId}', {
      orgId: 'org1',
      userId: 'u2',
    });
    expect(result).toBe('/orgs/org1/users/u2');
  });

  test('encodes special characters', () => {
    const result = buildUrlWithParams('/users/{userId}', { userId: 'a b&c' });
    expect(result).toBe('/users/a%20b%26c');
  });
});

describe('requiresAuth', () => {
  test('health and ready endpoints do not require auth', () => {
    expect(requiresAuth('/api/v1/health')).toBe(false);
    expect(requiresAuth('/ready')).toBe(false);
  });

  test('other endpoints require auth', () => {
    expect(requiresAuth('/api/v1/agents/chat')).toBe(true);
    expect(requiresAuth('/api/v1/users/me')).toBe(true);
  });
});

describe('mapLegacyUrl', () => {
  test('maps known legacy URLs', () => {
    const mapped = mapLegacyUrl('http://localhost:8080/api/v1/agents/chat');
    expect(mapped).toBe(GATEWAY_ENDPOINTS.AGENTS.CHAT);
  });

  test('fuzzy-maps localhost:8080 URLs', () => {
    const mapped = mapLegacyUrl('http://localhost:8080/custom/path');
    expect(mapped).toContain(GATEWAY_ENDPOINTS.AGENTS.BASE);
    expect(mapped).toContain('/custom/path');
  });

  test('returns original URL if no mapping found', () => {
    const url = 'https://external.api.com/v1/data';
    expect(mapLegacyUrl(url)).toBe(url);
  });
});

describe('SSE_CONFIG', () => {
  test('lists SSE-capable services', () => {
    expect(SSE_CONFIG.SSE_SERVICES).toContain('agents');
    expect(SSE_CONFIG.SSE_SERVICES).toContain('mcp');
  });

  test('isSSEEndpoint identifies SSE endpoints', () => {
    expect(SSE_CONFIG.isSSEEndpoint(GATEWAY_ENDPOINTS.AGENTS.CHAT)).toBe(true);
    expect(SSE_CONFIG.isSSEEndpoint('http://localhost:9080/random')).toBe(false);
  });
});
