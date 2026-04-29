import { create } from 'zustand';
import * as NotificationAdapter from '../api/adapters/NotificationAdapter';

type AlertNotification = NotificationAdapter.Notification;

interface AlertStoreState {
  notifications: AlertNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  loadNotifications: () => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  recordNotification: (notification: AlertNotification) => void;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function unreadCountFor(notifications: AlertNotification[]): number {
  return notifications.filter((notification) => !notification.read).length;
}

export const useAlertStore = create<AlertStoreState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  loadNotifications: async () => {
    set({ loading: true, error: null });

    try {
      const notifications = await NotificationAdapter.getNotifications({ limit: 50 });
      set({
        notifications,
        unreadCount: unreadCountFor(notifications),
        loading: false,
      });
    } catch (error) {
      set({
        error: toErrorMessage(error),
        loading: false,
      });
    }
  },

  refreshUnreadCount: async () => {
    try {
      const unreadCount = await NotificationAdapter.getUnreadCount();
      set({ unreadCount });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  markAsRead: async (id) => {
    try {
      await NotificationAdapter.markAsRead(id);
      set((state) => {
        const notifications = state.notifications.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                read: true,
                readAt: notification.readAt || new Date().toISOString(),
              }
            : notification,
        );

        return {
          notifications,
          unreadCount: unreadCountFor(notifications),
          error: null,
        };
      });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  markAllAsRead: async () => {
    try {
      await NotificationAdapter.markAllAsRead();
      set((state) => {
        const notifications = state.notifications.map((notification) =>
          notification.read
            ? notification
            : {
                ...notification,
                read: true,
                readAt: notification.readAt || new Date().toISOString(),
              },
        );

        return {
          notifications,
          unreadCount: 0,
          error: null,
        };
      });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  dismissNotification: async (id) => {
    try {
      await NotificationAdapter.dismiss(id);
      set((state) => {
        const notifications = state.notifications.filter(
          (notification) => notification.id !== id,
        );

        return {
          notifications,
          unreadCount: unreadCountFor(notifications),
          error: null,
        };
      });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  clearAllNotifications: async () => {
    const ids = get().notifications.map((notification) => notification.id);

    try {
      await Promise.all(ids.map((id) => NotificationAdapter.dismiss(id)));
      set({
        notifications: [],
        unreadCount: 0,
        error: null,
      });
    } catch (error) {
      set({ error: toErrorMessage(error) });
    }
  },

  recordNotification: (notification) => {
    set((state) => {
      const notifications = [
        notification,
        ...state.notifications.filter(
          (existingNotification) => existingNotification.id !== notification.id,
        ),
      ];

      return {
        notifications,
        unreadCount: unreadCountFor(notifications),
        error: null,
      };
    });
  },
}));
