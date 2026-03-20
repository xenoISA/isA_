import React from 'react';
import { CalendarToolbar } from './CalendarToolbar';
import { TaskToolbar } from './TaskToolbar';
import { NotificationToolbar } from './NotificationToolbar';
import { TaskStatusIndicator } from './header/TaskStatusIndicator';
import { ThemeToggle } from './theme/ThemeToggle';
import { docsLinks } from '../../config/surfaceConfig';

interface AppHeaderProps {
  currentApp: string | null;
  availableApps: Array<{
    id: string;
    name: string;
    icon: string;
  }>;
  onShowLogs?: () => void;
  // TaskStatusIndicator props
  streamingStatus?: string;
  lastSSEEvent?: any;
  onTaskControl?: (action: 'pause_all' | 'resume_all' | 'show_details') => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentApp,
  availableApps,
  streamingStatus,
  lastSSEEvent,
  onTaskControl
}) => {
  const currentAppData = availableApps.find(app => app.id === currentApp);

  return (
    <header className="flex items-center justify-between w-full h-full px-4 py-2 header-actions">
      {/* Left Section - Brand & Active App */}
      <div className="flex items-center gap-6">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 shadow-lg shadow-indigo-500/25 backdrop-blur-sm border border-white/10">
            <span className="text-lg font-bold text-white drop-shadow-sm">isA</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-white/95 drop-shadow-sm">
              Intelligent Systems Assistant
            </h1>
            <span className="text-xs text-white/60 font-medium">AI-Powered Productivity</span>
          </div>
        </div>

      </div>
      
      {/* Right Section - Status & Controls */}
      <div className="flex items-center gap-3 toolbar">

        {/* Theme Toggle */}
        <ThemeToggle size="sm" className="mx-2" />

        {/* Task Status Indicator */}
        <TaskStatusIndicator
          streamingStatus={streamingStatus}
          lastSSEEvent={lastSSEEvent}
          onTaskControl={onTaskControl}
          className="ml-1"
        />
        
        {/* Toolbar Icons */}
        <div className="flex items-center gap-2 btn-group">
          <CalendarToolbar />
          <TaskToolbar />
          <NotificationToolbar />
          <a
            href={docsLinks.home}
            target="_blank"
            rel="noopener noreferrer"
            title="Documentation"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </a>
        </div>
        
      </div>
    </header>
  );
};