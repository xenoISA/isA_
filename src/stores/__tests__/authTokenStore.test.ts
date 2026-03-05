import { describe, test, expect, beforeEach } from 'vitest';
import { authTokenStore } from '../authTokenStore';

describe('authTokenStore', () => {
  beforeEach(() => {
    authTokenStore.clearToken();
  });

  test('starts with no token', () => {
    expect(authTokenStore.getToken()).toBeNull();
    expect(authTokenStore.hasToken()).toBe(false);
  });

  test('setToken stores a token', () => {
    authTokenStore.setToken('abc123');
    expect(authTokenStore.getToken()).toBe('abc123');
    expect(authTokenStore.hasToken()).toBe(true);
  });

  test('clearToken removes the token', () => {
    authTokenStore.setToken('abc123');
    authTokenStore.clearToken();
    expect(authTokenStore.getToken()).toBeNull();
    expect(authTokenStore.hasToken()).toBe(false);
  });

  test('setToken(null) clears the token', () => {
    authTokenStore.setToken('abc123');
    authTokenStore.setToken(null);
    expect(authTokenStore.hasToken()).toBe(false);
  });
});
