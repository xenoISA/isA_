/**
 * ============================================================================
 * Permission Utilities (permissions.ts) - RBAC helper functions
 * ============================================================================
 *
 * Core Responsibilities:
 * - Check if a role has a specific permission
 * - Check if a role has any of a set of permissions
 * - Derive a UserRole from an ExternalUser record
 *
 * Separation of Concerns:
 * - Responsible for: permission lookups, role derivation
 * - Not responsible for: auth flow, UI rendering, route guards
 */

import { UserRole, Permission, ROLE_PERMISSIONS } from '../types/userTypes';
import type { ExternalUser } from '../types/userTypes';

/**
 * Returns true if the given role includes the specified permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes(permission);
}

/**
 * Returns true if the given role includes at least one of the specified permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role];
  return permissions.some((p) => rolePermissions.includes(p));
}

/**
 * Derives a UserRole from an ExternalUser's plan field.
 *
 * Mapping:
 *   - 'enterprise' plan  → 'admin'
 *   - 'pro' plan         → 'developer'
 *   - everything else    → 'user'
 *
 * This is a client-side heuristic. The authoritative role should
 * come from the backend once RBAC is fully wired.
 */
export function getUserRole(user: ExternalUser): UserRole {
  switch (user.plan) {
    case 'enterprise':
      return 'admin';
    case 'pro':
      return 'developer';
    default:
      return 'user';
  }
}
