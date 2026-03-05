/**
 * ============================================================================
 * Mobile Chat Layout - Mobile-first responsive chat interface
 * ============================================================================
 * 
 * Features:
 * - Responsive breakpoints for all screen sizes
 * - Mobile-first design with touch-friendly interactions
 * - Gesture support (swipe, pull-to-refresh)
 * - Native app compatibility (PWA/Cordova/React Native)
 * - Optimized performance for mobile devices
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createLogger } from '../../../utils/logger';
import { ChatMessage } from '../chat/ChatLayout';

const log = createLogger('MobileChatLayout');
import { ModernMobileMessageList } from './ModernMobileMessageList';
import { ModernMobileInputArea } from './ModernMobileInputArea';
import { ModernMobileHeader } from './ModernMobileHeader';
import { MobileSidebar } from './MobileSidebar';
import { useDeviceType } from '../../../hooks/useDeviceType';
// Note: useGestures hook available for gesture implementation

export interface MobileChatLayoutProps {
  // Core chat props
  messages?: ChatMessage[];
  isLoading?: boolean;
  isTyping?: boolean;
  
  // Callbacks
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>;
  onSendMultimodal?: (content: string, files: File[], metadata?: Record<string, any>) => Promise<void>;
  
  // Layout content
  leftSidebarContent?: React.ReactNode;
  rightSidebarContent?: React.ReactNode;
  headerContent?: React.ReactNode;
  
  // Layout state
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
  onToggleLeftSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  
  // Mobile-specific props
  enableSwipeGestures?: boolean;
  enablePullToRefresh?: boolean;
  maxWidth?: string;
  
  // Native app compatibility
  isNativeApp?: boolean;
  nativeStatusBarHeight?: number;
  nativeBottomSafeArea?: number;
}

export const MobileChatLayout: React.FC<MobileChatLayoutProps> = ({
  messages = [],
  isLoading = false,
  isTyping = false,
  onSendMessage,
  onSendMultimodal,
  leftSidebarContent,
  rightSidebarContent,
  headerContent,
  showLeftSidebar = false,
  showRightSidebar = false,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  enableSwipeGestures = true,
  enablePullToRefresh = true,
  maxWidth = '100%',
  isNativeApp = false,
  nativeStatusBarHeight = 0,
  nativeBottomSafeArea = 0
}) => {
  const { isMobile, isTablet, deviceType } = useDeviceType();
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    if (!enablePullToRefresh) return;
    
    setRefreshing(true);
    // Add your refresh logic here
    setTimeout(() => setRefreshing(false), 1000);
  }, [enablePullToRefresh]);

  // Note: Gesture handlers would be implemented here
  // Currently simplified for compatibility

  // Handle keyboard for native apps
  useEffect(() => {
    if (isNativeApp) {
      const handleKeyboard = (height: number) => setKeyboardHeight(height);
      
      // Native keyboard listeners would be set up here
      // This is a placeholder for native implementations
      
      return () => {
        // Cleanup keyboard listeners
      };
    }
  }, [isNativeApp]);

  // Dynamic styles based on device and native app status
  const containerStyles = useMemo(() => ({
    height: isNativeApp 
      ? `calc(100vh - ${nativeStatusBarHeight}px - ${nativeBottomSafeArea}px - ${keyboardHeight}px)`
      : '100vh',
    paddingTop: nativeStatusBarHeight,
    paddingBottom: nativeBottomSafeArea,
    maxWidth,
    margin: '0 auto',
  }), [isNativeApp, nativeStatusBarHeight, nativeBottomSafeArea, keyboardHeight, maxWidth]);

  // Responsive layout classes
  const layoutClasses = useMemo(() => {
    const base = 'mobile-chat-layout flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-800';
    const responsive = isMobile ? 'mobile-optimized' : isTablet ? 'tablet-optimized' : 'desktop-optimized';
    const native = isNativeApp ? 'native-app' : 'web-app';
    
    return `${base} ${responsive} ${native}`;
  }, [isMobile, isTablet, isNativeApp]);

  return (
    <div 
      className={layoutClasses}
      style={containerStyles}
      // Note: gesture handlers would be spread here
    >
      {/* Modern Mobile Header */}
      <ModernMobileHeader
        title="AI Assistant"
        subtitle="Online"
        showNewChatButton={true}
        showUserAvatar={true}
        onMenuClick={onToggleLeftSidebar}
        onNewChatClick={() => {
          // Reset chat logic would go here
          log.info('New chat clicked');
        }}
        onUserAvatarClick={onToggleRightSidebar}
        isNativeApp={isNativeApp}
      />
      
      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left sidebar */}
        <MobileSidebar
          content={leftSidebarContent || (
            <div className="p-4">
              <h3 className="text-white font-semibold mb-4">Menu</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 text-white bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  🏠 Home
                </button>
                <button className="w-full text-left px-4 py-3 text-white bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  💬 Chat History
                </button>
                <button className="w-full text-left px-4 py-3 text-white bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  ⚙️ Settings
                </button>
                <button className="w-full text-left px-4 py-3 text-white bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  👤 Profile
                </button>
              </div>
            </div>
          )}
          isOpen={showLeftSidebar}
          onClose={onToggleLeftSidebar}
          position="left"
          enableSwipeToClose={enableSwipeGestures}
        />
        
        {/* Chat content */}
        <div className="flex-1 flex flex-col min-w-0">
          <ModernMobileMessageList
            messages={messages}
            isLoading={isLoading}
            isTyping={isTyping}
          />
          
          <ModernMobileInputArea
            onSendMessage={onSendMessage}
            onSendMultimodalMessage={onSendMultimodal}
            isLoading={isLoading}
            keyboardHeight={keyboardHeight}
            isNativeApp={isNativeApp}
            placeholder="Message AI Assistant..."
          />
        </div>
        
        {/* Right sidebar */}
        <MobileSidebar
          content={rightSidebarContent || (
            <div className="p-4">
              <h3 className="text-white font-semibold mb-4">Options</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 text-white bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  🔔 Notifications
                </button>
                <button className="w-full text-left px-4 py-3 text-white bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  🎨 Theme
                </button>
                <button className="w-full text-left px-4 py-3 text-white bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  📱 Apps
                </button>
                <button className="w-full text-left px-4 py-3 text-white bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  ℹ️ About
                </button>
              </div>
            </div>
          )}
          isOpen={showRightSidebar}
          onClose={onToggleRightSidebar}
          position="right"
          enableSwipeToClose={enableSwipeGestures}
        />
        
        {/* Backdrop for sidebars */}
        {(showLeftSidebar || showRightSidebar) && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => {
              onToggleLeftSidebar?.();
              onToggleRightSidebar?.();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default MobileChatLayout;