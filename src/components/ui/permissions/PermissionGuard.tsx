/**
 * ============================================================================
 * PermissionGuard - Role-based Access Control Component
 * ============================================================================
 * 
 * Declarative component for controlling feature access based on user context,
 * organization membership, and role-based permissions. Provides both component
 * and hook-based approaches for permission checking.
 * 
 * Features:
 * - Context-aware permission checking
 * - Role-based access control
 * - Feature-based access control
 * - Fallback UI for unauthorized access
 * - Development mode warnings
 */

import React from 'react';
import { createLogger } from '../../../utils/logger';
import { useContextModule } from '../../../modules/ContextModule';

const log = createLogger('PermissionGuard');

export type PermissionLevel = 'owner' | 'admin' | 'member' | 'any';
export type ContextRequirement = 'personal' | 'organization' | 'any';

export interface PermissionGuardProps {
  children: React.ReactNode;
  
  // Permission Requirements
  requiredRole?: PermissionLevel;
  requiredPermission?: string;
  requiredFeature?: string;
  requiredContext?: ContextRequirement;
  
  // Access Control Options
  requireAuthentication?: boolean;
  allowMultipleOrganizations?: boolean;
  
  // UI Customization
  fallback?: React.ReactNode;
  showFallback?: boolean;
  hideWhenRestricted?: boolean;
  
  // Development
  debugMode?: boolean;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  requiredRole,
  requiredPermission,
  requiredFeature,
  requiredContext = 'any',
  requireAuthentication = true,
  allowMultipleOrganizations = false,
  fallback,
  showFallback = true,
  hideWhenRestricted = false,
  debugMode = false
}) => {
  const contextModule = useContextModule();

  // ================================================================================
  // Permission Checking Logic
  // ================================================================================

  const checkAuthentication = (): boolean => {
    if (!requireAuthentication) return true;
    
    // We need to check if user is authenticated
    // This should be passed from a higher level or we need access to UserModule
    return contextModule.currentContext !== null;
  };

  const checkContextRequirement = (): boolean => {
    if (requiredContext === 'any') return true;
    
    if (requiredContext === 'personal') {
      return contextModule.contextType === 'personal';
    }
    
    if (requiredContext === 'organization') {
      return contextModule.contextType === 'organization';
    }
    
    return false;
  };

  const checkRoleRequirement = (): boolean => {
    if (!requiredRole || requiredRole === 'any') return true;
    
    // Personal context - no role restrictions
    if (contextModule.contextType === 'personal') {
      return true;
    }
    
    // Organization context - check user role
    if (contextModule.contextType === 'organization' && contextModule.currentContext?.type === 'organization') {
      const userRole = contextModule.currentContext.organization.role;
      
      switch (requiredRole) {
        case 'owner':
          return userRole === 'owner';
        case 'admin':
          return userRole === 'owner' || userRole === 'admin';
        case 'member':
          return userRole === 'owner' || userRole === 'admin' || userRole === 'member';
        default:
          return false;
      }
    }
    
    return false;
  };

  const checkPermissionRequirement = (): boolean => {
    if (!requiredPermission) return true;
    
    return contextModule.hasPermission(requiredPermission);
  };

  const checkFeatureRequirement = (): boolean => {
    if (!requiredFeature) return true;
    
    return contextModule.canAccessFeature(requiredFeature);
  };

  const checkOrganizationRequirement = (): boolean => {
    if (allowMultipleOrganizations) return true;
    
    // If in organization context, ensure user belongs to organization
    if (contextModule.contextType === 'organization') {
      return contextModule.currentContext?.type === 'organization';
    }
    
    return true;
  };

  // ================================================================================
  // Main Permission Check
  // ================================================================================

  const hasAccess = (): boolean => {
    const checks = [
      { name: 'authentication', result: checkAuthentication() },
      { name: 'context', result: checkContextRequirement() },
      { name: 'role', result: checkRoleRequirement() },
      { name: 'permission', result: checkPermissionRequirement() },
      { name: 'feature', result: checkFeatureRequirement() },
      { name: 'organization', result: checkOrganizationRequirement() }
    ];

    if (debugMode) {
      log.debug('PermissionGuard checks:', {
        requirements: {
          requiredRole,
          requiredPermission,
          requiredFeature,
          requiredContext,
          requireAuthentication
        },
        context: {
          contextType: contextModule.contextType,
          currentContext: contextModule.currentContext
        },
        checks: checks.reduce((acc, check) => ({
          ...acc,
          [check.name]: check.result
        }), {}),
        finalResult: checks.every(check => check.result)
      });
    }

    return checks.every(check => check.result);
  };

  // ================================================================================
  // Render Logic
  // ================================================================================

  const hasPermission = hasAccess();

  // Hide component entirely if restricted and hideWhenRestricted is true
  if (!hasPermission && hideWhenRestricted) {
    return null;
  }

  // Show children if permission granted
  if (hasPermission) {
    return <>{children}</>;
  }

  // Show fallback if permission denied and showFallback is true
  if (showFallback) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default fallback UI
    return (
      <div 
        className="p-4 rounded-md border border-dashed"
        style={{ 
          borderColor: 'var(--border-color)',
          background: 'var(--background-tertiary)',
          color: 'var(--text-muted)'
        }}
      >
        <div className="text-center">
          <svg 
            className="w-8 h-8 mx-auto mb-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1} 
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
            />
          </svg>
          <p className="text-sm">
            {getRestrictionMessage()}
          </p>
        </div>
      </div>
    );
  }

  // Hide component if no fallback should be shown
  return null;

  // ================================================================================
  // Helper Functions
  // ================================================================================

  function getRestrictionMessage(): string {
    if (!checkAuthentication()) {
      return 'Please sign in to access this feature';
    }
    
    if (!checkContextRequirement()) {
      if (requiredContext === 'organization') {
        return 'This feature is only available in organization context';
      }
      if (requiredContext === 'personal') {
        return 'This feature is only available in personal context';
      }
    }
    
    if (!checkRoleRequirement() && requiredRole && requiredRole !== 'any') {
      const roleMessages: Record<'owner' | 'admin' | 'member', string> = {
        owner: 'Only organization owners can access this feature',
        admin: 'Only organization owners and admins can access this feature',
        member: 'Organization membership required to access this feature'
      };
      return roleMessages[requiredRole as 'owner' | 'admin' | 'member'] || 'Insufficient permissions';
    }
    
    if (!checkPermissionRequirement() && requiredPermission) {
      return `Permission '${requiredPermission}' required to access this feature`;
    }
    
    if (!checkFeatureRequirement() && requiredFeature) {
      return `Feature '${requiredFeature}' is not available in your current plan`;
    }
    
    return 'You do not have permission to access this feature';
  }
};

