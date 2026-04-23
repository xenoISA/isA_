/**
 * ============================================================================
 * App Module (AppModule.tsx) - Global Application Coordinator
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Global application state management and coordination
 * - Module navigation and layout orchestration
 * - Coordinate ChatModule, SessionModule, Widget Modules integration
 * - Provide layout structure and app-level interfaces
 * - Delegate business logic to respective specialized modules
 * 
 * Separation of Concerns:
 * ✅ Responsible for:
 *   - Global app navigation and state coordination
 *   - Module integration and interface management
 *   - Layout structure and sidebar management
 *   - App-level event routing and delegation
 *   - Available apps configuration and registration
 * 
 * ❌ Not responsible for:
 *   - Specific business logic (delegated to respective modules)
 *   - Direct UI rendering (handled by AppLayout)
 *   - Data storage (handled by stores)
 *   - Network communication (handled by services)
 *   - Chat/Widget specific logic (handled by respective modules)
 * 
 * Data Flow:
 * app.tsx → AppModule (coordinator) → respective modules (business logic)
 * AppModule provides interfaces, modules handle their own business logic
 */

import React, { useCallback, useMemo, useState } from 'react';
import { AppLayout, AppLayoutProps } from '../components/AppLayout';
import { ChatModule } from './ChatModule';
import { SessionModule } from './SessionModule';
import { UserModule } from './UserModule';
import { ContextModule } from './ContextModule';
import { OrganizationModule } from './OrganizationModule';
import { AlertModule } from './AlertModule';
import { RightSidebarLayout } from '../components/ui/chat/RightSidebarLayout';
import UserButtonContainer from '../components/ui/user/UserButtonContainer';
import { UserPortal } from '../components/ui/user/UserPortal';
import { CommandPalette } from '../components/ui/chat/CommandPalette';
import { SettingsModal } from '../components/ui/settings/SettingsModal';
import { ArtifactCanvas } from '../components/ui/chat/ArtifactCanvas';
import { ArtifactSheet } from '../components/ui/chat/ArtifactSheet';
// Side-effect import: registers default + widget-specific artifact renderers (#255)
import '../components/ui/chat/renderers';
import { KeyboardShortcutsOverlay } from '../components/ui/settings/KeyboardShortcutsOverlay';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

// Business logic hooks
import { useChat } from '../hooks/useChat';
import { useArtifactLogic } from './ArtifactModule';
import { useAppStore } from '../stores/useAppStore';
import { widgetHandler } from '../components/core/WidgetHandler';
import { logger, LogCategory } from '../utils/logger';
import { AppId } from '../types/appTypes';
import { useTranslation } from '../hooks/useTranslation';

// 🆕 Plugin System Integration
import { initializePluginSystem } from '../plugins';

interface AppModuleProps extends Omit<AppLayoutProps, 'children'> {
  // All AppLayout props except children that we'll provide from business logic
}

/**
 * App Module - Global coordinator for main application
 * 
 * This module:
 * - Coordinates module integration and navigation
 * - Manages global app state and layout
 * - Delegates business logic to specialized modules
 * - Provides clean interfaces between modules
 * - Keeps AppLayout as pure UI component
 */
