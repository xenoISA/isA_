/**
 * ============================================================================
 * UserButton Component - Sidebar Profile Button
 * ============================================================================
 */

import React, { useState } from 'react';
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
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserData | null;
  credits: number;
  currentPlan: string;
  contextType: UserContextType;
  currentOrganization?: OrganizationData;
  availableOrganizations: OrganizationData[];
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
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getDisplayName = () => {
    if (!user) return 'User';
    if (contextType === 'organization' && currentOrganization) {
      return currentOrganization.name;
    }
    return user.name || user.email || 'User';
  };

  const getSubtitle = () => {
    if (contextType === 'organization' && currentOrganization) {
      return `${currentOrganization.creditsPool} credits`;
    }
    return `${credits} credits`;
  };

  const getInitial = () => {
    if (contextType === 'organization' && currentOrganization) {
      return currentOrganization.name.charAt(0).toUpperCase();
    }
    return user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?';
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <button
        onClick={onLogin}
        disabled={isLoading}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-150 text-white/70 hover:text-white hover:bg-white/[0.06]"
        aria-label="Sign in"
      >
        <div className="size-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
          <svg className="size-4 text-white/50" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Sign In</div>
        </div>
        {isLoading && (
          <div className="size-4 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
        )}
      </button>
    );
  }

  const isOrg = contextType === 'organization';

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-150 hover:bg-white/[0.06] group"
        aria-label="Account settings"
      >
        {/* Avatar */}
        <div
          className={`size-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0 ${
            isOrg ? 'bg-amber-600' : 'bg-[#3b82f6]'
          }`}
        >
          {getInitial()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white/90 truncate leading-tight">
            {getDisplayName()}
          </div>
          <div className="text-xs text-white/45 leading-tight mt-0.5 tabular-nums">
            {getSubtitle()} · {currentPlan}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className="size-4 text-white/25 group-hover:text-white/50 transition-colors flex-shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <UserPortal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
