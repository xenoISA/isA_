import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useAlertStore } from '../useAlertStore';

const {
  mockGetNotifications,
  mockGetUnreadCount,
  mockMarkAsRead,
  mockMarkAllAsRead,
  mockDismiss,
} = vi.hoisted(() => ({
  mockGetNotifications: vi.fn(),
  mockGetUnreadCount: vi.fn(),
  mockMarkAsRead: vi.fn(),
  mockMarkAllAsRead: vi.fn(),
  mockDismiss: vi.fn(),
}));

vi.mock('../../api/adapters/NotificationAdapter', () => ({
  getNotifications: mockGetNotifications,
  getUnreadCount: mockGetUnreadCount,
  markAsRead: mockMarkAsRead,
  markAllAsRead: mockMarkAllAsRead,
  dismiss: mockDismiss,
}));

describe('useAlertStore', () => {
  beforeEach(() => {
    useAlertStore.setState({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('loads notifications and derives unread count', async () => {
    mockGetNotifications.mockResolvedValue([
      {
        id: 'notif-1',
        type: 'calendar',
        priority: 'normal',
        title: 'Meeting soon',
        body: 'Standup starts in 15 minutes',
        read: false,
        dismissed: false,
        createdAt: '2026-04-29T00:00:00Z',
      },
      {
        id: 'notif-2',
        type: 'task',
        priority: 'normal',
        title: 'Task completed',
        body: 'Review docs',
        read: true,
        dismissed: false,
        createdAt: '2026-04-29T00:05:00Z',
      },
    ]);

    await useAlertStore.getState().loadNotifications();

    expect(useAlertStore.getState().notifications).toHaveLength(2);
    expect(useAlertStore.getState().unreadCount).toBe(1);
  });

  test('marks a notification as read in backend and local state', async () => {
    useAlertStore.setState({
      notifications: [
        {
          id: 'notif-1',
          type: 'calendar',
          priority: 'normal',
          title: 'Meeting soon',
          body: 'Standup starts in 15 minutes',
          read: false,
          dismissed: false,
          createdAt: '2026-04-29T00:00:00Z',
        },
      ],
      unreadCount: 1,
    } as any);
    mockMarkAsRead.mockResolvedValue(undefined);

    await useAlertStore.getState().markAsRead('notif-1');

    expect(mockMarkAsRead).toHaveBeenCalledWith('notif-1');
    expect(useAlertStore.getState().notifications[0]?.read).toBe(true);
    expect(useAlertStore.getState().unreadCount).toBe(0);
  });

  test('marks all notifications as read', async () => {
    useAlertStore.setState({
      notifications: [
        {
          id: 'notif-1',
          type: 'calendar',
          priority: 'normal',
          title: 'Meeting soon',
          body: 'Standup starts in 15 minutes',
          read: false,
          dismissed: false,
          createdAt: '2026-04-29T00:00:00Z',
        },
      ],
      unreadCount: 1,
    } as any);
    mockMarkAllAsRead.mockResolvedValue(undefined);

    await useAlertStore.getState().markAllAsRead();

    expect(mockMarkAllAsRead).toHaveBeenCalled();
    expect(useAlertStore.getState().notifications[0]?.read).toBe(true);
    expect(useAlertStore.getState().unreadCount).toBe(0);
  });

  test('dismisses a single notification', async () => {
    useAlertStore.setState({
      notifications: [
        {
          id: 'notif-1',
          type: 'calendar',
          priority: 'normal',
          title: 'Meeting soon',
          body: 'Standup starts in 15 minutes',
          read: false,
          dismissed: false,
          createdAt: '2026-04-29T00:00:00Z',
        },
      ],
      unreadCount: 1,
    } as any);
    mockDismiss.mockResolvedValue(undefined);

    await useAlertStore.getState().dismissNotification('notif-1');

    expect(mockDismiss).toHaveBeenCalledWith('notif-1');
    expect(useAlertStore.getState().notifications).toHaveLength(0);
  });

  test('refreshes unread count from backend', async () => {
    mockGetUnreadCount.mockResolvedValue(4);

    await useAlertStore.getState().refreshUnreadCount();

    expect(useAlertStore.getState().unreadCount).toBe(4);
  });
});
