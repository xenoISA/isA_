/**
 * ============================================================================
 * Responsive Chat Layout - Unified wrapper component
 * ============================================================================
 *
 * Uses a SINGLE ChatLayout for all viewports. Responsive behavior is handled
 * via CSS (Tailwind breakpoints) — no separate mobile component tree.
 *
 * The sidebar becomes a drawer on mobile via the SDK ResponsiveSidebar pattern,
 * and all content (welcome screen, header, etc.) is consistent across viewports.
 */
import React from 'react';
import { ChatLayout, ChatLayoutProps } from '../chat/ChatLayout';

export interface ResponsiveChatLayoutProps extends Omit<ChatLayoutProps, 'className'> {
  className?: string;
  style?: React.CSSProperties;
  onNewChat?: () => void;
  /** Whether the session sidebar is open */
  sidebarOpen?: boolean;
  /** Callback to change sidebar open state */
  onSidebarOpenChange?: (open: boolean) => void;
}

export const ResponsiveChatLayout: React.FC<ResponsiveChatLayoutProps> = ({
  className = '',
  style = {},
  onNewChat,
  sidebarOpen,
  onSidebarOpenChange,
  ...props
}) => {
  return (
    <div
      className={`responsive-chat-layout w-full h-full ${className}`}
      style={style}
    >
      <ChatLayout
        {...props}
        sidebarOpen={sidebarOpen}
        onSidebarOpenChange={onSidebarOpenChange}
      />
    </div>
  );
};

export default ResponsiveChatLayout;
