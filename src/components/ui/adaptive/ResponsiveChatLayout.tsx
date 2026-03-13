/**
 * ============================================================================
 * Responsive Chat Layout - Adaptive wrapper component
 * ============================================================================
 * 
 * Automatically switches between desktop and mobile layouts based on:
 * - Screen size and device type
 * - Touch capabilities
 * - User preferences
 * - Native app context
 */
import React, { useMemo } from 'react';
import { createLogger } from '../../../utils/logger';
import { ChatLayout, ChatLayoutProps } from '../chat/ChatLayout';

const log = createLogger('ResponsiveChatLayout');
import { ModernMobileChatLayout } from '../mobile/ModernMobileChatLayout';
import { useDeviceType } from '../../../hooks/useDeviceType';

export interface ResponsiveChatLayoutProps extends Omit<ChatLayoutProps, 'className'> {
  // Force specific layout (override auto-detection)
  forceLayout?: 'desktop' | 'mobile' | 'auto';
  
  // Mobile-specific props
  enableSwipeGestures?: boolean;
  enablePullToRefresh?: boolean;
  
  // Native app compatibility
  isNativeApp?: boolean;
  nativeStatusBarHeight?: number;
  nativeBottomSafeArea?: number;
  
  // Layout preferences
  mobileBreakpoint?: number;
  adaptiveThreshold?: number;
  
  // Additional styling
  className?: string;
  style?: React.CSSProperties;
  
  // Mobile interaction callbacks
  onNewChat?: () => void;
}

export const ResponsiveChatLayout: React.FC<ResponsiveChatLayoutProps> = ({
  forceLayout = 'auto',
  enableSwipeGestures = true,
  enablePullToRefresh = true,
  isNativeApp = false,
  nativeStatusBarHeight = 0,
  nativeBottomSafeArea = 0,
  mobileBreakpoint = 768,
  adaptiveThreshold = 0.75,
  className = '',
  style = {},
  onNewChat,
  ...props
}) => {
  const { isMobile, isTablet, screenWidth, touchSupport, isPortrait } = useDeviceType();

  // Determine which layout to use
  const layoutType = useMemo(() => {
    // Layout decision logic

    if (forceLayout !== 'auto') {
      // Using forced layout
      return forceLayout;
    }

    // Check for native app context
    if (isNativeApp) {
      log.info('Native app detected, using mobile layout');
      return 'mobile';
    }

    // Check screen width
    if (screenWidth <= mobileBreakpoint) {
      log.info('Screen width <= breakpoint, using mobile layout');
      return 'mobile';
    }

    // Tablet portrait mode prefers the mobile-optimized layout for better ergonomics
    if (isTablet && touchSupport && isPortrait) {
      return 'mobile';
    }

    // Check for explicit mobile device
    if (isMobile) {
      // Mobile device detected, using mobile layout
      return 'mobile';
    }

    // Default to desktop
    // Using desktop layout
    return 'desktop';
  }, [
    forceLayout,
    isNativeApp,
    screenWidth,
    mobileBreakpoint,
    isTablet,
    touchSupport,
    isMobile,
    isPortrait
  ]);

  // Common props for both layouts
  const commonProps = {
    messages: props.messages,
    isLoading: props.isLoading,
    isTyping: props.isTyping,
    onSendMessage: props.onSendMessage,
    onSendMultimodal: props.onSendMultimodal,
  };

  // Modern mobile layout props
  const handleNewChat = React.useCallback(() => {
    // Call the onNewChat prop if provided by parent module
    if (onNewChat) {
      onNewChat();
    } else {
      // Default fallback - refresh the page to create new chat
      log.info('New chat requested - no onNewChat handler, refreshing');
      window.location.reload();
    }
  }, [onNewChat]);

  const modernMobileProps = {
    ...commonProps,
    onNewChat: handleNewChat,
    isNativeApp,
    // Add user info if available from props
    userAvatarUrl: (props as any).userAvatarUrl,
    userName: (props as any).userName,
  };

  // Container styles
  const containerStyles = {
    ...style,
    width: '100%',
    height: '100%',
  };

  if (layoutType === 'mobile') {
    return (
      <div className={`responsive-chat-layout mobile ${className}`} style={containerStyles}>
        <ModernMobileChatLayout {...modernMobileProps} />
      </div>
    );
  }

  // Desktop layout - disable header if we're forcing mobile layout on desktop
  const desktopProps = {
    ...props,
    showHeader: layoutType === 'desktop' ? props.showHeader : false,
  };

  return (
    <div className={`responsive-chat-layout desktop ${className}`} style={containerStyles}>
      <ChatLayout {...desktopProps} />
    </div>
  );
};

export default ResponsiveChatLayout;