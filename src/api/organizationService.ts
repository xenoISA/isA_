/**
 * ============================================================================
 * Organization Service (organizationService.ts) - Organization API Service
 * ============================================================================
 *
 * Core Responsibilities:
 * - Uses BaseApiService for robust network transport
 * - Handles all organization-related API operations
 * - Provides clean interfaces for organization and member management
 * - Manages context switching between personal and organization modes
 *
 * Architecture Benefits:
 * - Transport: BaseApiService robust HTTP handling
 * - Types: Shared with OrganizationModule
 * - Error handling: Consistent API error management
 * - Retry logic: Built-in request retry and timeout
 */

import { BaseApiService } from './BaseApiService';
import { GATEWAY_ENDPOINTS, buildUrlWithParams } from '../config/gatewayConfig';
import { createLogger, LogCategory } from '../utils/logger';
import type {
  Organization,
  OrganizationMember,
  OrganizationInvitation,
  CreateOrganizationData,
  InviteMemberData,
  OrganizationStats,
} from '../modules/OrganizationModule';

const log = createLogger('OrganizationService', LogCategory.API_REQUEST);

// ================================================================================
// OrganizationService Class
// ================================================================================

export class OrganizationService {
  private apiService: BaseApiService;

  constructor(getAuthHeaders?: () => Promise<Record<string, string>>) {
    this.apiService = new BaseApiService(
      GATEWAY_ENDPOINTS.ORGANIZATION.BASE,
      undefined,
      getAuthHeaders
    );
    log.info('OrganizationService initialized');
  }

  // ================================================================================
  // Organization CRUD
  // ================================================================================

  private _orgFetchFailed = false; // prevent infinite retry loop

