/**
 * ============================================================================
 * Left Sidebar Layout - Session list + User profile
 * ============================================================================
 */

import React, { memo } from 'react';
import { SessionHistory } from '../session/SessionHistory';

export interface LeftSidebarLayoutProps {
  className?: string;
  sidebarWidth?: string | number;
  sessions?: any[];
  currentSessionId?: string;
  isLoadingSession?: boolean;
  editingSessionId?: string | null;
  editingTitle?: string;
  searchQuery?: string;
  onSessionSelect?: (sessionId: string) => void;
  onNewSession?: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onRenameSession?: (sessionId: string, newTitle: string) => void;
  onStartRename?: (sessionId: string, currentTitle: string) => void;
  onCancelRename?: () => void;
  onEditingTitleChange?: (title: string) => void;
  onSearchChange?: (query: string) => void;
  userContent?: React.ReactNode;
}

export const LeftSidebarLayout = memo<LeftSidebarLayoutProps>(({
  className = '',
  sessions,
  currentSessionId,
  isLoadingSession,
  editingSessionId,
  editingTitle,
  searchQuery,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onStartRename,
  onCancelRename,
  onEditingTitleChange,
  onSearchChange,
  userContent
}) => {
  return (
    <div className={`session-sidebar ${className} h-full flex flex-col`}>
      {/* Sessions — fills available space */}
      <div className="flex-1 flex flex-col min-h-0">
        <SessionHistory
          sessions={sessions}
          currentSessionId={currentSessionId}
          isLoading={isLoadingSession}
          editingSessionId={editingSessionId}
          editingTitle={editingTitle}
          searchQuery={searchQuery}
          onSessionSelect={onSessionSelect}
          onNewSession={onNewSession}
          onDeleteSession={onDeleteSession}
          onRenameSession={onRenameSession}
          onStartRename={onStartRename}
          onCancelRename={onCancelRename}
          onEditingTitleChange={onEditingTitleChange}
          onSearchChange={onSearchChange}
          className="flex-1 p-4"
        />
      </div>

      {/* User area — pinned to bottom */}
      {userContent && (
        <div className="flex-shrink-0 border-t border-white/[0.08] px-3 py-2">
          {userContent}
        </div>
      )}
    </div>
  );
});
