import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useAlertStore } from '../useAlertStore';
import type { Alert, AlertSource } from '../useAlertStore';

// ── Mock notificationService ──────────────────────────────────────────

vi.mock('../../api/notificationService', () => ({
  notificationService: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Import after mock so we get the mocked version
import { notificationService } from '../../api/notificationService';
const mockNotificationService = notificationService as any;

// ── Helpers ───────────────────────────────────────────────────────────

const makeAlertInput = (overrides: Partial<Omit<Alert, 'id' | 'timestamp' | 'status'>> = {}) => ({
  source: 'system' as AlertSource,
  severity: 'info' as const,
  title: 'Test Alert',
  message: 'Something happened',
  ...overrides,
});

const state = () => useAlertStore.getState();

// ── Tests ─────────────────────────────────────────────────────────────

describe('useAlertStore', () => {
  beforeEach(() => {
    useAlertStore.setState({ alerts: [], isLoading: false, error: null });
    vi.clearAllMocks();
    // Make backend sync calls resolve silently
    mockNotificationService.markAsRead.mockResolvedValue({});
    mockNotificationService.markAllAsRead.mockResolvedValue({});
    mockNotificationService.dismiss.mockResolvedValue({});
  });

  // ── addAlert ──────────────────────────────────────────────────────

  describe('addAlert', () => {
    test('generates id, timestamp, and sets status to unread', () => {
      state().addAlert(makeAlertInput());

      const alerts = state().alerts;
      expect(alerts).toHaveLength(1);
      expect(alerts[0].id).toMatch(/^alert_/);
      expect(alerts[0].timestamp).toBeTruthy();
      expect(alerts[0].status).toBe('unread');
    });

    test('prepends new alerts (newest first)', () => {
      state().addAlert(makeAlertInput({ title: 'First' }));
      state().addAlert(makeAlertInput({ title: 'Second' }));

      expect(state().alerts[0].title).toBe('Second');
      expect(state().alerts[1].title).toBe('First');
    });

    test('preserves source and severity from input', () => {
      state().addAlert(makeAlertInput({ source: 'calendar_reminder', severity: 'warning' }));

      const alert = state().alerts[0];
      expect(alert.source).toBe('calendar_reminder');
      expect(alert.severity).toBe('warning');
    });
  });

  // ── fetchAlerts ───────────────────────────────────────────────────

  describe('fetchAlerts', () => {
    test('maps notifications from backend to alerts', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        notifications: [
          {
            id: 'notif_1',
            type: 'error',
            status: 'unread',
            title: 'Build failed',
            message: 'CI pipeline error',
            created_at: '2026-04-06T10:00:00Z',
            metadata: { pipeline: 'main' },
          },
          {
            id: 'notif_2',
            type: 'info',
            status: 'read',
            title: 'Deploy complete',
            message: 'Deployed to staging',
            created_at: '2026-04-06T09:00:00Z',
            metadata: {},
          },
        ],
      });

      await state().fetchAlerts();

      expect(state().alerts).toHaveLength(2);
      expect(state().alerts[0].severity).toBe('error');
      expect(state().alerts[0].status).toBe('unread');
      expect(state().alerts[1].status).toBe('read');
      expect(state().isLoading).toBe(false);
    });

    test('maps warning type correctly', async () => {
      mockNotificationService.getNotifications.mockResolvedValue({
        notifications: [
          { id: 'w1', type: 'warning', status: 'unread', title: 'Warn', message: '', created_at: '', metadata: {} },
        ],
      });

      await state().fetchAlerts();
      expect(state().alerts[0].severity).toBe('warning');
    });

    test('sets error on failure', async () => {
      mockNotificationService.getNotifications.mockRejectedValue(new Error('Offline'));

      await state().fetchAlerts();

      expect(state().error).toBe('Offline');
      expect(state().isLoading).toBe(false);
    });
  });

  // ── markAsRead ────────────────────────────────────────────────────

  describe('markAsRead', () => {
    test('sets single alert status to read', () => {
      state().addAlert(makeAlertInput({ title: 'Unread' }));
      const alertId = state().alerts[0].id;

      state().markAsRead(alertId);

      expect(state().alerts[0].status).toBe('read');
    });

    test('fires best-effort backend sync', () => {
      state().addAlert(makeAlertInput());
      const alertId = state().alerts[0].id;

      state().markAsRead(alertId);

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith([alertId]);
    });

    test('does not affect other alerts', () => {
      state().addAlert(makeAlertInput({ title: 'A' }));
      state().addAlert(makeAlertInput({ title: 'B' }));
      const idA = state().alerts.find((a) => a.title === 'A')!.id;

      state().markAsRead(idA);

      const b = state().alerts.find((a) => a.title === 'B')!;
      expect(b.status).toBe('unread');
    });
  });

  // ── markAllAsRead ─────────────────────────────────────────────────

  describe('markAllAsRead', () => {
    test('marks every alert as read', () => {
      state().addAlert(makeAlertInput({ title: 'A' }));
      state().addAlert(makeAlertInput({ title: 'B' }));

      state().markAllAsRead();

      state().alerts.forEach((a) => expect(a.status).toBe('read'));
    });

    test('syncs with backend', () => {
      state().addAlert(makeAlertInput());
      state().markAllAsRead();
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalled();
    });
  });

  // ── acknowledge ───────────────────────────────────────────────────

  describe('acknowledge', () => {
    test('sets alert status to acknowledged', () => {
      state().addAlert(makeAlertInput());
      const id = state().alerts[0].id;

      state().acknowledge(id);

      expect(state().alerts[0].status).toBe('acknowledged');
    });
  });

  // ── dismiss ───────────────────────────────────────────────────────

  describe('dismiss', () => {
    test('removes the alert from the list', () => {
      state().addAlert(makeAlertInput({ title: 'Keep' }));
      state().addAlert(makeAlertInput({ title: 'Remove' }));
      const removeId = state().alerts.find((a) => a.title === 'Remove')!.id;

      state().dismiss(removeId);

      expect(state().alerts).toHaveLength(1);
      expect(state().alerts[0].title).toBe('Keep');
    });

    test('fires backend dismiss', () => {
      state().addAlert(makeAlertInput());
      const id = state().alerts[0].id;

      state().dismiss(id);

      expect(mockNotificationService.dismiss).toHaveBeenCalledWith([id]);
    });
  });

  // ── dismissAll ────────────────────────────────────────────────────

  describe('dismissAll', () => {
    test('removes all alerts', () => {
      state().addAlert(makeAlertInput({ title: 'A' }));
      state().addAlert(makeAlertInput({ title: 'B' }));

      state().dismissAll();

      expect(state().alerts).toHaveLength(0);
    });

    test('sends all ids to backend', () => {
      state().addAlert(makeAlertInput({ title: 'A' }));
      state().addAlert(makeAlertInput({ title: 'B' }));
      const ids = state().alerts.map((a) => a.id);

      state().dismissAll();

      expect(mockNotificationService.dismiss).toHaveBeenCalledWith(ids);
    });

    test('does not call backend when no alerts exist', () => {
      state().dismissAll();
      expect(mockNotificationService.dismiss).not.toHaveBeenCalled();
    });
  });

  // ── clearAlerts ───────────────────────────────────────────────────

  describe('clearAlerts', () => {
    test('clears alerts and error', () => {
      state().addAlert(makeAlertInput());
      useAlertStore.setState({ error: 'old error' });

      state().clearAlerts();

      expect(state().alerts).toHaveLength(0);
      expect(state().error).toBeNull();
    });
  });

  // ── Unread count (selector logic) ─────────────────────────────────

  describe('unread count', () => {
    test('counts only unread alerts', () => {
      state().addAlert(makeAlertInput({ title: 'A' }));
      state().addAlert(makeAlertInput({ title: 'B' }));
      state().addAlert(makeAlertInput({ title: 'C' }));

      // Mark one as read
      const idA = state().alerts.find((a) => a.title === 'A')!.id;
      state().markAsRead(idA);

      const unread = state().alerts.filter((a) => a.status === 'unread').length;
      expect(unread).toBe(2);
    });

    test('unread count is zero after markAllAsRead', () => {
      state().addAlert(makeAlertInput());
      state().addAlert(makeAlertInput());

      state().markAllAsRead();

      const unread = state().alerts.filter((a) => a.status === 'unread').length;
      expect(unread).toBe(0);
    });
  });
});
