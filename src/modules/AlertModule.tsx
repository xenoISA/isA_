import React, { useEffect, useRef } from 'react';
import { useCalendarStore } from '../stores/useCalendarStore';
import { useTaskStore } from '../stores/useTaskStore';

const isElectron = typeof window !== 'undefined' && !!(window as any).isElectron;
const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null;

function sendAlert(title: string, body: string, route?: string): void {
  if (isElectron && electronAPI) {
    electronAPI.send('notification:show', title, body, route);
  } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

export const AlertModule: React.FC = () => {
  const todayEvents = useCalendarStore((s) => s.todayEvents);
  const fetchTodayEvents = useCalendarStore((s) => s.fetchTodayEvents);
  const firedReminders = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchTodayEvents();
    const interval = setInterval(fetchTodayEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTodayEvents]);

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
            sendAlert(`${event.title} in ${Math.round(minutesUntil)} min`, event.description || 'Event starting soon', '/app?view=calendar');
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
          sendAlert('Task completed', task.title || task.id, '/app');
        }
      }
    });
    return unsub;
  }, []);

  return null;
};
