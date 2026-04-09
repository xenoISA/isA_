/**
 * ============================================================================
 * SDK ChatLayout Adapter (SDKChatLayout.tsx) - Adapter for @isa/ui-web ChatLayout
 * ============================================================================
 *
 * Thin adapter wrapping the SDK's ChatLayout component so it can be used
 * alongside the existing custom ChatLayout in isA_.
 *
 * The existing ChatLayout has ~55 props with a 3-panel layout + legacy sidebar
 * support. The SDK ChatLayout is simpler: welcome, messageList, inputBar,
 * artifactPanel, executionSteps slots inside an AppShell.
 *
 * This adapter:
 *   - Re-exports the SDK ChatLayout with app-friendly prop names
 *   - Maps common isA_ patterns (messages, input, sidebar) to SDK slots
 *   - Supports the A2UISurfacePanel as the artifact panel
 *   - Can be used for new views without touching the existing ChatLayout
 *
 * Usage:
 *   import { SDKChatLayoutAdapter } from './SDKChatLayout';
 *
 *   <SDKChatLayoutAdapter
 *     messages={<MessageList ... />}
 *     input={<InputAreaLayout ... />}
 *     sidebar={<SessionList ... />}
 *     artifactPanel={<A2UISurfacePanel ... />}
 *     artifactOpen={hasSurface}
 *   />
 */

import React, { type ReactNode, forwardRef } from 'react';
import { ChatLayout as SDKChatLayout } from '@isa/ui-web';
import type { ChatLayoutProps as SDKChatLayoutProps } from '@isa/ui-web';
import type { HeaderProps } from '@isa/ui-web';

// ---------------------------------------------------------------------------
// Adapter props — app-friendly names that map to SDK slots
// ---------------------------------------------------------------------------

export interface SDKChatLayoutAdapterProps {
  /** Message list content (maps to SDK messageList slot) */
  messages?: ReactNode;
  /** Input bar content (maps to SDK inputBar slot) */
  input?: ReactNode;
  /** Welcome screen content (maps to SDK welcome slot) */
  welcome?: ReactNode;
  /** Whether to show the welcome screen instead of messages */
  showWelcome?: boolean;

  /** Sidebar content — session list, etc. (maps to SDK sidebar via AppShell) */
  sidebar?: ReactNode;
  /** Sidebar header slot */
  sidebarHeader?: ReactNode;
  /** Sidebar footer slot */
  sidebarFooter?: ReactNode;

  /** Right-side artifact/detail panel (maps to SDK artifactPanel slot) */
  artifactPanel?: ReactNode;
  /** Whether the artifact panel is open */
  artifactOpen?: boolean;
  /** Called when artifact panel open state changes */
  onArtifactOpenChange?: (open: boolean) => void;
  /** Artifact panel width (default: 480) */
  artifactWidth?: number;

  /** Execution steps content (e.g., TraceTable, Timeline) */
  executionSteps?: ReactNode;
  /** Whether to display execution steps panel */
  showExecutionSteps?: boolean;

  /** Header props passed to the SDK AppShell's built-in header */
  headerProps?: Omit<HeaderProps, 'onMenuClick' | 'sidebarOpen'>;
  /** Custom header — replaces the built-in header entirely */
  header?: ReactNode;

  /** Additional className for the chat area */
  chatClassName?: string;
  /** Additional className for the shell container */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SDKChatLayoutAdapter — maps isA_ app conventions to the SDK ChatLayout.
 *
 * Use this for new views that want to adopt the SDK layout without modifying
 * the existing custom ChatLayout or ChatModule.
 */
export const SDKChatLayoutAdapter = forwardRef<HTMLDivElement, SDKChatLayoutAdapterProps>(
  (
    {
      // Content slots
      messages,
      input,
      welcome,
      showWelcome,

      // Sidebar (forwarded to AppShell)
      sidebar,
      sidebarHeader,
      sidebarFooter,

      // Artifact panel
      artifactPanel,
      artifactOpen,
      onArtifactOpenChange,
      artifactWidth = 480,

      // Execution steps
      executionSteps,
      showExecutionSteps,

      // Header
      headerProps,
      header,

      // Styling
      chatClassName,
      className,
    },
    ref,
  ) => {
    return (
      <SDKChatLayout
        ref={ref}
        // Chat slots
        welcome={welcome}
        messageList={messages}
        inputBar={input}
        showWelcome={showWelcome}
        // Artifact panel
        artifactPanel={artifactPanel}
        artifactOpen={artifactOpen}
        onArtifactOpenChange={onArtifactOpenChange}
        artifactWidth={artifactWidth}
        // Execution steps
        executionSteps={executionSteps}
        showExecutionSteps={showExecutionSteps}
        // AppShell passthrough
        sidebar={sidebar}
        sidebarHeader={sidebarHeader}
        sidebarFooter={sidebarFooter}
        headerProps={headerProps}
        header={header}
        chatClassName={chatClassName}
        className={className}
      />
    );
  },
);

SDKChatLayoutAdapter.displayName = 'SDKChatLayoutAdapter';

export default SDKChatLayoutAdapter;
