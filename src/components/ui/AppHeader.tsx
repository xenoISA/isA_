import React, { useState, useEffect, useRef } from 'react';
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
  // Logo element — clean, no gradient
  const logo = (
    <div className="size-9 rounded-lg flex items-center justify-center bg-white/10 border border-white/10">
      <span className="text-sm font-semibold text-white" style={{ letterSpacing: '-0.02em' }}>isA</span>
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

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!overflowOpen) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setOverflowOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [overflowOpen]);

  return (
    <header className="flex items-center gap-3 px-3 md:px-4 h-full bg-transparent">
      {/* Hamburger on mobile */}
      {isMobile && onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="flex items-center justify-center size-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            {sidebarOpen ? (
              <><line x1="4" y1="4" x2="16" y2="16" /><line x1="16" y1="4" x2="4" y2="16" /></>
            ) : (
              <><line x1="3" y1="5" x2="17" y2="5" /><line x1="3" y1="10" x2="17" y2="10" /><line x1="3" y1="15" x2="17" y2="15" /></>
            )}
          </svg>
        </button>
      )}

      {/* Logo + title */}
      {logo}
      <div className="min-w-0 hidden sm:block">
        <h1 className="text-sm font-semibold text-white truncate">Intelligent Systems Assistant</h1>
        <p className="text-xs text-white/50 truncate">AI-Powered Productivity</p>
      </div>

      <div className="flex-1" />

      {/* Task status — always visible */}
      <TaskStatusIndicator
        streamingStatus={streamingStatus}
        lastSSEEvent={lastSSEEvent}
        onTaskControl={onTaskControl}
      />

      {/* Desktop: all actions inline */}
      {!isMobile && actions.map((action, i) => <div key={i}>{action}</div>)}

      {/* Mobile: theme toggle + overflow */}
      {isMobile && (
        <>
          {mobileActions.map((action, i) => <div key={i}>{action}</div>)}
          <div className="relative" ref={overflowRef}>
            <button
              type="button"
              onClick={() => setOverflowOpen(!overflowOpen)}
              className="flex items-center justify-center size-9 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
              aria-label="More actions"
              aria-expanded={overflowOpen}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" />
              </svg>
            </button>
            {overflowOpen && (
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 min-w-[180px] z-50" role="menu">
                {actions.map((action, i) => (
                  <div key={i} role="menuitem" className="px-2 py-1 hover:bg-gray-700" onClick={() => setOverflowOpen(false)}>
                    {action}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
};
