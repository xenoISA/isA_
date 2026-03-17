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
 * 【关注点分离】
 * ✅ 负责：
 *   - UI布局结构和响应式设计
 *   - 组件的渲染和空间分配
 *   - 样式和视觉效果管理
 *   - 事件的传递（不处理）
 * 
 * ❌ 不负责：
 *   - 业务逻辑处理（由AppModule处理）
 *   - 数据状态管理（由stores处理）
 *   - API调用（由services处理）
 *   - Hook使用（由modules处理）
 */

import React from 'react';
import { PlatformNav } from '@isa/ui-web';
import { AppHeader } from './ui/AppHeader';
import { useDeviceType } from '../hooks/useDeviceType';
import { useAuthContext } from '../providers/AuthProvider';
import { surfaceUrls } from '../config/surfaceConfig';
import { THEME_COLORS } from '../constants/theme';

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
  // Get device type to determine whether to show desktop header
  const { isMobile } = useDeviceType();
  const { authUser, isAuthenticated, logout } = useAuthContext();

  // Get rendered modules and data from AppModule via render props
  const moduleData = children?.();
  
  if (!moduleData) {
    return (
      <div className="h-screen flex items-center justify-center text-white bg-gray-900">
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
      className={`h-screen w-full flex flex-col text-white relative ${className}`} 
      style={{ background: THEME_COLORS.primaryGradient }}
    >
      {/* Ambient Glass Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-3/4 left-3/4 w-48 h-48 bg-purple-500/8 rounded-full blur-3xl opacity-50 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>
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
      {/* Application Header - Only show on desktop, hidden on mobile */}
      {!isMobile && (
        <div className="h-16 flex-shrink-0 p-2">
          <AppHeader
            currentApp={appData.currentApp}
            availableApps={appData.availableApps}
          />
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden w-full">
        {/* Render Chat Module with integrated input handling and sidebars */}
        {chatModule}
      </div>
      
      {/* User Portal - 独立渲染在最上层 */}
      {userPortal}
    </div>
  );
};