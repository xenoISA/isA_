/**
 * ============================================================================
 * useAlerts Hook - Convenience hook for alert consumers
 * ============================================================================
 */

import { useMemo } from 'react';
import { useAlertModule } from '../modules/AlertModule';
import type { Alert, AlertSource } from '../stores/useAlertStore';

export type { Alert, AlertSource };
export type { AlertSeverity, AlertStatus } from '../stores/useAlertStore';

/**
 * Primary alert hook — provides full alert state and actions.
 * Must be used within <AlertProvider>.
 */
export const useAlerts = () => {
  return useAlertModule();
};

/**
 * Get alerts filtered by source.
 */
export const useAlertsBySource = (source: AlertSource) => {
  const { alerts } = useAlertModule();
  return useMemo(() => alerts.filter((a) => a.source === source), [alerts, source]);
};

/**
 * Get only unread alerts.
 */
export const useUnreadAlerts = () => {
  const { alerts } = useAlertModule();
  return useMemo(() => alerts.filter((a) => a.status === 'unread'), [alerts]);
};

/**
 * Get the alert badge count for the header.
 */
export const useAlertBadgeCount = () => {
  const { unreadCount } = useAlertModule();
  return unreadCount;
};
