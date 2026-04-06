/**
 * ============================================================================
 * Calendar Reminder Service - Fires in-app alerts before calendar events
 * ============================================================================
 *
 * Monitors upcoming CalendarEvents and schedules timers based on each event's
 * `reminders` field (minutes before start_time). When a timer fires it pushes
 * an alert through useAlertStore.
 *
 * Usage:
 *   const svc = new CalendarReminderService();
 *   svc.startMonitoring(events);
 *   svc.updateEvents(events);   // call when the event list changes
 *   svc.stopMonitoring();       // cleanup
 */

import { useAlertStore } from '../stores/useAlertStore';
import { createLogger } from '../utils/logger';
import type { CalendarEvent } from '../api/calendarService';

const log = createLogger('CalendarReminderService');

/** Composite key for deduplication: eventId + reminder minutes */
type ReminderKey = string;

function buildKey(eventId: string, minutesBefore: number): ReminderKey {
  return `${eventId}::${minutesBefore}`;
}

function formatMinutes(minutes: number): string {
  if (minutes < 1) return 'now';
  if (minutes === 1) return '1 minute';
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
  return `${hours}h ${remaining}m`;
}

export class CalendarReminderService {
  /** Active timer handles keyed by ReminderKey */
  private timers = new Map<ReminderKey, ReturnType<typeof setTimeout>>();

  /** Keys that have already fired — prevents re-firing after updateEvents */
  private fired = new Set<ReminderKey>();

  private monitoring = false;

  // ── Public API ──────────────────────────────────────────────────────

  /**
   * Set up timers for all upcoming reminders in the given event list.
   */
  startMonitoring(events: CalendarEvent[]): void {
    this.monitoring = true;
    this.scheduleAll(events);
    log.info('Reminder monitoring started', { events: events.length });
  }

  /**
   * Clear every pending timer and reset state.
   */
  stopMonitoring(): void {
    this.clearAllTimers();
    this.fired.clear();
    this.monitoring = false;
    log.info('Reminder monitoring stopped');
  }

  /**
   * Recalculate timers when the event list changes.
   * Preserves the fired-set so already-shown reminders are not repeated.
   */
  updateEvents(events: CalendarEvent[]): void {
    if (!this.monitoring) return;
    this.clearAllTimers();
    this.scheduleAll(events);
    log.debug('Reminders recalculated', { events: events.length, timers: this.timers.size });
  }

  /** Whether the service is currently monitoring. */
  get isMonitoring(): boolean {
    return this.monitoring;
  }

  // ── Internals ───────────────────────────────────────────────────────

  private scheduleAll(events: CalendarEvent[]): void {
    const now = Date.now();

    for (const event of events) {
      if (!event.reminders || event.reminders.length === 0) continue;

      const startMs = new Date(event.start_time).getTime();
      if (isNaN(startMs)) continue;

      // Skip events that have already started
      if (startMs <= now) continue;

      for (const minutesBefore of event.reminders) {
        const fireAt = startMs - minutesBefore * 60_000;
        const delay = fireAt - now;

        // Skip reminders whose fire-time is in the past
        if (delay <= 0) continue;

        const key = buildKey(event.event_id, minutesBefore);

        // Skip if already fired or already scheduled
        if (this.fired.has(key) || this.timers.has(key)) continue;

        const timer = setTimeout(() => {
          this.fireReminder(event, minutesBefore, key);
        }, delay);

        this.timers.set(key, timer);
      }
    }
  }

  private fireReminder(event: CalendarEvent, minutesBefore: number, key: ReminderKey): void {
    // Mark as fired and remove timer entry
    this.fired.add(key);
    this.timers.delete(key);

    const addAlert = useAlertStore.getState().addAlert;
    addAlert({
      source: 'calendar_reminder',
      severity: 'info',
      title: `Upcoming: ${event.title}`,
      message: `Starts in ${formatMinutes(minutesBefore)}`,
      sourceId: event.event_id,
    });

    log.info('Reminder fired', {
      eventId: event.event_id,
      title: event.title,
      minutesBefore,
    });
  }

  private clearAllTimers(): void {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
  }
}
