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
import { LoginScreen } from './ui/LoginScreen';
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
  const [showLogin, setShowLogin] = useState(false);
  const [loginMode, setLoginMode] = useState<'login' | 'signup' | 'verify'>('login');

  // Auto-close sidebar on mobile after initial render (SSR-safe)
  React.useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, []);

  // Listen for login screen trigger from UserButton
  React.useEffect(() => {
    const handler = () => setShowLogin(true);
    window.addEventListener('isa:show-login', handler);
    return () => window.removeEventListener('isa:show-login', handler);
  }, []);
  const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const { authUser, isAuthenticated, isLoading: authLoading, error: authError, login, signup, verify, logout } = useAuthContext();

  // Close login screen on successful auth
  React.useEffect(() => {
    if (isAuthenticated) setShowLogin(false);
  }, [isAuthenticated]);

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
      {/* Platform Navigation — disabled pending PlatformNav component fix
          The compiled @isa/ui-web PlatformNav renders a React element where
          a text node is expected, causing "Objects are not valid as React child".
          The surface switcher (App/Console/Docs) is non-essential for the main app.
          TODO: Fix PlatformNav in isA_App_SDK and re-enable.
      */}
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
              onLoginClick: () => setShowLogin(true),
            })
          : chatModule}
      </div>

      {/* User Portal - rendered at highest layer */}
      {userPortal}

      {/* Login Screen Overlay */}
      {showLogin && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowLogin(false)}
          />
          <div className="relative z-10">
            <LoginScreen
              mode={loginMode}
              isLoading={authLoading}
              error={authError}
              onLogin={async (email, password) => {
                await login(email, password);
              }}
              onSignup={async (email, password, name) => {
                await signup(email, password, name);
                setLoginMode('verify');
              }}
              onVerify={async (code) => {
                await verify(code);
              }}
              onSwitchMode={setLoginMode}
            />
          </div>
          <button
            onClick={() => setShowLogin(false)}
            className="absolute top-4 right-4 z-20 size-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            aria-label="Close login"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="4" y1="4" x2="16" y2="16" />
              <line x1="16" y1="4" x2="4" y2="16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
