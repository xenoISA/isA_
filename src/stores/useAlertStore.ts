/**
 * ============================================================================
 * Alert Store (useAlertStore.ts) - Unified alert state management
 * ============================================================================
 */

import { create } from 'zustand';
import { createLogger } from '../utils/logger';
import { notificationService } from '../api/notificationService';

const log = createLogger('AlertStore');

// ================================================================================
// Types
// ================================================================================

export type AlertSource = 'calendar_reminder' | 'task_status' | 'mate_action' | 'system' | 'notification';
export type AlertSeverity = 'info' | 'warning' | 'error' | 'success';
export type AlertStatus = 'unread' | 'read' | 'acknowledged' | 'dismissed';

export interface Alert {
  id: string;
  source: AlertSource;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
  sourceId?: string; // e.g. calendar event_id or task_id
}

// ================================================================================
// Store
// ================================================================================

interface AlertState {
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
}

interface AlertActions {
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'status'>) => void;
  fetchAlerts: () => Promise<void>;
  markAsRead: (alertId: string) => void;
  markAllAsRead: () => void;
  acknowledge: (alertId: string) => void;
  dismiss: (alertId: string) => void;
  dismissAll: () => void;
  clearAlerts: () => void;
}

type AlertStore = AlertState & AlertActions;

export const useAlertStore = create<AlertStore>((set, get) => ({
  alerts: [],
  isLoading: false,
  error: null,

  addAlert: (partial) => {
    const alert: Alert = {
      ...partial,
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      status: 'unread',
    };
    set((state) => ({ alerts: [alert, ...state.alerts] }));
    log.info('Alert added', { id: alert.id, source: alert.source });
  },

  fetchAlerts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await notificationService.getNotifications({ limit: 50 });
      const alerts: Alert[] = response.notifications.map((n) => ({
        id: n.id,
        source: 'notification' as AlertSource,
        severity: (n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : 'info') as AlertSeverity,
        status: n.status === 'read' ? 'read' : 'unread',
        title: n.title,
        message: n.message,
        timestamp: n.created_at,
        metadata: n.metadata as Record<string, any>,
      }));
      set({ alerts, isLoading: false });
      log.info('Alerts fetched', { count: alerts.length });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch alerts';
      log.warn('Fetch alerts failed (backend may be offline)', { error: msg });
      set({ error: msg, isLoading: false });
    }
  },

  markAsRead: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, status: 'read' as AlertStatus } : a
      ),
    }));
    // Best-effort backend sync
    notificationService.markAsRead([alertId]).catch(() => {});
  },

  markAllAsRead: () => {
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, status: 'read' as AlertStatus })),
    }));
    notificationService.markAllAsRead().catch(() => {});
  },

  acknowledge: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.id === alertId ? { ...a, status: 'acknowledged' as AlertStatus } : a
      ),
    }));
  },

  dismiss: (alertId) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== alertId),
    }));
    notificationService.dismiss([alertId]).catch(() => {});
  },

  dismissAll: () => {
    const ids = get().alerts.map((a) => a.id);
    set({ alerts: [] });
    if (ids.length > 0) notificationService.dismiss(ids).catch(() => {});
  },

  clearAlerts: () => set({ alerts: [], error: null }),
}));

// ================================================================================
// Selectors
// ================================================================================

export const useAlerts = () => useAlertStore((s) => s.alerts);
export const useUnreadAlertCount = () => useAlertStore((s) => s.alerts.filter((a) => a.status === 'unread').length);
export const useAlertsBySource = (source: AlertSource) => useAlertStore((s) => s.alerts.filter((a) => a.source === source));
export const useAlertLoading = () => useAlertStore((s) => s.isLoading);
export const useAlertError = () => useAlertStore((s) => s.error);

export const useAlertActions = () =>
  useAlertStore((s) => ({
    addAlert: s.addAlert,
    fetchAlerts: s.fetchAlerts,
    markAsRead: s.markAsRead,
    markAllAsRead: s.markAllAsRead,
    acknowledge: s.acknowledge,
    dismiss: s.dismiss,
    dismissAll: s.dismissAll,
    clearAlerts: s.clearAlerts,
  }));
