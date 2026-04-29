/**
 * ============================================================================
 * Notification Toolbar (NotificationToolbar.tsx) - macOS-style Notification Center
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Notification management for header toolbar
 * - System alerts, reminders, and AI suggestions
 * - Integration with assistant for intelligent notifications
 * - Similar to macOS Notification Center in toolbar
 * 
 * Design Philosophy:
 * - Quick access to all notifications
 * - Clean, focused interface for alerts
 * - Assistant-powered smart notifications
 * - Non-intrusive but informative
 */
import React, { useState, useRef, useEffect } from 'react';
import { createLogger } from '../../utils/logger';
import { useAlertStore } from '../../stores/useAlertStore';
const log = createLogger('NotificationToolbar');

// Glass Button Style Creator for Notification Toolbar
const createGlassButtonStyle = (color: string, size: 'sm' | 'md' = 'md', isDisabled: boolean = false) => ({
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: `rgba(${color}, 0.1)`,
  backdropFilter: 'blur(10px)',
  border: `1px solid rgba(${color}, 0.2)`,
  opacity: isDisabled ? 0.4 : 1,
  boxShadow: `0 2px 8px rgba(${color}, 0.15)`,
  width: size === 'sm' ? '20px' : '24px',
  height: size === 'sm' ? '20px' : '24px',
  color: `rgb(${color})`
});

const createGlassButtonHoverHandlers = (color: string, isDisabled: boolean = false) => ({
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      e.currentTarget.style.background = `rgba(${color}, 0.2)`;
      e.currentTarget.style.borderColor = `rgba(${color}, 0.4)`;
      e.currentTarget.style.transform = 'scale(1.05)';
      e.currentTarget.style.boxShadow = `0 4px 12px rgba(${color}, 0.25)`;
    }
  },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      e.currentTarget.style.background = `rgba(${color}, 0.1)`;
      e.currentTarget.style.borderColor = `rgba(${color}, 0.2)`;
      e.currentTarget.style.transform = 'scale(1)';
      e.currentTarget.style.boxShadow = `0 2px 8px rgba(${color}, 0.15)`;
    }
  }
});

interface NotificationToolbarProps {
  className?: string;
}

export const NotificationToolbar: React.FC<NotificationToolbarProps> = ({ 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useAlertStore((state) => state.notifications);
  const unreadCount = useAlertStore((state) => state.unreadCount);
  const loading = useAlertStore((state) => state.loading);
  const error = useAlertStore((state) => state.error);
  const loadNotifications = useAlertStore((state) => state.loadNotifications);
  const refreshUnreadCount = useAlertStore((state) => state.refreshUnreadCount);
  const markAllAsRead = useAlertStore((state) => state.markAllAsRead);
  const dismissNotification = useAlertStore((state) => state.dismissNotification);
  const clearAllNotifications = useAlertStore((state) => state.clearAllNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const toggleNotificationPanel = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      void loadNotifications();
      if (unreadCount > 0) {
        void markAllAsRead();
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'error': return '❌';
      case 'task': return '✅';
      case 'calendar': return '📅';
      case 'channel': return '🔔';
      default: return '📢';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'info': return 'border-l-blue-500';
      case 'warning': return 'border-l-yellow-500';
      case 'success': return 'border-l-green-500';
      case 'error': return 'border-l-red-500';
      case 'task': return 'border-l-green-500';
      case 'calendar': return 'border-l-blue-500';
      case 'channel': return 'border-l-purple-500';
      default: return 'border-l-gray-500';
    }
  };

  const formatTime = (dateLike: string) => {
    const date = new Date(dateLike);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const hasNotifications = notifications.length > 0;
  const actionableNotifications = notifications.filter((notification) =>
    notification.type === 'task' || notification.type === 'calendar',
  ).length;

  return (
    <div className={`relative ${className}`}>
      {/* Notification Toolbar Button */}
      <button
        ref={buttonRef}
        onClick={toggleNotificationPanel}
        className="relative flex items-center gap-2 px-3 py-1.5 bg-gray-800/30 border border-gray-700/50 rounded-lg text-white hover:bg-gray-700/50 transition-colors cursor-pointer"
        title="Notifications"
      >
        {/* Notification Icon with Badge */}
        <div className="relative">
          <div
            style={createGlassButtonStyle('107, 114, 128', 'md', true)}
            className="pointer-events-none"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs font-medium flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </div>
        
        {/* Label */}
        <span className="text-xs font-medium">Alerts</span>
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" />
          
          {/* Dropdown Content */}
          <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-96 bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
              <div className="flex items-center gap-2">
                <div
                  style={createGlassButtonStyle('59, 130, 246', 'md')}
                  className="pointer-events-none"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  <p className="text-xs text-gray-400">
                    {loading ? 'Loading…' : hasNotifications ? `${notifications.length} total` : 'No notifications'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {hasNotifications && (
                  <button
                    onClick={() => void clearAllNotifications()}
                    className="text-xs text-gray-400 hover:text-white transition-colors mr-2"
                  >
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={createGlassButtonStyle('239, 68, 68', 'sm')}
                  className="transition-colors"
                  title="Close"
                  {...createGlassButtonHoverHandlers('239, 68, 68')}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto">
              {error ? (
                <div className="p-4 text-center text-red-300 text-sm">
                  <div>{error}</div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  <div className="text-2xl mb-2">🔕</div>
                  <div>No notifications</div>
                  <div className="text-xs mt-2">You're all caught up!</div>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-800/30 transition-colors border-l-4 ${getNotificationColor(notification.type)} ${
                        !notification.read ? 'bg-gray-800/20' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Notification Icon */}
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg flex-shrink-0">
                          <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                        </div>

                        {/* Notification Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-white truncate">
                              {notification.title}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-300 mb-2 line-clamp-2">
                            {notification.body}
                          </p>

                          {/* Actions */}
                          {notification.route && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (typeof window !== 'undefined') {
                                    window.location.href = notification.route!;
                                  }
                                }}
                                className="px-2 py-1 bg-gray-700/50 hover:bg-gray-600/50 rounded text-xs text-gray-300 transition-colors"
                              >
                                Open
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => void dismissNotification(notification.id)}
                          className="w-6 h-6 flex items-center justify-center hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Settings */}
            <div className="p-3 border-t border-gray-700/50">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button className="flex items-center gap-2 p-2 bg-gray-800/30 hover:bg-gray-700/50 border border-gray-700/50 rounded text-left transition-colors">
                  <span className="text-sm">🔕</span>
                  <span className="text-xs text-gray-300">Do Not Disturb</span>
                </button>
                <button className="flex items-center gap-2 p-2 bg-gray-800/30 hover:bg-gray-700/50 border border-gray-700/50 rounded text-left transition-colors">
                  <span className="text-sm">⚙️</span>
                  <span className="text-xs text-gray-300">Settings</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-700/50 bg-gray-800/30">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div>
                  {hasNotifications ? (
                    <span>
                      {actionableNotifications} actionable alerts
                    </span>
                  ) : (
                    <span className="text-green-400">All clear</span>
                  )}
                </div>
                <button className="text-purple-400 hover:text-purple-300 transition-colors">
                  Smart notifications
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
