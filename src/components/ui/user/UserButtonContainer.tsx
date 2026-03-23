/**
 * ============================================================================
 * UserButtonContainer - Smart Component for UserButton
 * ============================================================================
 * 
 * Container component that bridges business logic modules with the pure 
 * UserButton UI component. Handles data fetching, state management, and 
 * event delegation while keeping the UI component clean.
 * 
 * Architecture:
 *  Data Layer: UserModule + ContextModule + OrganizationModule
 *  UI Layer: UserButton (pure component)
 *  Bridge: UserButtonContainer (this component)
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { UserButton, UserButtonProps, UserContextType, UserData, OrganizationData } from './UserButton';
import { useUserModule } from '../../../modules/UserModule';
import { useContextModule } from '../../../modules/ContextModule';
import { useOrganizationModule } from '../../../modules/OrganizationModule';
import { logger, LogCategory } from '../../../utils/logger';

interface UserButtonContainerProps {
  // No props needed since we're using Modal now
}

export const UserButtonContainer: React.FC<UserButtonContainerProps> = () => {
  // Module Integration
  const userModule = useUserModule();
  const contextModule = useContextModule();
  const organizationModule = useOrganizationModule();

  // ================================================================================
  // Data Transformation
  // ================================================================================

  // Transform user data for UI
  const userData: UserData | null = useMemo(() => {
    if (!userModule.isAuthenticated || !userModule.authUser) {
      return null;
    }

    return {
      id: userModule.authUser.sub || '',
      name: userModule.authUser.name || '',
      email: userModule.authUser.email || '',
      avatar: userModule.authUser.picture
    };
  }, [userModule.isAuthenticated, userModule.authUser]);

  // Transform organization data for UI
  const availableOrganizations: OrganizationData[] = useMemo(() => {
    return contextModule.availableOrganizations.map(org => ({
      id: org.id,
      name: org.name,
      plan: org.plan,
      role: org.role,
      creditsPool: org.creditsPool
    }));
  }, [contextModule.availableOrganizations]);

  // Transform current organization data
  const currentOrganizationData: OrganizationData | undefined = useMemo(() => {
    if (contextModule.currentContext?.type !== 'organization') {
      return undefined;
    }

    const org = contextModule.currentContext.organization;
    return {
      id: org.id,
      name: org.name,
      plan: org.plan,
      role: org.role,
      creditsPool: org.creditsPool
    };
  }, [contextModule.currentContext]);

  // ================================================================================
  // Event Handlers
  // ================================================================================

  const handleLogin = useCallback(() => {
    try {
      logger.info(LogCategory.USER_AUTH, 'User login initiated from UserButton');
      // Dispatch custom event — AppLayout listens and shows LoginScreen
      window.dispatchEvent(new CustomEvent('isa:show-login'));
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to initiate login', { error });
    }
  }, []);

  const handleSwitchToPersonal = useCallback(async () => {
    try {
      logger.info(LogCategory.USER_AUTH, 'Switching to personal context from UserButton');
      await contextModule.switchToPersonal();
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to switch to personal context', { error });
      // Could show toast notification here
    }
  }, [contextModule]);

  const handleSwitchToOrganization = useCallback(async (organizationId: string) => {
    try {
      logger.info(LogCategory.USER_AUTH, 'Switching to organization context from UserButton', {
        organizationId
      });
      await contextModule.switchToOrganization(organizationId);
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to switch to organization context', {
        error,
        organizationId
      });
      // Could show toast notification here
    }
  }, [contextModule]);

  // ================================================================================
  // Effects
  // ================================================================================

  // Initialize context data when user becomes authenticated
  useEffect(() => {
    const initializeUserContext = async () => {
      if (!userModule.isAuthenticated || !userData) {
        return;
      }

      try {
        // Fetch user's organizations when they log in
        logger.info(LogCategory.USER_AUTH, 'Fetching user organizations for context initialization');
        await organizationModule.fetchUserOrganizations();
        
        // Refresh context to get latest data
        await contextModule.refreshContext();
      } catch (error) {
        logger.error(LogCategory.USER_AUTH, 'Failed to initialize user context', { error });
      }
    };

    initializeUserContext();
  }, [
    userModule.isAuthenticated,
    userData,
    organizationModule,
    contextModule
  ]);

  // ================================================================================
  // Props Assembly
  // ================================================================================

  const userButtonProps: UserButtonProps = useMemo(() => ({
    // Authentication State - Just use UserModule's authentication state
    // ContextModule will initialize asynchronously, don't wait for it
    isAuthenticated: userModule.isAuthenticated,
    isLoading: userModule.isLoading || contextModule.isContextLoading,
    
    // User Data
    user: userData,
    credits: contextModule.contextType === 'organization' 
      ? currentOrganizationData?.creditsPool || 0 
      : userModule.credits,
    currentPlan: contextModule.contextType === 'organization'
      ? currentOrganizationData?.plan || 'Unknown'
      : userModule.currentPlan,
    
    // Context State
    contextType: contextModule.contextType,
    currentOrganization: currentOrganizationData,
    availableOrganizations,
    
    // Actions
    onLogin: handleLogin,
    onSwitchToPersonal: handleSwitchToPersonal,
    onSwitchToOrganization: handleSwitchToOrganization
  }), [
    userModule.isAuthenticated,
    userModule.isLoading,
    userModule.credits,
    userModule.currentPlan,
    contextModule.isContextLoading,
    contextModule.contextType,
    userData,
    currentOrganizationData,
    availableOrganizations,
    handleLogin,
    handleSwitchToPersonal,
    handleSwitchToOrganization
  ]);

  // ================================================================================
  // Error Handling
  // ================================================================================

  // Log errors for debugging (could also show user-facing notifications)
  useEffect(() => {
    if (userModule.error) {
      logger.error(LogCategory.USER_AUTH, 'UserModule error in UserButtonContainer', { 
        error: userModule.error 
      });
    }
  }, [userModule.error]);

  useEffect(() => {
    if (contextModule.contextError) {
      logger.error(LogCategory.USER_AUTH, 'ContextModule error in UserButtonContainer', { 
        error: contextModule.contextError 
      });
    }
  }, [contextModule.contextError]);

  useEffect(() => {
    if (organizationModule.error) {
      logger.error(LogCategory.USER_AUTH, 'OrganizationModule error in UserButtonContainer', { 
        error: organizationModule.error 
      });
    }
  }, [organizationModule.error]);

  // ================================================================================
  // Render
  // ================================================================================

  return <UserButton {...userButtonProps} />;
};

// ================================================================================
// Utilities
// ================================================================================

/**
 * Hook for accessing user context information outside of the UserButton
 */
export const useUserContext = () => {
  const userModule = useUserModule();
  const contextModule = useContextModule();
  
  return {
    isAuthenticated: userModule.isAuthenticated,
    contextType: contextModule.contextType,
    currentContext: contextModule.currentContext,
    availableOrganizations: contextModule.availableOrganizations,
    canCreateOrganization: contextModule.canCreateOrganization,
    hasOrganizations: contextModule.availableOrganizations.length > 0
  };
};

/**
 * Hook for accessing organization permissions in current context
 */
export const useOrganizationPermissions = () => {
  const contextModule = useContextModule();
  
  return {
    hasPermission: contextModule.hasPermission,
    canInviteMembers: contextModule.canInviteMembers(),
    canManageOrganization: contextModule.canManageOrganization(),
    isOrganizationOwner: contextModule.isOrganizationOwner(),
    isOrganizationAdmin: contextModule.isOrganizationAdmin(),
    canAccessFeature: contextModule.canAccessFeature,
    availableFeatures: contextModule.getAvailableFeatures()
  };
};

export default UserButtonContainer;