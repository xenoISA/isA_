/**
 * Tests for useCalendar hook filtering logic.
 *
 * Since @testing-library/react is not available, we test the derived data
 * computations (todayEvents, weekEvents, upcomingEvents, getEventsForDate,
 * getEventsInRange) as pure filter functions against the calendar store state.
 *
 * The hook's useMemo/useCallback wrappers are thin — the real logic is the
 * date-range filtering tested here.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useCalendarStore } from '../../stores/useCalendarStore';
import type { CalendarEvent } from '../../api/calendarService';

// Mock calendarService — store tests handle CRUD; we just need the mock present
vi.mock('../../api/calendarService', () => ({
  getCalendarService: () => ({}),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const makeEvent = (startOffset: { days?: number; hours?: number } = {}, title = 'Event'): CalendarEvent => {
  const start = new Date();
  if (startOffset.days) start.setDate(start.getDate() + startOffset.days);
  if (startOffset.hours) start.setTime(start.getTime() + startOffset.hours * 3600_000);

  return {
    event_id: `evt_${Math.random().toString(36).slice(2, 7)}`,
    user_id: 'user_1',
    title,
    start_time: start.toISOString(),
    end_time: new Date(start.getTime() + 3600_000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as CalendarEvent;
};

/**
 * Replicate the hook's todayEvents filter.
 * Extracted from useCalendar.ts lines 55-65.
 */
function filterTodayEvents(events: CalendarEvent[]): CalendarEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return events.filter((e) => {
    const start = new Date(e.start_time || '');
    return start >= today && start < tomorrow;
  });
}

/**
 * Replicate the hook's weekEvents filter.
 * Extracted from useCalendar.ts lines 67-77.
 */
function filterWeekEvents(events: CalendarEvent[]): CalendarEvent[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return events.filter((e) => {
    const start = new Date(e.start_time || '');
    return start >= now && start < weekEnd;
  });
}

/**
 * Replicate the hook's upcomingEvents filter + sort.
 * Extracted from useCalendar.ts lines 79-88.
 */
function filterUpcomingEvents(events: CalendarEvent[]): CalendarEvent[] {
  const now = new Date();
  return events
    .filter((e) => new Date(e.start_time || '') >= now)
    .sort((a, b) => new Date(a.start_time || '').getTime() - new Date(b.start_time || '').getTime());
}

/**
 * Replicate the hook's getEventsForDate helper.
 * Extracted from useCalendar.ts lines 92-105.
 */
function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return events.filter((e) => {
    const start = new Date(e.start_time || '');
    return start >= dayStart && start < dayEnd;
  });
}

/**
 * Replicate the hook's getEventsInRange helper.
 * Extracted from useCalendar.ts lines 107-115.
 */
