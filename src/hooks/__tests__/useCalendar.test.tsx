import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  calendarActionsSelector,
  calendarDateHelpersEqual,
  calendarDateHelpersSelector,
  calendarStateSelector,
} from '../useCalendar';
import { useCalendarStore, type CalendarEvent } from '../../stores/useCalendarStore';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    title: 'Standup',
    startTime: '2026-04-23T09:00:00.000Z',
    endTime: '2026-04-23T09:30:00.000Z',
    allDay: false,
    ...overrides,
  };
}

describe('useCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T08:00:00.000Z'));
    useCalendarStore.setState({
      events: [],
      todayEvents: [],
      providers: [],
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('selects calendar state and CRUD actions for component consumption', () => {
    const event = makeEvent();
    useCalendarStore.setState({
      events: [event],
      isLoading: true,
      error: 'sync failed',
    });

    const store = useCalendarStore.getState();
    const calendar = {
      ...calendarStateSelector(store),
      ...calendarActionsSelector(store),
    };

    expect(calendar.events).toEqual([event]);
    expect(calendar.loading).toBe(true);
    expect(calendar.isLoading).toBe(true);
    expect(calendar.error).toBe('sync failed');
    expect(calendar.createEvent).toBe(store.createEvent);
    expect(calendar.updateEvent).toBe(store.updateEvent);
    expect(calendar.deleteEvent).toBe(store.deleteEvent);
  });

  test('selects date helper event groups from the calendar store', () => {
    const today = makeEvent({ id: 'today' });
    const fetchedToday = makeEvent({ id: 'fetched-today', title: 'Fetched today' });
    const tomorrow = makeEvent({
      id: 'tomorrow',
      startTime: '2026-04-24T09:00:00.000Z',
      endTime: '2026-04-24T09:30:00.000Z',
    });
    const later = makeEvent({
      id: 'later',
      startTime: '2026-05-03T09:00:00.000Z',
      endTime: '2026-05-03T09:30:00.000Z',
    });

    useCalendarStore.setState({
      events: [later, today, tomorrow],
      todayEvents: [fetchedToday],
    });

    const calendar = calendarDateHelpersSelector(useCalendarStore.getState());

    expect(calendar.todayEvents.map((event) => event.id)).toEqual(['fetched-today', 'today']);
    expect(calendar.weekEvents.map((event) => event.id)).toEqual(['today', 'tomorrow']);
    expect(calendar.upcomingEvents.map((event) => event.id)).toEqual(['today', 'tomorrow', 'later']);
  });

  test('keeps equivalent helper selections equal to avoid unnecessary hook updates', () => {
    const today = makeEvent({ id: 'today' });
    const state = {
      ...useCalendarStore.getState(),
      events: [today],
      todayEvents: [],
    };

    const first = calendarDateHelpersSelector(state);
    const second = calendarDateHelpersSelector(state);

    expect(first).not.toBe(second);
    expect(calendarDateHelpersEqual(first, second)).toBe(true);
    expect(calendarDateHelpersEqual(first, { ...second, upcomingEvents: [] })).toBe(false);
  });
});
