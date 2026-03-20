/**
 * ============================================================================
 * Organization Module (OrganizationModule.tsx) - Organization Business Logic
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Manage organization CRUD operations
 * - Handle member management and invitations
 * - Process organization-level billing and credits
 * - Coordinate with email service for invitations
 * - Provide organization-specific business logic
 * 
 * Architecture Integration:
 *  Service Layer: OrganizationService + EmailService
 *  State Management: Organization-specific state and actions
 *  Integration: Works with ContextModule for context switching
 * 
 * Features:
 *  - Organization lifecycle management
 *  - Member invitation and management
 *  - Role-based permissions
 *  - Organization statistics and analytics
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useUserStore } from '../stores/useUserStore';
import { logger, LogCategory } from '../utils/logger';
import { organizationService } from '../api/organizationService';

// ================================================================================
// Organization Types
// ================================================================================

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  plan: 'startup' | 'business' | 'enterprise';
  billingEmail: string;
  status: 'active' | 'suspended' | 'deleted';
  settings: Record<string, any>;
  creditsPool: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  userId: string;
  email: string;
  name?: string;
  role: 'owner' | 'admin' | 'member';
  permissions: string[];
  joinedAt: string;
  status: 'active' | 'invited' | 'suspended';
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'admin' | 'member';
  permissions: string[];
  invitedBy: string;
  invitedByName: string;
  message?: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expiresAt: string;
  createdAt: string;
}

export interface CreateOrganizationData {
  name: string;
  domain?: string;
  plan: 'startup' | 'business' | 'enterprise';
  billingEmail: string;
  settings?: Record<string, any>;
}

export interface InviteMemberData {
  email: string;
  role: 'admin' | 'member';
  permissions?: string[];
  message?: string;
}

export interface OrganizationStats {
  totalMembers: number;
  activeMembers: number;
  pendingInvitations: number;
  totalCreditsUsed: number;
  monthlyCreditsUsed: number;
  createdAt: string;
}

// ================================================================================
// Organization Module Interface
// ================================================================================

export interface OrganizationModuleInterface {
  // Organization State
  currentOrganization: Organization | null;
  userOrganizations: Organization[];
  isLoading: boolean;
  error: string | null;
  
  // Member Management
  members: OrganizationMember[];
  invitations: OrganizationInvitation[];
  membersLoading: boolean;
  membersError: string | null;
  
  // Organization Actions
  createOrganization: (data: CreateOrganizationData) => Promise<Organization>;
  updateOrganization: (id: string, updates: Partial<Organization>) => Promise<Organization>;
  deleteOrganization: (id: string) => Promise<void>;
  
  // Member Actions
  inviteMember: (organizationId: string, data: InviteMemberData) => Promise<OrganizationInvitation>;
  acceptInvitation: (invitationToken: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  resendInvitation: (invitationId: string) => Promise<void>;
  updateMemberRole: (organizationId: string, userId: string, role: string, permissions?: string[]) => Promise<void>;
  removeMember: (organizationId: string, userId: string) => Promise<void>;
  
  // Data Fetching
  fetchUserOrganizations: () => Promise<Organization[]>;
  fetchOrganization: (id: string) => Promise<Organization>;
  fetchOrganizationMembers: (id: string) => Promise<OrganizationMember[]>;
  fetchOrganizationInvitations: (id: string) => Promise<OrganizationInvitation[]>;
  fetchOrganizationStats: (id: string) => Promise<OrganizationStats>;
  
  // Utilities
  refreshData: () => Promise<void>;
  clearError: () => void;
}

// ================================================================================
// Organization Module Context
// ================================================================================

const OrganizationModuleContext = React.createContext<OrganizationModuleInterface | null>(null);

// ================================================================================
// Organization Module Provider Component
// ================================================================================

export const OrganizationModule: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State Management
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  // ================================================================================
  // Organization Management
  // ================================================================================

  const createOrganization = useCallback(async (data: CreateOrganizationData): Promise<Organization> => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Creating organization', { name: data.name });

      const organization = await organizationService.createOrganization(data);

      setUserOrganizations(prev => [...prev, organization]);
      
      logger.info(LogCategory.USER_AUTH, 'Organization created successfully', { 
        organizationId: organization.id 
      });
      
      return organization;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create organization';
      setError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to create organization', { error });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateOrganization = useCallback(async (id: string, updates: Partial<Organization>): Promise<Organization> => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Updating organization', { organizationId: id });

      const updatedOrg = await organizationService.updateOrganization(id, updates);
      
      setCurrentOrganization(updatedOrg);
      setUserOrganizations(prev => prev.map(org => org.id === id ? updatedOrg : org));
      
      logger.info(LogCategory.USER_AUTH, 'Organization updated successfully', { organizationId: id });
      
      return updatedOrg;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update organization';
      setError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to update organization', { error, organizationId: id });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization]);

  const deleteOrganization = useCallback(async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Deleting organization', { organizationId: id });

      await organizationService.deleteOrganization(id);
      
      setUserOrganizations(prev => prev.filter(org => org.id !== id));
      if (currentOrganization?.id === id) {
        setCurrentOrganization(null);
      }
      
      logger.info(LogCategory.USER_AUTH, 'Organization deleted successfully', { organizationId: id });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete organization';
      setError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to delete organization', { error, organizationId: id });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization]);

  // ================================================================================
  // Member Management
  // ================================================================================

  const inviteMember = useCallback(async (organizationId: string, data: InviteMemberData): Promise<OrganizationInvitation> => {
    setMembersLoading(true);
    setMembersError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Inviting member to organization', {
        organizationId,
        email: data.email,
        role: data.role
      });

      const invitation = await organizationService.inviteMember(organizationId, data);

      setInvitations(prev => [...prev, invitation]);
      
      logger.info(LogCategory.USER_AUTH, 'Member invitation sent successfully', { 
        invitationId: invitation.id,
        email: data.email
      });
      
      return invitation;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite member';
      setMembersError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to invite member', { error, organizationId, email: data.email });
      throw error;
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const acceptInvitation = useCallback(async (invitationToken: string): Promise<void> => {
    setMembersLoading(true);
    setMembersError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Accepting invitation', { invitationToken });

      await organizationService.acceptInvitation(invitationToken);

      setInvitations(prev => prev.map(inv =>
        inv.token === invitationToken
          ? { ...inv, status: 'accepted' as const }
          : inv
      ));
      
      logger.info(LogCategory.USER_AUTH, 'Invitation accepted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept invitation';
      setMembersError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to accept invitation', { error, invitationToken });
      throw error;
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const cancelInvitation = useCallback(async (invitationId: string): Promise<void> => {
    setMembersLoading(true);
    setMembersError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Cancelling invitation', { invitationId });

      // Find the invitation to get the organizationId
      const targetInv = invitations.find(inv => inv.id === invitationId);
      const orgId = targetInv?.organizationId || currentOrganization?.id || '';
      await organizationService.cancelInvitation(orgId, invitationId);

      setInvitations(prev => prev.map(inv =>
        inv.id === invitationId
          ? { ...inv, status: 'cancelled' as const }
          : inv
      ));
      
      logger.info(LogCategory.USER_AUTH, 'Invitation cancelled successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel invitation';
      setMembersError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to cancel invitation', { error, invitationId });
      throw error;
    } finally {
      setMembersLoading(false);
    }
  }, [invitations, currentOrganization]);

  const resendInvitation = useCallback(async (invitationId: string): Promise<void> => {
    setMembersLoading(true);
    setMembersError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Resending invitation', { invitationId });

      await organizationService.resendInvitation(invitationId);
      
      logger.info(LogCategory.USER_AUTH, 'Invitation resent successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend invitation';
      setMembersError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to resend invitation', { error, invitationId });
      throw error;
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const updateMemberRole = useCallback(async (organizationId: string, userId: string, role: string, permissions?: string[]): Promise<void> => {
    setMembersLoading(true);
    setMembersError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Updating member role', { organizationId, userId, role });

      await organizationService.updateMemberRole(organizationId, userId, role, permissions);

      setMembers(prev => prev.map(member =>
        member.userId === userId
          ? { ...member, role: role as any, permissions: permissions || member.permissions }
          : member
      ));
      
      logger.info(LogCategory.USER_AUTH, 'Member role updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update member role';
      setMembersError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to update member role', { error, organizationId, userId });
      throw error;
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const removeMember = useCallback(async (organizationId: string, userId: string): Promise<void> => {
    setMembersLoading(true);
    setMembersError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Removing member from organization', { organizationId, userId });

      await organizationService.removeMember(organizationId, userId);

      setMembers(prev => prev.filter(member => member.userId !== userId));
      
      logger.info(LogCategory.USER_AUTH, 'Member removed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove member';
      setMembersError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to remove member', { error, organizationId, userId });
      throw error;
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // ================================================================================
  // Data Fetching
  // ================================================================================

  const fetchUserOrganizations = useCallback(async (): Promise<Organization[]> => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Fetching user organizations');

      const organizations = await organizationService.getUserOrganizations();
      
      setUserOrganizations(organizations);
      
      logger.info(LogCategory.USER_AUTH, 'User organizations fetched successfully', { 
        count: organizations.length 
      });
      
      return organizations;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch organizations';
      setError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to fetch user organizations', { error });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrganization = useCallback(async (id: string): Promise<Organization> => {
    setIsLoading(true);
    setError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Fetching organization', { organizationId: id });

      const organization = await organizationService.getOrganization(id);
      
      setCurrentOrganization(organization);
      
      logger.info(LogCategory.USER_AUTH, 'Organization fetched successfully', { organizationId: id });
      
      return organization;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch organization';
      setError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to fetch organization', { error, organizationId: id });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrganizationMembers = useCallback(async (id: string): Promise<OrganizationMember[]> => {
    setMembersLoading(true);
    setMembersError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Fetching organization members', { organizationId: id });

      const fetchedMembers = await organizationService.getOrganizationMembers(id);

      setMembers(fetchedMembers);
      
      logger.info(LogCategory.USER_AUTH, 'Organization members fetched successfully', {
        organizationId: id,
        count: fetchedMembers.length
      });

      return fetchedMembers;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch members';
      setMembersError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to fetch organization members', { error, organizationId: id });
      throw error;
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const fetchOrganizationInvitations = useCallback(async (id: string): Promise<OrganizationInvitation[]> => {
    setMembersLoading(true);
    setMembersError(null);

    try {
      logger.info(LogCategory.USER_AUTH, 'Fetching organization invitations', { organizationId: id });

      const fetchedInvitations = await organizationService.getOrganizationInvitations(id);

      setInvitations(fetchedInvitations);

      logger.info(LogCategory.USER_AUTH, 'Organization invitations fetched successfully', {
        organizationId: id,
        count: fetchedInvitations.length
      });

      return fetchedInvitations;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch invitations';
      setMembersError(errorMessage);
      logger.error(LogCategory.USER_AUTH, 'Failed to fetch organization invitations', { error, organizationId: id });
      throw error;
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const fetchOrganizationStats = useCallback(async (id: string): Promise<OrganizationStats> => {
    try {
      logger.info(LogCategory.USER_AUTH, 'Fetching organization stats', { organizationId: id });

      const stats = await organizationService.getOrganizationStats(id);
      
      logger.info(LogCategory.USER_AUTH, 'Organization stats fetched successfully', { organizationId: id });
      
      return stats;
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to fetch organization stats', { error, organizationId: id });
      throw error;
    }
  }, []);

  // ================================================================================
  // Utilities
  // ================================================================================

  const refreshData = useCallback(async (): Promise<void> => {
    try {
      await fetchUserOrganizations();
      if (currentOrganization) {
        await Promise.all([
          fetchOrganizationMembers(currentOrganization.id),
          fetchOrganizationInvitations(currentOrganization.id)
        ]);
      }
    } catch (error) {
      logger.error(LogCategory.USER_AUTH, 'Failed to refresh organization data', { error });
    }
  }, [currentOrganization, fetchUserOrganizations, fetchOrganizationMembers, fetchOrganizationInvitations]);

  const clearError = useCallback(() => {
    setError(null);
    setMembersError(null);
  }, []);

  // ================================================================================
  // Module Interface
  // ================================================================================

  const moduleInterface: OrganizationModuleInterface = useMemo(() => ({
    // Organization State
    currentOrganization,
    userOrganizations,
    isLoading,
    error,
    
    // Member Management
    members,
    invitations,
    membersLoading,
    membersError,
    
    // Organization Actions
    createOrganization,
    updateOrganization,
    deleteOrganization,
    
    // Member Actions
    inviteMember,
    acceptInvitation,
    cancelInvitation,
    resendInvitation,
    updateMemberRole,
    removeMember,
    
    // Data Fetching
    fetchUserOrganizations,
    fetchOrganization,
    fetchOrganizationMembers,
    fetchOrganizationInvitations,
    fetchOrganizationStats,
    
    // Utilities
    refreshData,
    clearError
  }), [
    currentOrganization,
    userOrganizations,
    isLoading,
    error,
    members,
    invitations,
    membersLoading,
    membersError,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    inviteMember,
    acceptInvitation,
    cancelInvitation,
    resendInvitation,
    updateMemberRole,
    removeMember,
    fetchUserOrganizations,
    fetchOrganization,
    fetchOrganizationMembers,
    fetchOrganizationInvitations,
    fetchOrganizationStats,
    refreshData,
    clearError
  ]);

  return (
    <OrganizationModuleContext.Provider value={moduleInterface}>
      {children}
    </OrganizationModuleContext.Provider>
  );
};

// ================================================================================
// Hook for accessing OrganizationModule
// ================================================================================

export const useOrganizationModule = (): OrganizationModuleInterface => {
  const context = React.useContext(OrganizationModuleContext);
  if (!context) {
    throw new Error('useOrganizationModule must be used within OrganizationModule provider');
  }
  return context;
};

// ================================================================================
// Utilities
// ================================================================================

export const formatOrganizationPlan = (plan: string): string => {
  const planMap: Record<string, string> = {
    'startup': 'Startup',
    'business': 'Business',
    'enterprise': 'Enterprise'
  };
  return planMap[plan] || plan;
};

export const getDefaultPermissions = (role: string): string[] => {
  const permissionMap: Record<string, string[]> = {
    'owner': ['read', 'write', 'admin', 'billing', 'delete'],
    'admin': ['read', 'write', 'admin'],
    'member': ['read', 'write']
  };
  return permissionMap[role] || ['read'];
};

export const canInviteMembers = (role: string): boolean => {
  return role === 'owner' || role === 'admin';
};

export const canManageMembers = (role: string): boolean => {
  return role === 'owner' || role === 'admin';
};

export const canDeleteOrganization = (role: string): boolean => {
  return role === 'owner';
};

export default OrganizationModule;