export const AppModule: React.FC<AppModuleProps> = (props) => {
  const { t } = useTranslation();
  
  // User Portal state
  const [showUserPortal, setShowUserPortal] = useState(false);
  
  // Widget selector state
  const [showWidgetSelector, setShowWidgetSelector] = useState(false);

  // Command palette, settings, and shortcuts overlay state (#193, #197, #198)
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const handleStartNewChat = useCallback(() => {
    useAppStore.getState().startNewChat();
  }, []);

  // Register global keyboard shortcuts (#198)
  useKeyboardShortcuts(useMemo(() => [
    { key: 'k', meta: true, description: 'Search conversations', category: 'Navigation', action: () => setShowCommandPalette(true) },
    { key: ',', meta: true, description: 'Open settings', category: 'Navigation', action: () => setShowSettings(true) },
    { key: 'n', meta: true, description: 'New chat', category: 'Chat', action: handleStartNewChat },
    { key: '?', description: 'Show keyboard shortcuts', category: 'Help', action: () => setShowShortcuts(true) },
  ], [handleStartNewChat]));
  
  // Right panel state
  const [showRightPanel, setShowRightPanel] = useState(false);
  
  // 🆕 Initialize Plugin System
  React.useEffect(() => {
    try {
      initializePluginSystem();
      logger.info(LogCategory.SYSTEM, '🔌 Plugin System initialized in AppModule');
    } catch (error) {
      logger.error(LogCategory.SYSTEM, '🔌 Failed to initialize Plugin System', { error });
    }
  }, []);
  
  // Business logic hooks
  const chatInterface = useChat();
  const artifactLogic = useArtifactLogic();
  
  // App state management
  const {
    currentApp,
    showRightSidebar,
    triggeredAppInput,
    setCurrentApp,
    setShowRightSidebar,
    setTriggeredAppInput
  } = useAppStore();

  // Create translated available apps
  const availableApps = useMemo(() => [
    { 
      id: 'dream', 
      name: t('widgets.dreamforge'), 
      icon: '🎨', 
      description: 'AI-powered image generation and creative design',
      triggers: ['画', '生成图片', 'draw', 'create image', 'generate'],
      category: 'creative'
    },
    { 
      id: 'hunt', 
      name: t('widgets.huntai'), 
      icon: '🔍', 
      description: 'Search and discover information',
      triggers: ['搜索', 'search', 'find', 'look up'],
      category: 'search'
    },
    { 
      id: 'omni', 
      name: t('widgets.omnicontent'), 
      icon: '✨', 
      description: 'Multi-purpose content generation',
      triggers: ['内容', 'content', 'generate', 'create'],
      category: 'content'
    },
    { 
      id: 'data-scientist', 
      name: t('widgets.datawise'), 
      icon: '📊', 
      description: 'Data analysis and visualization',
      triggers: ['分析', 'analyze', 'data', 'chart', 'graph'],
      category: 'analytics'
    },
    { 
      id: 'knowledge', 
      name: t('widgets.knowledgehub'), 
      icon: '📚', 
      description: 'Knowledge management and research',
      triggers: ['知识', 'knowledge', 'research', 'learn'],
      category: 'research'
    },
    { 
      id: 'assistant', 
      name: t('widgets.assistant'), 
      icon: '🤖', 
      description: 'General AI assistance and conversation',
      triggers: ['助手', 'assistant', 'help', 'ai'],
      category: 'general'
    }
  ], [t]);

  // Module state management - no debug logging needed

  // Note: Widget trigger logic is now handled in useChatStore reactive subscriber

  // Global management: Handle file selection - delegate to appropriate module
  const handleFileSelect = useCallback((files: FileList) => {
    logger.info(LogCategory.USER_INPUT, 'Files selected - delegating to modules', { 
      fileCount: files.length,
      fileNames: Array.from(files).map(f => f.name)
    });
    
    // AppModule just delegates file handling to appropriate modules
    // ChatModule will handle chat-related file processing
    // Widget modules will handle their own file processing when needed
  }, []);

  // Widget management removed from AppModule - will be handled by separate WidgetModule
  // This decouples chat and widget business logic

  // Global management: App navigation and coordination
  const handleCloseApp = useCallback(() => {
    setShowRightSidebar(false);
    setCurrentApp(null);
    setTriggeredAppInput('');
    logger.info(LogCategory.APP_TRIGGER, 'App closed', { previousApp: currentApp });
  }, [setShowRightSidebar, setCurrentApp, setTriggeredAppInput, currentApp]);

  const handleBackToList = useCallback(() => {
    setCurrentApp(null);
    setTriggeredAppInput('');
    // Keep showRightSidebar true to show widget list
    logger.info(LogCategory.APP_TRIGGER, 'Back to widget list', { previousApp: currentApp });
  }, [setCurrentApp, setTriggeredAppInput, currentApp]);

  const handleAppSelect = useCallback((appId: string) => {
    // AppModule manages app selection but delegates business logic to respective modules
    setCurrentApp(appId as AppId);
    setShowRightSidebar(true);
    logger.info(LogCategory.APP_TRIGGER, 'App selected - delegating to module', { appId });
  }, [setCurrentApp, setShowRightSidebar]);

  const handleToggleSidebar = useCallback(() => {
    setShowWidgetSelector(true);
    logger.info(LogCategory.APP_TRIGGER, 'Widget selector opened');
  }, []);

  const handleCloseWidgetSelector = useCallback(() => {
    setShowWidgetSelector(false);
    logger.info(LogCategory.APP_TRIGGER, 'Widget selector closed');
  }, []);

  const handleShowWidgetSelector = useCallback(() => {
    setShowWidgetSelector(true);
    logger.info(LogCategory.APP_TRIGGER, 'Widget selector opened via magic wand');
  }, []);

  const handleWidgetSelect = useCallback((widgetId: string, mode: 'half' | 'full') => {
    setCurrentApp(widgetId as AppId);
    setShowWidgetSelector(false);
    
    if (mode === 'half') {
      setShowRightSidebar(true);
    }
    // Full mode will be handled by ChatModule
    
    logger.info(LogCategory.APP_TRIGGER, 'Widget selected from selector', { widgetId, mode });
  }, [setCurrentApp, setShowRightSidebar]);

  const handleToggleRightPanel = useCallback(() => {
    setShowRightPanel(!showRightPanel);
    logger.info(LogCategory.APP_TRIGGER, 'Right panel toggled', { newState: !showRightPanel });
  }, [showRightPanel]);


  // Prepare data for pure UI component
  const appLayoutData = useMemo(() => ({
    // App state
    currentApp,
    showRightSidebar,
    triggeredAppInput,
    availableApps,
    
    // App management callbacks
    onCloseApp: handleCloseApp,
    onAppSelect: handleAppSelect,
    onToggleSidebar: handleToggleSidebar,
    
    // File handling (delegated to modules)
    onFileSelect: handleFileSelect,
    
    // Artifact data (delegated to ArtifactModule)
    artifacts: artifactLogic.artifacts
  }), [
    currentApp,
    showRightSidebar,
    triggeredAppInput,
    availableApps,
    handleCloseApp,
    handleAppSelect,
    handleToggleSidebar,
    handleFileSelect,
    artifactLogic.artifacts
  ]);

  // Render children as render props pattern with business logic data
  return (
    <ContextModule>
      <OrganizationModule>
        <AlertModule />
        {/* 🆕 Session Artifact Tester - Development Only */}
        
        <AppLayout {...props}>
      {() => ({
        // Simplified Chat with pure module integration
        chatModule: (
          <ChatModule
            showWidgetSelector={showWidgetSelector}
            onCloseWidgetSelector={handleCloseWidgetSelector}
            onShowWidgetSelector={handleShowWidgetSelector}
            onWidgetSelect={handleWidgetSelect}
            showRightPanel={showRightPanel}
            onToggleRightPanel={handleToggleRightPanel}
            
            // Handle file selection
            inputProps={{
              onFileSelect: handleFileSelect
            }}
            
            // Left Sidebar - SessionModule + UserButton
            sidebarContent={
              <SessionModule 
                sidebarWidth="300px" 
                userContent={
                  <UserButtonContainer />
                }
              />
            }
            
            // Right Sidebar - Widget Management
            rightSidebarContent={
              <RightSidebarLayout
                currentApp={currentApp}
                showRightSidebar={showRightSidebar}
                triggeredAppInput={triggeredAppInput}
                onCloseApp={handleCloseApp}
                onBackToList={handleBackToList}
                onAppSelect={handleAppSelect}
              />
            }
          />
        ),
        
        // Session Module (already integrated in chatModule sidebar)
        sessionModule: null,
        
        // User Module (already provided in app.tsx)
        userModule: null,
        
        // App data for layout
        appData: appLayoutData,
        
        // User Portal - 作为额外组件
        userPortal: (
          <UserPortal
            isOpen={showUserPortal}
            onClose={() => setShowUserPortal(false)}
          />
        )
      })}
        </AppLayout>

        {/* Global overlays (#193, #197, #198) */}
        <CommandPalette
          open={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          onAction={(id) => {
            if (id === 'new-chat') handleStartNewChat();
            if (id === 'settings') setShowSettings(true);
          }}
        />
        <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
        <KeyboardShortcutsOverlay open={showShortcuts} onClose={() => setShowShortcuts(false)} />

        {/* Artifact overlays — canvas (desktop full-screen) and sheet (mobile bottom) (#253, #254) */}
        <ArtifactCanvas />
        <ArtifactSheet />
      </OrganizationModule>
    </ContextModule>
  );
};
