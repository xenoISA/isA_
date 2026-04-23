/**
 * BrowserPanel — Right panel for Browse mode.
 *
 * Wraps the SDK BrowserViewport + ActionLogPanel,
 * wiring up the useBrowserControl hook.
 *
 * @module
 */

import React, { useEffect, useState } from 'react';
import {
  ActionLogPanel as SDKActionLogPanel,
  BrowserViewport as SDKBrowserViewport,
  type BrowserAction,
  type BrowserTab,
  type PendingAction,
} from '@isa/ui-web';

const ActionLogPanel = SDKActionLogPanel as React.ComponentType<any>;
const BrowserViewport = SDKBrowserViewport as React.ComponentType<any>;

export interface BrowserPanelProps {
  /** Current screenshot */
  screenshotUrl?: string;
  /** Whether connected */
  isConnected?: boolean;
  /** Whether streaming live */
  isLive?: boolean;
  /** Current URL */
  currentUrl?: string;
  /** Open tabs */
  tabs?: BrowserTab[];
  /** Active tab */
  activeTabId?: string;
  /** Action overlay */
  actionOverlay?: PendingAction;
  /** Action history */
  actions?: BrowserAction[];
  /** Pending action */
  pendingAction?: BrowserAction | null;
  /** Auto-approve enabled */
  autoApproveEnabled?: boolean;
  /** Callbacks */
  onTabSwitch?: (tabId: string) => void;
  onClickAt?: (x: number, y: number) => void;
  onApprove?: (actionId: string) => void;
  onReject?: (actionId: string, reason?: string) => void;
  onAutoApproveToggle?: (enabled: boolean) => void;
  /** Additional CSS class */
  className?: string;
}

export const BrowserPanel: React.FC<BrowserPanelProps> = ({
  screenshotUrl,
  isConnected = false,
  isLive = false,
  currentUrl,
  tabs = [],
  activeTabId,
  actionOverlay,
  actions = [],
  pendingAction,
  autoApproveEnabled = false,
  onTabSwitch,
  onClickAt,
  onApprove,
  onReject,
  onAutoApproveToggle,
  className = '',
}) => {
  const [viewportHeight, setViewportHeight] = useState(65); // % of panel

  useEffect(() => {
    if (!pendingAction) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onApprove?.(pendingAction.id);
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onReject?.(pendingAction.id, 'Rejected from keyboard');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onApprove, onReject, pendingAction]);

  return (
    <div
      className={`browser-panel ${className}`}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '4px' }}
    >
      {/* Viewport — takes most of the space */}
      <div style={{ flex: `0 0 ${viewportHeight}%`, minHeight: 0 }}>
        <BrowserViewport
          screenshotUrl={screenshotUrl}
          isConnected={isConnected}
          isLive={isLive}
          currentUrl={currentUrl}
          tabs={tabs}
          activeTabId={activeTabId}
          onTabSwitch={onTabSwitch}
          onClickAt={onClickAt}
          actionOverlay={actionOverlay}
        />
      </div>

      {/* Resize handle */}
      <div
        style={{
          height: '4px',
          cursor: 'row-resize',
          background: 'var(--border-subtle, #e5e7eb)',
          borderRadius: '2px',
          flexShrink: 0,
        }}
        onMouseDown={(e) => {
          const startY = e.clientY;
          const startHeight = viewportHeight;
          const parent = e.currentTarget.parentElement;
          if (!parent) return;
          const parentHeight = parent.getBoundingClientRect().height;

          const onMove = (me: MouseEvent) => {
            const delta = me.clientY - startY;
            const newHeight = startHeight + (delta / parentHeight) * 100;
            setViewportHeight(Math.min(Math.max(newHeight, 30), 85));
          };
          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
      />

      {/* Action log — takes remaining space */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ActionLogPanel
          actions={actions}
          pendingAction={pendingAction || undefined}
          onApprove={onApprove}
          onReject={onReject}
          autoApproveEnabled={autoApproveEnabled}
          onAutoApproveToggle={onAutoApproveToggle}
          compact
        />
      </div>
    </div>
  );
};
