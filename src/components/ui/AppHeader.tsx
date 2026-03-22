import React from 'react';
import { Header } from '@isa/ui-web';
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
  /** Called when hamburger menu is clicked (to open sidebar drawer) */
  onMenuClick?: () => void;
  /** Whether sidebar drawer is currently open */
  sidebarOpen?: boolean;
  // TaskStatusIndicator props
  streamingStatus?: string;
  lastSSEEvent?: any;
  onTaskControl?: (action: 'pause_all' | 'resume_all' | 'show_details') => void;
}

/** Documentation link rendered as an action slot. */
const DocsAction: React.FC = () => (
  <a
    href={docsLinks.home}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
    aria-label="Documentation"
    style={{ transitionDuration: '150ms' }}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  </a>
);

export const AppHeader: React.FC<AppHeaderProps> = ({
  currentApp,
  availableApps,
  streamingStatus,
  lastSSEEvent,
  onTaskControl,
  onMenuClick,
  sidebarOpen,
}) => {
  // Logo element
  const logo = (
    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-blue-600 shadow-lg shadow-indigo-500/25 backdrop-blur-sm border border-white/10">
      <span className="text-lg font-bold text-white drop-shadow-sm">isA</span>
    </div>
  );

  // All action buttons -- shown inline on desktop, in overflow menu on mobile
  const actions: React.ReactNode[] = [
    <CalendarToolbar key="calendar" />,
    <TaskToolbar key="tasks" />,
    <NotificationToolbar key="alerts" />,
    <DocsAction key="docs" />,
    <ThemeToggle key="theme" size="sm" />,
  ];

  // Mobile-priority actions: theme toggle + task status always visible
  const mobileActions: React.ReactNode[] = [
    <ThemeToggle key="theme" size="sm" />,
  ];

  return (
    <Header
      logo={logo}
      title="Intelligent Systems Assistant"
      subtitle="AI-Powered Productivity"
      actions={[
        // Task status indicator is always visible (not in overflow)
        <TaskStatusIndicator
          key="task-status"
          streamingStatus={streamingStatus}
          lastSSEEvent={lastSSEEvent}
          onTaskControl={onTaskControl}
        />,
        ...actions,
      ]}
      mobileActions={[
        <TaskStatusIndicator
          key="task-status"
          streamingStatus={streamingStatus}
          lastSSEEvent={lastSSEEvent}
          onTaskControl={onTaskControl}
        />,
        ...mobileActions,
      ]}
      onMenuClick={onMenuClick}
      sidebarOpen={sidebarOpen}
      className="!bg-transparent !border-b-0"
    />
  );
};
