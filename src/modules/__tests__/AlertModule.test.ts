import { describe, expect, test } from 'vitest';

import { resolveAlertUserId } from '../AlertModule';

describe('AlertModule helpers', () => {
  test('resolves the first available external user identifier', () => {
    expect(resolveAlertUserId({ auth0_id: 'auth0-user' })).toBe('auth0-user');
    expect(resolveAlertUserId({ sub: 'sub-user' })).toBe('sub-user');
    expect(resolveAlertUserId({ user_id: 'user-id' })).toBe('user-id');
    expect(resolveAlertUserId({ id: 'record-id' })).toBe('record-id');
  });

  test('returns null when the external user shape is missing an id', () => {
    expect(resolveAlertUserId(null)).toBeNull();
    expect(resolveAlertUserId(undefined)).toBeNull();
    expect(resolveAlertUserId({})).toBeNull();
    expect(resolveAlertUserId({ auth0_id: '' })).toBeNull();
  });
});