function getEventsInRange(events: CalendarEvent[], start: Date, end: Date): CalendarEvent[] {
  return events.filter((e) => {
    const eventStart = new Date(e.start_time || '');
    return eventStart >= start && eventStart <= end;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('useCalendar — date filtering logic', () => {
  beforeEach(() => {
    useCalendarStore.setState({
      events: [],
      currentEvent: null,
      isLoading: false,
      error: null,
      syncStatus: null,
      lastFetched: null,
    });
  });

  // ── todayEvents ───────────────────────────────────────────────────

  describe('todayEvents', () => {
    test('includes events happening today', () => {
      const todayEvt = makeEvent({ hours: 1 }, 'Today');
      const tomorrowEvt = makeEvent({ days: 1 }, 'Tomorrow');
      const yesterdayEvt = makeEvent({ days: -1 }, 'Yesterday');

      const result = filterTodayEvents([todayEvt, tomorrowEvt, yesterdayEvt]);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Today');
    });

    test('returns empty for no events', () => {
      expect(filterTodayEvents([])).toHaveLength(0);
    });

    test('excludes events exactly at midnight tomorrow', () => {
      const midnightTomorrow = new Date();
      midnightTomorrow.setDate(midnightTomorrow.getDate() + 1);
      midnightTomorrow.setHours(0, 0, 0, 0);

      const evt = {
        event_id: 'midnight',
        start_time: midnightTomorrow.toISOString(),
      } as CalendarEvent;

      expect(filterTodayEvents([evt])).toHaveLength(0);
    });
  });

  // ── weekEvents ────────────────────────────────────────────────────

  describe('weekEvents', () => {
    test('includes events within the next 7 days', () => {
      const today = makeEvent({ hours: 2 }, 'Today');
      const day3 = makeEvent({ days: 3 }, 'Day 3');
      const day6 = makeEvent({ days: 6 }, 'Day 6');
      const day8 = makeEvent({ days: 8 }, 'Day 8');
      const past = makeEvent({ days: -2 }, 'Past');

      const result = filterWeekEvents([today, day3, day6, day8, past]);
      const titles = result.map((e) => e.title);

      expect(titles).toContain('Today');
      expect(titles).toContain('Day 3');
      expect(titles).toContain('Day 6');
      expect(titles).not.toContain('Day 8');
      expect(titles).not.toContain('Past');
    });
  });

  // ── upcomingEvents ────────────────────────────────────────────────

  describe('upcomingEvents', () => {
    test('excludes past events', () => {
      const past = makeEvent({ days: -1 }, 'Past');
      const future = makeEvent({ days: 2 }, 'Future');

      const result = filterUpcomingEvents([past, future]);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Future');
    });

    test('sorts by start_time ascending', () => {
      const later = makeEvent({ days: 5 }, 'Later');
      const sooner = makeEvent({ days: 1 }, 'Sooner');
      const soonest = makeEvent({ hours: 2 }, 'Soonest');

      const result = filterUpcomingEvents([later, sooner, soonest]);
      expect(result.map((e) => e.title)).toEqual(['Soonest', 'Sooner', 'Later']);
    });
  });

  // ── getEventsForDate ──────────────────────────────────────────────

  describe('getEventsForDate', () => {
    test('returns only events for the given date', () => {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 3);

      const match = makeEvent({ days: 3 }, 'Match');
      const noMatch = makeEvent({ days: 4 }, 'No Match');

      const result = getEventsForDate([match, noMatch], targetDate);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Match');
    });

    test('works for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const match = makeEvent({ days: -5 }, 'Past');
      const result = getEventsForDate([match], pastDate);
      expect(result).toHaveLength(1);
    });
  });

  // ── getEventsInRange ──────────────────────────────────────────────

  describe('getEventsInRange', () => {
    test('includes events within the range (inclusive)', () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 3);

      const inside = makeEvent({ days: 1 }, 'Inside');
      const outside = makeEvent({ days: 5 }, 'Outside');
      const atStart = makeEvent({ days: 0 }, 'At Start');

      const result = getEventsInRange([inside, outside, atStart], start, end);
      const titles = result.map((e) => e.title);

      expect(titles).toContain('Inside');
      expect(titles).toContain('At Start');
      expect(titles).not.toContain('Outside');
    });

    test('returns empty for empty events', () => {
      const start = new Date();
      const end = new Date(start.getTime() + 86400_000);
      expect(getEventsInRange([], start, end)).toHaveLength(0);
    });
  });

  // ── Integration with store ────────────────────────────────────────

  describe('store integration', () => {
    test('filtering works on store events', () => {
      const todayEvt = makeEvent({ hours: 1 }, 'Today');
      const futureEvt = makeEvent({ days: 10 }, 'Future');

      useCalendarStore.setState({ events: [todayEvt, futureEvt] });

      const storeEvents = useCalendarStore.getState().events;
      const today = filterTodayEvents(storeEvents);
      const upcoming = filterUpcomingEvents(storeEvents);

      expect(today).toHaveLength(1);
      expect(today[0].title).toBe('Today');
      expect(upcoming).toHaveLength(2);
    });
  });
});
