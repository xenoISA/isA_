/**
 * ============================================================================
 * UserButton Component (UserButton.tsx) - Pure UI Component
 * ============================================================================
 * 
 * A truly pure UI component that receives all data as props and emits events.
 * Supports both personal and organization contexts with proper visual distinction.
 * 
 * Architecture Integration:
 * ✅ Pure UI component (receives props, emits events)
 * ✅ No business logic or direct hook usage
 * ✅ Supports context switching between personal/organization
 * ✅ Clean separation of concerns
 */

import React, { useState } from 'react';
import { GlassButton } from '../../shared';
import { UserPortal } from './UserPortal';

export type UserContextType = 'personal' | 'organization';

export interface UserData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface OrganizationData {
  id: string;
  name: string;
  plan: string;
  role: 'owner' | 'admin' | 'member';
  creditsPool: number;
}

export interface UserButtonProps {
  // Authentication State
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // User Data
  user: UserData | null;
  credits: number;
  currentPlan: string;
  
  // Context State
  contextType: UserContextType;
  currentOrganization?: OrganizationData;
  availableOrganizations: OrganizationData[];
  
  // Actions
  onLogin: () => void;
  onSwitchToPersonal: () => void;
  onSwitchToOrganization: (orgId: string) => void;
}

export const UserButton: React.FC<UserButtonProps> = ({
  isAuthenticated,
  isLoading,
  user,
  credits,
  currentPlan,
  contextType,
  currentOrganization,
  availableOrganizations,
  onLogin,
  onSwitchToPersonal,
  onSwitchToOrganization
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Context-aware display helpers
  const getDisplayName = () => {
    if (!user) return 'User';
    
    if (contextType === 'organization' && currentOrganization) {
      return `${currentOrganization.name} (${user.name})`;
    }
    
    return user.name || user.email || 'User';
  };

  const getDisplaySubtitle = () => {
    if (contextType === 'organization' && currentOrganization) {
      const roleDisplay = currentOrganization.role.charAt(0).toUpperCase() + currentOrganization.role.slice(1);
      return `${currentOrganization.creditsPool} credits • ${roleDisplay} • ${currentOrganization.plan}`;
    }
    
    return `${credits} credits • ${currentPlan}`;
  };

  const getAvatarContent = () => {
    if (contextType === 'organization' && currentOrganization) {
      // Show organization initial
      return currentOrganization.name.charAt(0).toUpperCase();
    }
    
    // Show user initial
    return user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';
  };

  const getAvatarStyle = () => {
    if (contextType === 'organization') {
      return {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Orange gradient for org
        boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)'
      };
    }
    
    return {
      background: 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)', // Blue-green for personal
      boxShadow: '0 2px 6px rgba(66, 133, 244, 0.2)'
    };
  };

  // 未登录状态
  if (!isAuthenticated) {
    return (
      <GlassButton
        onClick={onLogin}
        variant="ghost"
        className="w-full p-3 flex items-center space-x-3 group text-gray-800 dark:text-white/80 hover:text-gray-900 dark:hover:text-white"
        title="Sign In"
        disabled={isLoading}
      >
        {/* User Avatar - Not logged in */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>

        {/* User Info - Not logged in */}
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium text-gray-900 dark:text-white/90">
            Sign In
          </div>
          <div className="text-xs text-gray-600 dark:text-white/60">
            Click to login
          </div>
        </div>

        {/* Sign In Icon */}
        <svg className="w-4 h-4 transition-colors flex-shrink-0 text-gray-500 dark:text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
        )}
      </GlassButton>
    );
  }

  // Context Switcher (when multiple organizations available)
  const showContextSwitcher = availableOrganizations.length > 0;

  // 已登录状态
  return (
    <>
      {/* Main User Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full p-3 hover:bg-white/8 transition-all duration-200 rounded-xl flex items-center space-x-3 group border border-white/10 hover:border-white/20 user-button"
        title="Account Settings"
      >
        {/* Context-aware Avatar */}
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg user-button__avatar"
          style={getAvatarStyle()}
        >
          {getAvatarContent()}
        </div>

        {/* Context-aware User Info */}
        <div className="flex-1 text-left min-w-0 user-button__text">
          <div className="text-sm font-semibold truncate text-white/95 user-button__name">
            {getDisplayName()}
          </div>
          <div className="text-xs text-white/70 leading-tight user-button__subtitle">
            {getDisplaySubtitle()}
          </div>
        </div>

        {/* Context Indicator & Arrow */}
        <div className="flex items-center gap-2">
          {contextType === 'organization' && (
            <div 
              className="w-2 h-2 rounded-full flex-shrink-0" 
              style={{ background: '#f59e0b' }}
              title="Organization Mode"
            />
          )}
          <svg className="w-4 h-4 transition-colors flex-shrink-0 text-white/60 group-hover:text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* Restore full UserPortal functionality */}
      <UserPortal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};