import { describe, test, expect } from 'vitest';
import { hasPermission, hasAnyPermission, getUserRole } from '../permissions';
import type { ExternalUser } from '../../types/userTypes';
import type { UserRole, Permission } from '../../types/userTypes';
import { ROLE_PERMISSIONS } from '../../types/userTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<ExternalUser> = {}): ExternalUser {
  return {
    auth0_id: 'auth0|123',
    email: 'test@example.com',
    name: 'Test User',
    credits: 100,
    credits_total: 1000,
    plan: 'free',
    is_active: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// hasPermission
// ---------------------------------------------------------------------------

describe('hasPermission', () => {
  test('user role has app.chat', () => {
    expect(hasPermission('user', 'app.chat')).toBe(true);
  });

  test('user role has docs.view', () => {
    expect(hasPermission('user', 'docs.view')).toBe(true);
  });

  test('user role does NOT have console.view', () => {
    expect(hasPermission('user', 'console.view')).toBe(false);
  });

  test('user role does NOT have admin.users', () => {
    expect(hasPermission('user', 'admin.users')).toBe(false);
  });

  test('developer role has console.manage', () => {
    expect(hasPermission('developer', 'console.manage')).toBe(true);
  });

  test('developer role has console.api_keys', () => {
    expect(hasPermission('developer', 'console.api_keys')).toBe(true);
  });

  test('developer role does NOT have admin.users', () => {
    expect(hasPermission('developer', 'admin.users')).toBe(false);
  });

  test('admin role has every permission', () => {
    const allPermissions: Permission[] = [
      'app.chat',
      'app.widgets',
      'console.view',
      'console.manage',
      'console.api_keys',
      'docs.view',
      'admin.users',
      'admin.billing',
      'admin.orgs',
    ];
    for (const perm of allPermissions) {
      expect(hasPermission('admin', perm)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// hasAnyPermission
// ---------------------------------------------------------------------------

describe('hasAnyPermission', () => {
  test('returns true when at least one permission matches', () => {
    expect(hasAnyPermission('user', ['admin.users', 'app.chat'])).toBe(true);
  });

  test('returns false when no permission matches', () => {
    expect(hasAnyPermission('user', ['admin.users', 'console.manage'])).toBe(false);
  });

  test('returns false for empty permission list', () => {
    expect(hasAnyPermission('admin', [])).toBe(false);
  });

  test('developer has at least one console permission', () => {
    expect(hasAnyPermission('developer', ['console.view', 'admin.orgs'])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getUserRole
// ---------------------------------------------------------------------------

describe('getUserRole', () => {
  test('enterprise plan maps to admin', () => {
    expect(getUserRole(makeUser({ plan: 'enterprise' }))).toBe('admin');
  });

  test('pro plan maps to developer', () => {
    expect(getUserRole(makeUser({ plan: 'pro' }))).toBe('developer');
  });

  test('free plan maps to user', () => {
    expect(getUserRole(makeUser({ plan: 'free' }))).toBe('user');
  });

  test('unknown plan defaults to user', () => {
    expect(getUserRole(makeUser({ plan: 'beta' }))).toBe('user');
  });
});

// ---------------------------------------------------------------------------
// ROLE_PERMISSIONS structure
// ---------------------------------------------------------------------------

describe('ROLE_PERMISSIONS', () => {
  test('each role higher in the hierarchy is a superset of the one below', () => {
    const userPerms = new Set(ROLE_PERMISSIONS.user);
    const devPerms = new Set(ROLE_PERMISSIONS.developer);
    const adminPerms = new Set(ROLE_PERMISSIONS.admin);

    // Every user permission is in developer
    for (const p of userPerms) {
      expect(devPerms.has(p)).toBe(true);
    }

    // Every developer permission is in admin
    for (const p of devPerms) {
      expect(adminPerms.has(p)).toBe(true);
    }
  });
});
