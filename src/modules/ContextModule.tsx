/**
 * ============================================================================
 * Context Module (ContextModule.tsx) - User Context Management
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Manage user context switching between personal and organization modes
 * - Coordinate with UserModule and OrganizationModule
 * - Provide unified context state to UI components
 * - Handle context-specific permissions and feature access
 * 
 * Architecture Integration:
 *  Context Layer: ContextModule → UserModule + OrganizationModule
 *  State Management: Manages current context selection and transitions
 *  Permission Control: Controls feature access based on current context
 * 
 * Context Types:
 *  Personal: User operates in individual capacity
 *  Organization: User operates within an organization with specific role
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useUserModule } from './UserModule';
import { logger, LogCategory } from '../utils/logger';
import {
  consumeOrgContextFromCurrentUrl,
  getStoredOrgContextId,
  setStoredOrgContextId,
} from '../config/authSessionConfig';

// ================================================================================
// Context Types
// ================================================================================

export type UserContextType = 'personal' | 'organization';

export interface PersonalContext {
  type: 'personal';
  userId: string;
  email: string;
  name: string;
}

export interface OrganizationContext {
  type: 'organization';
  userId: string;
  email: string;
  name: string;
  organization: {
    id: string;
    name: string;
    domain?: string;
    plan: string;
    role: 'owner' | 'admin' | 'member';
    permissions: string[];
    creditsPool: number;
  };
}

export type UserContext = PersonalContext | OrganizationContext;

export interface AvailableOrganization {
  id: string;
  name: string;
  domain?: string;
  plan: string;
  role: 'owner' | 'admin' | 'member';
  permissions: string[];
  creditsPool: number;
}

// ================================================================================
// Context Module Interface
// ================================================================================

export interface ContextModuleInterface {
  // Current Context
  currentContext: UserContext | null;
  currentOrgId: string | null;
  contextType: UserContextType;
  isContextLoading: boolean;
  contextError: string | null;
  
  // Organization Management
  availableOrganizations: AvailableOrganization[];
  canCreateOrganization: boolean;
  
  // Context Actions
  switchToPersonal: () => Promise<void>;
  switchToOrganization: (organizationId: string) => Promise<void>;
  refreshContext: () => Promise<void>;
  
  // Permission Helpers
  hasPermission: (permission: string) => boolean;
  canInviteMembers: () => boolean;
  canManageOrganization: () => boolean;
  isOrganizationOwner: () => boolean;
  isOrganizationAdmin: () => boolean;
  
  // Feature Access
  getAvailableFeatures: () => string[];
  canAccessFeature: (feature: string) => boolean;
}

// ================================================================================
// Context Module Context
// ================================================================================

const ContextModuleContext = React.createContext<ContextModuleInterface | null>(null);

// ================================================================================
// Context Module Provider Component
// ================================================================================

export const ContextModule: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Access UserModule for authentication state
  const userModule = useUserModule();
  
  // State Management
  const [currentContext, setCurrentContext] = useState<UserContext | null>(null);
  const [availableOrganizations, setAvailableOrganizations] = useState<AvailableOrganization[]>([]);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);
  const [pendingOrgContextId, setPendingOrgContextId] = useState<string | null>(null);

  // Computed Values
  const contextType: UserContextType = currentContext?.type || 'personal';
  const canCreateOrganization = currentContext?.type === 'personal';
  const currentOrgId = useMemo(() => {
    if (!currentContext) {
      return null;
    }

    if (currentContext.type === 'organization') {
      return currentContext.organization.id;
    }

    return currentContext.userId || null;
  }, [currentContext]);

  useEffect(() => {
    const incomingOrgId = consumeOrgContextFromCurrentUrl() || getStoredOrgContextId();
    if (!incomingOrgId) {
      return;
    }

    setPendingOrgContextId(incomingOrgId);
    setStoredOrgContextId(incomingOrgId);
    logger.info(LogCategory.USER_AUTH, 'Detected incoming org context from cross-surface navigation', {
      orgId: incomingOrgId,
    });
  }, []);

  // ================================================================================
  // Initialize Context from UserModule
  // ================================================================================

  useEffect(() => {
    if (userModule.isAuthenticated && userModule.auth0User && !currentContext) {
      // Initialize personal context when user is authenticated
      const personalContext: PersonalContext = {
        type: 'personal',
        userId: userModule.auth0User.sub || '',
        email: userModule.auth0User.email || '',
        name: userModule.auth0User.name || ''
      };
      
      setCurrentContext(personalContext);
      logger.info(LogCategory.USER_AUTH, 'Initialized personal context from UserModule');
    } else if (!userModule.isAuthenticated && currentContext) {
      // Clear context when user logs out
      setCurrentContext(null);
      setAvailableOrganizations([]);
      setStoredOrgContextId(null);
      logger.info(LogCategory.USER_AUTH, 'Cleared context on user logout');
    }
  }, [userModule.isAuthenticated, userModule.auth0User, currentContext]);

  useEffect(() => {
    if (!userModule.isAuthenticated || !currentContext || !pendingOrgContextId) {
      return;
    }

    if (pendingOrgContextId === currentContext.userId) {
      setPendingOrgContextId(null);
      return;
    }

    if (currentContext.type === 'organization' && currentContext.organization.id === pendingOrgContextId) {
      setPendingOrgContextId(null);
      return;
    }

    const targetOrg = availableOrganizations.find((org) => org.id === pendingOrgContextId);
    if (!targetOrg) {
      setPendingOrgContextId(null);
      logger.info(LogCategory.USER_AUTH, 'Incoming org context was not available in this app session', {
        orgId: pendingOrgContextId,
      });
      return;
    }

    const organizationContext: OrganizationContext = {
      type: 'organization',
      userId: currentContext.userId,
      email: currentContext.email,
      name: currentContext.name,
      organization: targetOrg,
    };

    setCurrentContext(organizationContext);
    setPendingOrgContextId(null);
    logger.info(LogCategory.USER_AUTH, 'Applied incoming organization context', {
      orgId: pendingOrgContextId,
      organizationName: targetOrg.name,
    });
  }, [userModule.isAuthenticated, currentContext, pendingOrgContextId, availableOrganizations]);

  useEffect(() => {
    if (!currentContext) {
      return;
    }

    setStoredOrgContextId(currentOrgId);
  }, [currentContext, currentOrgId]);

  // ================================================================================
  // Context Switching Logic
  // ================================================================================

  const switchToPersonal = useCallback(async (): Promise<void> => {
    if (currentContext?.type === 'personal') {
      logger.debug(LogCategory.USER_AUTH, 'Already in personal context');
      return;
    }

    setIsContextLoading(true);
    setContextError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Switching to personal context');
      
      // TODO: Call API to switch context
      // await organizationService.switchContext(currentContext.userId, null);
      
      const personalContext: PersonalContext = {
        type: 'personal',
        userId: currentContext?.userId || '',
        email: currentContext?.email || '',
        name: currentContext?.name || ''
      };

      setCurrentContext(personalContext);
      
      logger.info(LogCategory.USER_AUTH, 'Successfully switched to personal context');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch context';
      setContextError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to switch to personal context', { error });
      throw error;
    } finally {
      setIsContextLoading(false);
    }
  }, [currentContext]);

  const switchToOrganization = useCallback(async (organizationId: string): Promise<void> => {
    if (currentContext?.type === 'organization' && currentContext.organization.id === organizationId) {
      logger.debug(LogCategory.USER_AUTH, 'Already in target organization context', { organizationId });
      return;
    }

    setIsContextLoading(true);
    setContextError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Switching to organization context', { organizationId });
      
      // Find the target organization
      const targetOrg = availableOrganizations.find(org => org.id === organizationId);
      if (!targetOrg) {
        throw new Error(`Organization not found: ${organizationId}`);
      }

      // TODO: Call API to switch context
      // await organizationService.switchContext(currentContext.userId, organizationId);
      
      const orgContext: OrganizationContext = {
        type: 'organization',
        userId: currentContext?.userId || '',
        email: currentContext?.email || '',
        name: currentContext?.name || '',
        organization: targetOrg
      };

      setCurrentContext(orgContext);
      
      logger.info(LogCategory.USER_AUTH, 'Successfully switched to organization context', { 
        organizationId, 
        organizationName: targetOrg.name 
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to switch context';
      setContextError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to switch to organization context', { error, organizationId });
      throw error;
    } finally {
      setIsContextLoading(false);
    }
  }, [currentContext, availableOrganizations]);

  const refreshContext = useCallback(async (): Promise<void> => {
    setIsContextLoading(true);
    setContextError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Refreshing context');
      
      // TODO: Fetch updated user organizations
      // const organizations = await organizationService.getUserOrganizations(currentContext.userId);
      // setAvailableOrganizations(organizations);
      
      // TODO: Refresh current context if in organization mode
      if (currentContext?.type === 'organization') {
        // const updatedOrg = await organizationService.getOrganization(currentContext.organization.id);
        // Update current context with fresh data
      }
      
      logger.info(LogCategory.USER_AUTH, 'Context refreshed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh context';
      setContextError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to refresh context', { error });
      throw error;
    } finally {
      setIsContextLoading(false);
    }
  }, [currentContext]);

  // ================================================================================
  // Permission Helpers
  // ================================================================================

  const hasPermission = useCallback((permission: string): boolean => {
    if (currentContext?.type !== 'organization') {
      return false;
    }
    return currentContext.organization.permissions.includes(permission);
  }, [currentContext]);

  const canInviteMembers = useCallback((): boolean => {
    if (currentContext?.type !== 'organization') {
      return false;
    }
    const role = currentContext.organization.role;
    return role === 'owner' || role === 'admin';
  }, [currentContext]);

  const canManageOrganization = useCallback((): boolean => {
    if (currentContext?.type !== 'organization') {
      return false;
    }
    const role = currentContext.organization.role;
    return role === 'owner' || role === 'admin';
  }, [currentContext]);

  const isOrganizationOwner = useCallback((): boolean => {
    if (currentContext?.type !== 'organization') {
      return false;
    }
    return currentContext.organization.role === 'owner';
  }, [currentContext]);

  const isOrganizationAdmin = useCallback((): boolean => {
    if (currentContext?.type !== 'organization') {
      return false;
    }
    const role = currentContext.organization.role;
    return role === 'owner' || role === 'admin';
  }, [currentContext]);

  // ================================================================================
  // Feature Access Control
  // ================================================================================

  const getAvailableFeatures = useCallback((): string[] => {
    const baseFeatures = ['chat', 'artifacts', 'credits'];
    
    if (currentContext?.type === 'organization') {
      const orgFeatures = ['organization-dashboard', 'usage-analytics'];
      
      if (canInviteMembers()) {
        orgFeatures.push('invite-members', 'member-management');
      }
      
      if (canManageOrganization()) {
        orgFeatures.push('organization-settings', 'billing-management');
      }
      
      if (isOrganizationOwner()) {
        orgFeatures.push('organization-deletion', 'owner-transfer');
      }
      
      return [...baseFeatures, ...orgFeatures];
    }
    
    return [...baseFeatures, 'create-organization'];
  }, [currentContext, canInviteMembers, canManageOrganization, isOrganizationOwner]);

  const canAccessFeature = useCallback((feature: string): boolean => {
    return getAvailableFeatures().includes(feature);
  }, [getAvailableFeatures]);

  // ================================================================================
  // Module Interface
  // ================================================================================

  const moduleInterface: ContextModuleInterface = useMemo(() => ({
    // Current Context
    currentContext,
    currentOrgId,
    contextType,
    isContextLoading,
    contextError,
    
    // Organization Management
    availableOrganizations,
    canCreateOrganization,
    
    // Context Actions
    switchToPersonal,
    switchToOrganization,
    refreshContext,
    
    // Permission Helpers
    hasPermission,
    canInviteMembers,
    canManageOrganization,
    isOrganizationOwner,
    isOrganizationAdmin,
    
    // Feature Access
    getAvailableFeatures,
    canAccessFeature
  }), [
    currentContext,
    currentOrgId,
    contextType,
    isContextLoading,
    contextError,
    availableOrganizations,
    canCreateOrganization,
    switchToPersonal,
    switchToOrganization,
    refreshContext,
    hasPermission,
    canInviteMembers,
    canManageOrganization,
    isOrganizationOwner,
    isOrganizationAdmin,
    getAvailableFeatures,
    canAccessFeature
  ]);

  return (
    <ContextModuleContext.Provider value={moduleInterface}>
      {children}
    </ContextModuleContext.Provider>
  );
};

// ================================================================================
// Hook for accessing ContextModule
// ================================================================================

export const useContextModule = (): ContextModuleInterface => {
  const context = React.useContext(ContextModuleContext);
  if (!context) {
    throw new Error('useContextModule must be used within ContextModule provider');
  }
  return context;
};

// ================================================================================
// Utilities
// ================================================================================

export const getContextDisplayName = (context: UserContext | null): string => {
  if (!context) return 'Loading...';
  
  if (context.type === 'personal') {
    return 'Personal';
  }
  
  return context.organization.name;
};

export const getContextCredits = (context: UserContext | null): number => {
  if (!context) return 0;
  
  if (context.type === 'personal') {
    // Credits from UserModule should be passed here
    return 0; // TODO: Get from UserModule
  }
  
  return context.organization.creditsPool;
};

export const getRoleDisplayName = (role: string): string => {
  const roleMap: Record<string, string> = {
    'owner': 'Owner',
    'admin': 'Admin',
    'member': 'Member'
  };
  return roleMap[role] || role;
};

export default ContextModule;
