/**
 * ============================================================================
 * OrganizationFeatureShowcase - Complete Integration Example
 * ============================================================================
 * 
 * Comprehensive example demonstrating the new organization architecture:
 * - Context-aware UserButton with organization switching
 * - Role-based permission controls
 * - Member invitation and management
 * - Email service integration
 * - Clean separation of concerns
 * 
 * This serves as both a working example and integration test for the new
 * modular architecture supporting personal and organization contexts.
 */

import React, { useState } from 'react';
import { createLogger } from '../../utils/logger';
import UserButtonContainer from '../ui/user/UserButtonContainer';

const log = createLogger('OrganizationFeatureShowcase');
import OrganizationMembersPanel from '../ui/organization/OrganizationMembersPanel';
import PermissionGuard, { 
  OwnerOnly, 
  AdminOnly, 
  OrganizationOnly, 
  PersonalOnly,
  usePermissionCheck 
} from '../ui/permissions/PermissionGuard';
import { useContextModule } from '../../modules/ContextModule';

export const OrganizationFeatureShowcase: React.FC = () => {
  // Hooks for accessing context and permissions
  const contextModule = useContextModule();
  const permissions = usePermissionCheck();
  
  // UI State
  const [showUserDrawer, setShowUserDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'settings'>('overview');

  // Mock data for demonstration (in real app, this comes from modules)
  const mockMembers = [
    {
      userId: 'user1',
      email: 'owner@company.com',
      name: 'John Owner',
      role: 'owner' as const,
      permissions: ['read', 'write', 'admin', 'billing', 'delete'],
      joinedAt: '2024-01-15T10:00:00Z',
      status: 'active' as const
    },
    {
      userId: 'user2', 
      email: 'admin@company.com',
      name: 'Jane Admin',
      role: 'admin' as const,
      permissions: ['read', 'write', 'admin'],
      joinedAt: '2024-02-01T10:00:00Z',
      status: 'active' as const
    }
  ];

  const mockInvitations = [
    {
      id: 'inv1',
      email: 'newmember@company.com',
      role: 'member' as const,
      invitedBy: 'user1',
      invitedByName: 'John Owner',
      message: 'Welcome to our team!',
      status: 'pending' as const,
      expiresAt: '2024-08-25T10:00:00Z',
      createdAt: '2024-08-18T10:00:00Z'
    }
  ];

  // Mock handlers (in real app, these come from modules)
  const handleInviteMember = async (data: any) => {
    log.info('Inviting member:', data);
    // Would call organizationModule.inviteMember(organizationId, data)
  };

  const handleUpdateMemberRole = async (userId: string, role: string) => {
    log.info('Updating member role:', { userId, role });
  };

  const handleRemoveMember = async (userId: string) => {
    log.info('Removing member:', userId);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    log.info('Cancelling invitation:', invitationId);
  };

  const handleResendInvitation = async (invitationId: string) => {
    log.info('Resending invitation:', invitationId);
  };

  const handleRefresh = async () => {
    log.info('Refreshing data...');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-primary)' }}>
      {/* Header with UserButton */}
      <header 
        className="border-b px-6 py-4"
        style={{ borderColor: 'var(--border-color)', background: 'var(--background-secondary)' }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Organization Feature Demo
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Showcasing the new context-aware architecture
            </p>
          </div>
          
          {/* Context-aware UserButton */}
          <div className="w-80">
            <UserButtonContainer />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar with context information */}
        <aside 
          className="w-80 border-r p-6"
          style={{ borderColor: 'var(--border-color)', background: 'var(--background-secondary)' }}
        >
          <div className="space-y-6">
            {/* Context Status */}
            <div>
              <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Current Context
              </h3>
              <div 
                className="p-3 rounded-lg border"
                style={{ borderColor: 'var(--border-color)', background: 'var(--background-primary)' }}
              >
                <div className="flex items-center space-x-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ 
                      background: contextModule.contextType === 'organization' ? '#f59e0b' : '#10b981' 
                    }}
                  />
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {contextModule.contextType === 'organization' ? 'Organization' : 'Personal'}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {contextModule.currentContext ? 'Authenticated' : 'Not authenticated'}
                </p>
              </div>
            </div>

            {/* Available Features */}
            <div>
              <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Available Features
              </h3>
              <div className="space-y-2">
                {permissions.availableFeatures.map(feature => (
                  <div 
                    key={feature}
                    className="px-3 py-2 rounded text-sm"
                    style={{ background: 'var(--background-tertiary)', color: 'var(--text-primary)' }}
                  >
                    ✅ {feature.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                ))}
              </div>
            </div>

            {/* Permission Status */}
            <OrganizationOnly>
              <div>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Organization Permissions
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Can invite members:</span>
                    <span style={{ color: permissions.canInviteMembers ? '#10b981' : '#ef4444' }}>
                      {permissions.canInviteMembers ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Can manage org:</span>
                    <span style={{ color: permissions.canManageOrganization ? '#10b981' : '#ef4444' }}>
                      {permissions.canManageOrganization ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Is owner:</span>
                    <span style={{ color: permissions.isOrganizationOwner ? '#10b981' : '#ef4444' }}>
                      {permissions.isOrganizationOwner ? '✅' : '❌'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Is admin:</span>
                    <span style={{ color: permissions.isOrganizationAdmin ? '#10b981' : '#ef4444' }}>
                      {permissions.isOrganizationAdmin ? '✅' : '❌'}
                    </span>
                  </div>
                </div>
              </div>
            </OrganizationOnly>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Personal Context Content */}
          <PersonalOnly>
            <div className="text-center py-12">
              <div 
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'var(--color-accent)' }}
              >
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Personal Mode
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
                You're currently in personal mode. Create or join an organization to access team features.
              </p>
              <button
                className="px-6 py-3 text-white rounded-lg font-medium"
                style={{ background: 'var(--color-accent)' }}
              >
                Create Organization
              </button>
            </div>
          </PersonalOnly>

          {/* Organization Context Content */}
          <OrganizationOnly>
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                <nav className="flex space-x-8">
                  {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'members', label: 'Members' },
                    { id: 'settings', label: 'Settings' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent hover:text-gray-700'
                      }`}
                      style={{ 
                        color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--text-muted)',
                        borderBottomColor: activeTab === tab.id ? 'var(--color-accent)' : 'transparent'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Organization Overview
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div 
                      className="p-6 rounded-lg border"
                      style={{ borderColor: 'var(--border-color)', background: 'var(--background-secondary)' }}
                    >
                      <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Members
                      </h3>
                      <p className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
                        {mockMembers.length}
                      </p>
                    </div>
                    <div 
                      className="p-6 rounded-lg border"
                      style={{ borderColor: 'var(--border-color)', background: 'var(--background-secondary)' }}
                    >
                      <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Pending Invitations
                      </h3>
                      <p className="text-2xl font-bold" style={{ color: '#f59e0b' }}>
                        {mockInvitations.length}
                      </p>
                    </div>
                    <div 
                      className="p-6 rounded-lg border"
                      style={{ borderColor: 'var(--border-color)', background: 'var(--background-secondary)' }}
                    >
                      <h3 className="font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Credits Pool
                      </h3>
                      <p className="text-2xl font-bold" style={{ color: '#10b981' }}>
                        2,500
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'members' && (
                <OrganizationMembersPanel
                  organizationName="Demo Organization"
                  members={mockMembers}
                  invitations={mockInvitations}
                  currentUserId="user1"
                  currentUserRole="owner"
                  isLoading={false}
                  inviteLoading={false}
                  onInviteMember={handleInviteMember}
                  onUpdateMemberRole={handleUpdateMemberRole}
                  onRemoveMember={handleRemoveMember}
                  onCancelInvitation={handleCancelInvitation}
                  onResendInvitation={handleResendInvitation}
                  onRefresh={handleRefresh}
                />
              )}

              {activeTab === 'settings' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Organization Settings
                  </h2>
                  
                  {/* Settings sections with permission guards */}
                  <div className="space-y-6">
                    <AdminOnly fallback={
                      <div className="p-4 rounded border border-dashed border-gray-300 text-center text-gray-500">
                        Only admins and owners can access organization settings
                      </div>
                    }>
                      <div 
                        className="p-6 rounded-lg border"
                        style={{ borderColor: 'var(--border-color)', background: 'var(--background-secondary)' }}
                      >
                        <h3 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                          General Settings
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                              Organization Name
                            </label>
                            <input
                              type="text"
                              value="Demo Organization"
                              className="w-full px-3 py-2 border rounded-md"
                              style={{ 
                                borderColor: 'var(--border-color)',
                                background: 'var(--background-primary)',
                                color: 'var(--text-primary)'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </AdminOnly>

                    <OwnerOnly fallback={
                      <div className="p-4 rounded border border-dashed border-red-300 text-center text-red-500">
                        Only organization owners can access billing settings
                      </div>
                    }>
                      <div 
                        className="p-6 rounded-lg border"
                        style={{ borderColor: 'var(--border-color)', background: 'var(--background-secondary)' }}
                      >
                        <h3 className="font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                          Billing & Plan
                        </h3>
                        <p style={{ color: 'var(--text-muted)' }}>
                          Manage your organization's subscription and billing details.
                        </p>
                      </div>
                    </OwnerOnly>
                  </div>
                </div>
              )}
            </div>
          </OrganizationOnly>
        </main>
      </div>
    </div>
  );
};

export default OrganizationFeatureShowcase;