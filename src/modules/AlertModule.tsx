/**
 * ============================================================================
 * Alert Module - Unified alert management provider
 * ============================================================================
 *
 * Orchestrates calendar reminders, task status alerts, Mate actions,
 * and system notifications into a single alert feed.
 */

import React, { createContext, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { createLogger } from '../utils/logger';
import {
  useAlertStore,
  useAlerts,
  useUnreadAlertCount,
  useAlertActions,
  type Alert,
  type AlertSource,
  type AlertSeverity,
} from '../stores/useAlertStore';

const log = createLogger('AlertModule');

// ================================================================================
// Context
// ================================================================================

interface AlertModuleContextValue {
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'status'>) => void;
  markAsRead: (alertId: string) => void;
  markAllAsRead: () => void;
  acknowledge: (alertId: string) => void;
  dismiss: (alertId: string) => void;
  dismissAll: () => void;
  refresh: () => Promise<void>;
}

const AlertModuleContext = createContext<AlertModuleContextValue | null>(null);

// ================================================================================
// Provider
// ================================================================================

interface AlertProviderProps {
  children: React.ReactNode;
  pollInterval?: number; // ms, default 60000 (1 min)
}

export const AlertProvider: React.FC<AlertProviderProps> = ({
  children,
  pollInterval = 60000,
}) => {
  const alerts = useAlerts();
  const unreadCount = useUnreadAlertCount();
  const isLoading = useAlertStore((s) => s.isLoading);
  const error = useAlertStore((s) => s.error);
  const actions = useAlertActions();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial fetch
  useEffect(() => {
    actions.fetchAlerts().catch(() => {
      log.debug('Initial alert fetch failed (backend may be offline)');
    });
  }, [actions]);

  // Polling
  useEffect(() => {
    if (pollInterval > 0) {
      pollRef.current = setInterval(() => {
        actions.fetchAlerts().catch(() => {});
      }, pollInterval);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pollInterval, actions]);

  const refresh = useCallback(async () => {
    await actions.fetchAlerts();
  }, [actions]);

  const value = useMemo<AlertModuleContextValue>(() => ({
    alerts,
    unreadCount,
    isLoading,
    error,
    addAlert: actions.addAlert,
    markAsRead: actions.markAsRead,
    markAllAsRead: actions.markAllAsRead,
    acknowledge: actions.acknowledge,
    dismiss: actions.dismiss,
    dismissAll: actions.dismissAll,
    refresh,
  }), [alerts, unreadCount, isLoading, error, actions, refresh]);

  return (
    <AlertModuleContext.Provider value={value}>
      {children}
    </AlertModuleContext.Provider>
  );
};

// ================================================================================
// Hook
// ================================================================================

export const useAlertModule = (): AlertModuleContextValue => {
  const ctx = useContext(AlertModuleContext);
  if (!ctx) {
    throw new Error('useAlertModule must be used within <AlertProvider>');
  }
  return ctx;
};

// Re-export types
export type { Alert, AlertSource, AlertSeverity };
