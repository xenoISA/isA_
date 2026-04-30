import React, { useEffect, useRef } from 'react';
import { useCalendarStore } from '../stores/useCalendarStore';
import { useTaskStore } from '../stores/useTaskStore';
import * as NotificationAdapter from '../api/adapters/NotificationAdapter';
import { useAlertStore } from '../stores/useAlertStore';
import { useUserStore } from '../stores/useUserStore';

const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;
const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;

function sendAlert(title: string, body: string, route?: string): void {
  if (isElectron && electronAPI) {
    electronAPI.send('notification:show', title, body, route);
  } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

async function persistAlert(
  type: NotificationAdapter.Notification['type'],
  title: string,
  body: string,
  route?: string,
): Promise<void> {
  try {
    const notification = await NotificationAdapter.send({
      type,
      title,
      body,
      route,
    });
    useAlertStore.getState().recordNotification(notification);
  } catch {
    // Keep local/browser alerts working even if backend persistence fails.
  }
}

export function resolveAlertUserId(externalUser: unknown): string | null {
  if (!externalUser || typeof externalUser !== 'object') {
    return null;
  }

  const candidate = externalUser as Record<string, unknown>;
  return (
    (typeof candidate.auth0_id === 'string' && candidate.auth0_id)
    || (typeof candidate.sub === 'string' && candidate.sub)
    || (typeof candidate.user_id === 'string' && candidate.user_id)
    || (typeof candidate.id === 'string' && candidate.id)
    || null
  );
}

export const AlertModule: React.FC = () => {
  const todayEvents = useCalendarStore((s) => s.todayEvents);
  const fetchTodayEvents = useCalendarStore((s) => s.fetchTodayEvents);
  const alertUserId = useUserStore((state) => resolveAlertUserId(state.externalUser));
  const firedReminders = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!alertUserId) {
      return;
    }

    void fetchTodayEvents();
    const interval = setInterval(() => {
      void fetchTodayEvents();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [alertUserId, fetchTodayEvents]);

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      for (const event of todayEvents) {
        const start = new Date(event.startTime).getTime();
        const minutesUntil = (start - now) / 60000;
        const reminders = event.reminders ?? [15];
        for (const mins of reminders) {
          const key = `${event.id}-${mins}`;
          if (minutesUntil <= mins && minutesUntil > mins - 1 && !firedReminders.current.has(key)) {
            firedReminders.current.add(key);
            const title = `${event.title} in ${Math.round(minutesUntil)} min`;
            const body = event.description || 'Event starting soon';
            sendAlert(title, body, '/app?view=calendar');
            void persistAlert('calendar', title, body, '/app?view=calendar');
          }
        }
      }
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [todayEvents]);

  useEffect(() => {
    const unsub = useTaskStore.subscribe((state, prev) => {
      const prevIds = new Set((prev as any).tasks?.filter((t: any) => t.status === 'completed').map((t: any) => t.id) ?? []);
      for (const task of state.tasks ?? []) {
        if (task.status === 'completed' && !prevIds.has(task.id)) {
          const title = 'Task completed';
          const body = task.title || task.id;
          sendAlert(title, body, '/app');
          void persistAlert('task', title, body, '/app');
        }
      }
    });
    return unsub;
  }, []);

  return null;
};
