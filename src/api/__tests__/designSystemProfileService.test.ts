import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  DESIGN_SYSTEM_PROFILE_STORAGE_KEY,
  buildDesignSystemProfile,
  loadDesignSystemProfile,
  normalizeDesignTokens,
  saveDesignSystemProfile,
  shouldShowDesignSystemOnboarding,
} from '../designSystemProfileService';

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_ENDPOINTS: {
    ACCOUNTS: {
      ME: 'http://gateway.test/api/v1/accounts/me',
    },
  },
}));

vi.mock('../../stores/authTokenStore', () => ({
  authTokenStore: { getToken: () => 'mock-token' },
}));

vi.mock('../../utils/authCookieHelper', () => ({
  getCredentialsMode: () => 'include',
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

describe('designSystemProfileService', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorageMock);
    vi.stubGlobal('fetch', vi.fn());
    vi.setSystemTime(new Date('2026-04-23T08:00:00.000Z'));
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('normalizes Creative brand extraction tokens into app design tokens', () => {
    const tokens = normalizeDesignTokens({
      colors: { primary: '#101828', secondary: '#667085', accent: '#f97316' },
      fonts: { heading: 'Fraunces', body: 'DM Sans' },
      borderRadius: '18px',
    });

    expect(tokens.colors.primary).toBe('#101828');
    expect(tokens.colors.secondary).toBe('#667085');
    expect(tokens.colors.accent).toBe('#f97316');
    expect(tokens.typography.heading).toBe('Fraunces');
    expect(tokens.typography.body).toBe('DM Sans');
    expect(tokens.radii.lg).toBe('18px');
  });

  test('builds a completed URL-sourced profile from extracted tokens', () => {
    const profile = buildDesignSystemProfile({
      source: 'url',
      sourceValue: 'https://example.com',
      tokens: normalizeDesignTokens({ colors: ['#111111', '#eeeeee', '#ff6600'] }),
    });

    expect(profile.source).toBe('url');
    expect(profile.sourceValue).toBe('https://example.com');
    expect(profile.completedAt).toBe('2026-04-23T08:00:00.000Z');
    expect(profile.tokens.colors.primary).toBe('#111111');
    expect(profile.tokens.colors.secondary).toBe('#eeeeee');
    expect(profile.tokens.colors.accent).toBe('#ff6600');
  });

  test('shows onboarding only on first Design mode entry', () => {
    expect(shouldShowDesignSystemOnboarding('chat', null, false)).toBe(false);
    expect(shouldShowDesignSystemOnboarding('design', null, false)).toBe(true);
    expect(
      shouldShowDesignSystemOnboarding(
        'design',
        buildDesignSystemProfile({ source: 'defaults', skipped: true }),
        false,
      ),
    ).toBe(false);
    expect(shouldShowDesignSystemOnboarding('design', null, true)).toBe(false);
  });

  test('saves locally and attempts to sync profile into isA_user preferences', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preferences: { theme: 'dark' } }),
      } as Response);
    const profile = buildDesignSystemProfile({ source: 'manual' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        preferences: { theme: 'dark', design_system_profile: profile },
      }),
    } as Response);

    const result = await saveDesignSystemProfile(profile);

    expect(result).toEqual({ local: true, remote: true });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      DESIGN_SYSTEM_PROFILE_STORAGE_KEY,
      JSON.stringify(profile),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://gateway.test/api/v1/accounts/me',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({
          preferences: {
            theme: 'dark',
            design_system_profile: profile,
          },
        }),
      }),
    );
  });

  test('loads local profile before making a network request', async () => {
    const profile = buildDesignSystemProfile({ source: 'manual' });
    localStorageMock.setItem(DESIGN_SYSTEM_PROFILE_STORAGE_KEY, JSON.stringify(profile));

    await expect(loadDesignSystemProfile()).resolves.toEqual(profile);
    expect(fetch).not.toHaveBeenCalled();
  });
});