// ================================================================================
// Permission Hooks
// ================================================================================

/**
 * Hook for checking permissions programmatically
 */
export const usePermissionCheck = () => {
  const contextModule = useContextModule();

  const checkPermission = (requirements: {
    requiredRole?: PermissionLevel;
    requiredPermission?: string;
    requiredFeature?: string;
    requiredContext?: ContextRequirement;
  }): boolean => {
    // Create a temporary PermissionGuard instance to reuse logic
    // This is a simplified version - in a real implementation, you'd extract the logic
    
    if (requirements.requiredContext === 'personal' && contextModule.contextType !== 'personal') {
      return false;
    }
    
    if (requirements.requiredContext === 'organization' && contextModule.contextType !== 'organization') {
      return false;
    }
    
    if (requirements.requiredPermission && !contextModule.hasPermission(requirements.requiredPermission)) {
      return false;
    }
    
    if (requirements.requiredFeature && !contextModule.canAccessFeature(requirements.requiredFeature)) {
      return false;
    }
    
    if (requirements.requiredRole && contextModule.contextType === 'organization') {
      const userRole = contextModule.currentContext?.type === 'organization' 
        ? contextModule.currentContext.organization.role 
        : 'member';
      
      switch (requirements.requiredRole) {
        case 'owner':
          return userRole === 'owner';
        case 'admin':
          return userRole === 'owner' || userRole === 'admin';
        case 'member':
          return userRole === 'owner' || userRole === 'admin' || userRole === 'member';
      }
    }
    
    return true;
  };

  const canInviteMembers = contextModule.canInviteMembers();
  const canManageOrganization = contextModule.canManageOrganization();
  const isOrganizationOwner = contextModule.isOrganizationOwner();
  const isOrganizationAdmin = contextModule.isOrganizationAdmin();

  return {
    checkPermission,
    canInviteMembers,
    canManageOrganization,
    isOrganizationOwner,
    isOrganizationAdmin,
    availableFeatures: contextModule.getAvailableFeatures(),
    contextType: contextModule.contextType,
    currentContext: contextModule.currentContext
  };
};

// ================================================================================
// Utility Components
// ================================================================================

/**
 * Quick permission guards for common scenarios
 */
export const OwnerOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <PermissionGuard requiredRole="owner" requiredContext="organization" fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <PermissionGuard requiredRole="admin" requiredContext="organization" fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const OrganizationOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <PermissionGuard requiredContext="organization" fallback={fallback}>
    {children}
  </PermissionGuard>
);

export const PersonalOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => (
  <PermissionGuard requiredContext="personal" fallback={fallback}>
    {children}
  </PermissionGuard>
);

export default PermissionGuard;