  async getUserOrganizations(): Promise<Organization[]> {
    // Don't retry after first failure — prevents infinite re-render loop
    if (this._orgFetchFailed) {
      return [];
    }

    try {
      log.info('Fetching user organizations');
      const response = await this.apiService.get<any>(
        GATEWAY_ENDPOINTS.ORGANIZATION.LIST
      );
      if (!response.success) {
        this._orgFetchFailed = true;
        return [];
      }
      // API returns {organizations: [], total: N} — extract the array
      const data = response.data;
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.organizations)) return data.organizations;
      return [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch user organizations', { error: msg });
      this._orgFetchFailed = true;
      return []; // Return empty instead of throwing — prevents crash loop
    }
  }

  async getOrganization(id: string): Promise<Organization> {
    try {
      log.info('Fetching organization', { organizationId: id });
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ORGANIZATION.GET, { organizationId: id });
      const response = await this.apiService.get<Organization>(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch organization');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch organization', { error: msg, organizationId: id });
      throw new Error(`Fetch organization failed: ${msg}`);
    }
  }

  async createOrganization(data: CreateOrganizationData): Promise<Organization> {
    try {
      log.info('Creating organization', { name: data.name });
      const response = await this.apiService.post<Organization>(
        GATEWAY_ENDPOINTS.ORGANIZATION.CREATE,
        data
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to create organization');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to create organization', { error: msg });
      throw new Error(`Create organization failed: ${msg}`);
    }
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    try {
      log.info('Updating organization', { organizationId: id });
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ORGANIZATION.UPDATE, { organizationId: id });
      const response = await this.apiService.patch<Organization>(url, updates);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update organization');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to update organization', { error: msg, organizationId: id });
      throw new Error(`Update organization failed: ${msg}`);
    }
  }

  async deleteOrganization(id: string): Promise<void> {
    try {
      log.info('Deleting organization', { organizationId: id });
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ORGANIZATION.DELETE, { organizationId: id });
      const response = await this.apiService.delete(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete organization');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to delete organization', { error: msg, organizationId: id });
      throw new Error(`Delete organization failed: ${msg}`);
    }
  }

  // ================================================================================
  // Member Management
  // ================================================================================

  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    try {
      log.info('Fetching organization members', { organizationId });
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ORGANIZATION.MEMBERS, { organizationId });
      const response = await this.apiService.get<OrganizationMember[]>(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch members');
      }
      return response.data ?? [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch organization members', { error: msg, organizationId });
      throw new Error(`Fetch members failed: ${msg}`);
    }
  }

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: string,
    permissions?: string[]
  ): Promise<void> {
    try {
      log.info('Updating member role', { organizationId, userId, role });
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ORGANIZATION.MEMBER, { organizationId, userId });
      const response = await this.apiService.patch(url, { role, permissions });
      if (!response.success) {
        throw new Error(response.error || 'Failed to update member role');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to update member role', { error: msg, organizationId, userId });
      throw new Error(`Update member role failed: ${msg}`);
    }
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    try {
      log.info('Removing member', { organizationId, userId });
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ORGANIZATION.MEMBER, { organizationId, userId });
      const response = await this.apiService.delete(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to remove member');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to remove member', { error: msg, organizationId, userId });
      throw new Error(`Remove member failed: ${msg}`);
    }
  }

  // ================================================================================
  // Invitation Management
  // ================================================================================

  async getOrganizationInvitations(organizationId: string): Promise<OrganizationInvitation[]> {
    try {
      log.info('Fetching organization invitations', { organizationId });
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ORGANIZATION.INVITATIONS, { organizationId });
      const response = await this.apiService.get<OrganizationInvitation[]>(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch invitations');
      }
      return response.data ?? [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch invitations', { error: msg, organizationId });
      throw new Error(`Fetch invitations failed: ${msg}`);
    }
  }

  async inviteMember(organizationId: string, data: InviteMemberData): Promise<OrganizationInvitation> {
    try {
      log.info('Inviting member', { organizationId, email: data.email, role: data.role });
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ORGANIZATION.INVITATIONS, { organizationId });
      const response = await this.apiService.post<OrganizationInvitation>(url, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to invite member');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to invite member', { error: msg, organizationId, email: data.email });
      throw new Error(`Invite member failed: ${msg}`);
    }
  }

  async acceptInvitation(invitationToken: string): Promise<void> {
    try {
      log.info('Accepting invitation');
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ORGANIZATION.ACCEPT_INVITATION, { invitationToken });
      const response = await this.apiService.post(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to accept invitation');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to accept invitation', { error: msg });
      throw new Error(`Accept invitation failed: ${msg}`);
    }
  }

  async cancelInvitation(organizationId: string, invitationId: string): Promise<void> {
    try {
      log.info('Cancelling invitation', { invitationId });
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ORGANIZATION.INVITATION, { organizationId, invitationId });
      const response = await this.apiService.delete(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to cancel invitation', { error: msg, invitationId });
      throw new Error(`Cancel invitation failed: ${msg}`);
    }
  }

  async resendInvitation(invitationId: string): Promise<void> {
    try {
      log.info('Resending invitation', { invitationId });
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.INVITATION.RESEND, { invitationId });
      const response = await this.apiService.post(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to resend invitation');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to resend invitation', { error: msg, invitationId });
      throw new Error(`Resend invitation failed: ${msg}`);
    }
  }

  // ================================================================================
  // Stats & Context
  // ================================================================================

  async getOrganizationStats(organizationId: string): Promise<OrganizationStats> {
    try {
      log.info('Fetching organization stats', { organizationId });
      const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ORGANIZATION.STATS, { organizationId });
      const response = await this.apiService.get<OrganizationStats>(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch organization stats');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch organization stats', { error: msg, organizationId });
      throw new Error(`Fetch stats failed: ${msg}`);
    }
  }

  async switchContext(userId: string, organizationId: string | null): Promise<void> {
    try {
      log.info('Switching context', { userId, organizationId });
      const response = await this.apiService.post(
        GATEWAY_ENDPOINTS.ORGANIZATION.SWITCH_CONTEXT,
        { user_id: userId, organization_id: organizationId }
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to switch context');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to switch context', { error: msg, userId, organizationId });
      throw new Error(`Switch context failed: ${msg}`);
    }
  }
}

// ================================================================================
// Default Instance Export
// ================================================================================

// Pass auth headers from the in-memory token store
import { authTokenStore } from '../stores/authTokenStore';

export const organizationService = new OrganizationService(async () => {
  const token = authTokenStore.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
});

export default organizationService;
