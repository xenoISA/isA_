import { describe, expect, test, vi } from 'vitest';

import {
  buildDefaultEventDraft,
  getCalendarToolbarEventType,
  getEventAttendees,
  isAssistantGeneratedEvent,
  selectToolbarUpcomingEvents,
} from '../CalendarToolbar';
import type { CalendarEvent } from '../../../stores/useCalendarStore';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    title: 'Standup',
    startTime: '2026-04-29T10:00:00.000Z',
    endTime: '2026-04-29T10:30:00.000Z',
    allDay: false,
    provider: 'local',
    reminders: [],
    metadata: undefined,
    ...overrides,
  };
}

describe('CalendarToolbar helpers', () => {
  test('builds a default quick-event draft on the next half-hour slot', () => {
    const draft = buildDefaultEventDraft(new Date('2026-04-29T10:17:00'));

    expect(draft.title).toBe('');
    expect(draft.startInput).toBe('2026-04-29T10:30');
    expect(draft.endInput).toBe('2026-04-29T11:30');
  });

  test('selects, sorts, and limits upcoming events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-29T09:00:00.000Z'));

    const events = [
      makeEvent({ id: 'later', startTime: '2026-04-29T13:00:00.000Z', endTime: '2026-04-29T13:30:00.000Z' }),
      makeEvent({ id: 'past', startTime: '2026-04-29T07:00:00.000Z', endTime: '2026-04-29T07:30:00.000Z' }),
      makeEvent({ id: 'soon', startTime: '2026-04-29T09:30:00.000Z', endTime: '2026-04-29T10:00:00.000Z' }),
      makeEvent({ id: 'latest', startTime: '2026-04-29T15:00:00.000Z', endTime: '2026-04-29T15:30:00.000Z' }),
      makeEvent({ id: 'mid', startTime: '2026-04-29T11:00:00.000Z', endTime: '2026-04-29T11:30:00.000Z' }),
      makeEvent({ id: 'cap', startTime: '2026-04-29T16:00:00.000Z', endTime: '2026-04-29T16:30:00.000Z' }),
    ];

    expect(selectToolbarUpcomingEvents(events, Date.now(), 4).map((event) => event.id)).toEqual([
      'soon',
      'mid',
      'later',
      'latest',
    ]);

    vi.useRealTimers();
  });

  test('derives calendar event types from metadata and title hints', () => {
    expect(getCalendarToolbarEventType(makeEvent({ metadata: { type: 'task' } }))).toBe('task');
    expect(getCalendarToolbarEventType(makeEvent({ metadata: { category: 'personal' } }))).toBe('personal');
    expect(getCalendarToolbarEventType(makeEvent({ title: 'Reminder: send invoice' }))).toBe('reminder');
    expect(getCalendarToolbarEventType(makeEvent())).toBe('meeting');
  });

  test('detects assistant-generated events and normalizes attendees', () => {
    const event = makeEvent({
      metadata: {
        source: 'mate',
        attendees: [
          'Alice',
          { name: 'Bob' },
          { email: 'carol@example.com' },
          { ignored: true },
        ],
      },
    });

    expect(isAssistantGeneratedEvent(event)).toBe(true);
    expect(getEventAttendees(event)).toEqual(['Alice', 'Bob', 'carol@example.com']);
  });
});
