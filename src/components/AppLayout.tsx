/**
 * ============================================================================
 * App Layout (AppLayout.tsx) - Pure UI Layout Component
 * ============================================================================
 *
 * Core Responsibilities:
 * - Provide pure UI layout structure for the main application
 * - Render header, chat area, and sidebars based on props
 * - Handle responsive design and layout states
 * - Coordinate UI components without business logic
 *
 * Architecture:
 * - Receives all data and callbacks as props from AppModule
 * - Renders pure UI components with provided data
 * - Three-panel layout: Header + (LeftSidebar + Chat + RightSidebar)
 * - No direct hooks or business logic
 *
 * Responsive strategy:
 * - Desktop (>=1024px): persistent sidebar, full header actions
 * - Mobile/tablet (<1024px): sidebar as drawer, header overflow menu
 */

import React, { useState, useCallback } from 'react';
import { PlatformNav } from '@isa/ui-web';
import { AppHeader } from './ui/AppHeader';
import { useAuthContext } from '../providers/AuthProvider';
import { surfaceUrls } from '../config/surfaceConfig';

export interface AppLayoutProps {
  className?: string;
  children?: () => {
    chatModule: React.ReactNode;
    sessionModule: React.ReactNode;
    userModule: React.ReactNode;
    userPortal: React.ReactNode;
    appData: {
      currentApp: string | null;
      showRightSidebar: boolean;
      triggeredAppInput: string;
      availableApps: Array<{
        id: string;
        name: string;
        icon: string;
        triggers: string[];
      }>;
      onCloseApp: () => void;
      onAppSelect: (appId: string) => void;
      onToggleSidebar: () => void;
      onFileSelect: (files: FileList) => void;
      artifacts?: any[];
    };
  };
}

/**
 * Pure UI AppLayout component
 * Receives all data and callbacks as props from AppModule
 * No business logic or direct state management
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ className = '', children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const { authUser, isAuthenticated, logout } = useAuthContext();

  // Get rendered modules and data from AppModule via render props
  const moduleData = children?.();

  if (!moduleData) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-white bg-gray-900">
        <div className="text-center">
          <div className="text-xl font-bold mb-2">Loading Application...</div>
          <div className="text-gray-400">Setting up modules...</div>
        </div>
      </div>
    );
  }

  const { chatModule, appData, userPortal } = moduleData;

  return (
    <div
      className={`min-h-dvh w-full flex flex-col bg-[var(--surface-bg,#0f172a)] text-[var(--text-primary,#fff)] relative ${className}`}
    >
      {/* Platform Navigation - Surface switcher for authenticated users */}
      {isAuthenticated && (
        <PlatformNav
          activeSurface="app"
          user={authUser ? { name: authUser.name, email: authUser.email } : null}
          urls={{
            app: surfaceUrls.app,
            console: surfaceUrls.console,
            docs: surfaceUrls.docs,
            marketing: surfaceUrls.marketing,
          }}
          onLogout={logout}
        />
      )}
      {/* Application Header - responsive on all viewports */}
      <div className="h-14 md:h-16 flex-shrink-0 p-1.5 md:p-2">
        <AppHeader
          currentApp={appData.currentApp}
          availableApps={appData.availableApps}
          onMenuClick={toggleSidebar}
          sidebarOpen={sidebarOpen}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden w-full">
        {/* Render Chat Module with sidebar state injected */}
        {React.isValidElement(chatModule)
          ? React.cloneElement(chatModule as React.ReactElement<any>, {
              sidebarOpen,
              onSidebarOpenChange: (open: boolean) => open ? openSidebar() : closeSidebar(),
            })
          : chatModule}
      </div>

      {/* User Portal - rendered at highest layer */}
      {userPortal}
    </div>
  );
};
