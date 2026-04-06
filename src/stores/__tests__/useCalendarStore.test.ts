import { describe, test, expect, beforeEach, vi } from 'vitest';
import { useCalendarStore } from '../useCalendarStore';
import type { CalendarEvent } from '../../api/calendarService';

// ── Mock calendarService ──────────────────────────────────────────────

const mockService = {
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  listEvents: vi.fn(),
  getTodayEvents: vi.fn(),
  getWeekEvents: vi.fn(),
  getUpcomingEvents: vi.fn(),
  syncCalendar: vi.fn(),
  getSyncStatus: vi.fn(),
};

vi.mock('../../api/calendarService', () => ({
  getCalendarService: () => mockService,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  event_id: `evt_${Math.random().toString(36).slice(2, 7)}`,
  user_id: 'user_1',
  title: 'Test Event',
  start_time: new Date().toISOString(),
  end_time: new Date(Date.now() + 3600_000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
} as CalendarEvent);

const state = () => useCalendarStore.getState();

// ── Tests ─────────────────────────────────────────────────────────────

describe('useCalendarStore', () => {
  beforeEach(() => {
    // Reset store
    useCalendarStore.setState({
      events: [],
      currentEvent: null,
      isLoading: false,
      error: null,
      syncStatus: null,
      lastFetched: null,
    });
    vi.clearAllMocks();
  });

  // ── createEvent ───────────────────────────────────────────────────

  describe('createEvent', () => {
    test('adds the new event to the front of the list', async () => {
      const created = makeEvent({ event_id: 'evt_new', title: 'New' });
      mockService.createEvent.mockResolvedValue(created);

      const result = await state().createEvent({ title: 'New' } as any);

      expect(result).toEqual(created);
      expect(state().events[0]).toEqual(created);
      expect(state().isLoading).toBe(false);
      expect(state().error).toBeNull();
    });

    test('sets error and returns null on failure', async () => {
      mockService.createEvent.mockRejectedValue(new Error('Network error'));

      const result = await state().createEvent({ title: 'Fail' } as any);

      expect(result).toBeNull();
      expect(state().error).toBe('Network error');
      expect(state().isLoading).toBe(false);
    });
  });

  // ── updateEvent ───────────────────────────────────────────────────

  describe('updateEvent', () => {
    test('optimistically updates then replaces with server response', async () => {
      const original = makeEvent({ event_id: 'evt_1', title: 'Original' });
      useCalendarStore.setState({ events: [original] });

      const updated = { ...original, title: 'Updated by server' };
      mockService.updateEvent.mockResolvedValue(updated);

      const result = await state().updateEvent('evt_1', 'user_1', { title: 'Updated' } as any);

      expect(result).toEqual(updated);
      expect(state().events[0].title).toBe('Updated by server');
      expect(state().isLoading).toBe(false);
    });

    test('rolls back on failure', async () => {
      const original = makeEvent({ event_id: 'evt_1', title: 'Original' });
      useCalendarStore.setState({ events: [original] });

      mockService.updateEvent.mockRejectedValue(new Error('Server error'));

      const result = await state().updateEvent('evt_1', 'user_1', { title: 'Bad' } as any);

      expect(result).toBeNull();
      expect(state().events[0].title).toBe('Original');
      expect(state().error).toBe('Server error');
    });

    test('updates currentEvent when the same event is selected', async () => {
      const original = makeEvent({ event_id: 'evt_1', title: 'Current' });
      useCalendarStore.setState({ events: [original], currentEvent: original });

      const updated = { ...original, title: 'Refreshed' };
      mockService.updateEvent.mockResolvedValue(updated);

      await state().updateEvent('evt_1', 'user_1', { title: 'Refreshed' } as any);

      expect(state().currentEvent?.title).toBe('Refreshed');
    });
  });

  // ── deleteEvent ───────────────────────────────────────────────────

  describe('deleteEvent', () => {
    test('removes the event optimistically', async () => {
      const evt = makeEvent({ event_id: 'evt_del' });
      useCalendarStore.setState({ events: [evt] });

      mockService.deleteEvent.mockResolvedValue(undefined);

      const ok = await state().deleteEvent('evt_del', 'user_1');

      expect(ok).toBe(true);
      expect(state().events).toHaveLength(0);
    });

    test('rolls back on failure', async () => {
      const evt = makeEvent({ event_id: 'evt_del' });
      useCalendarStore.setState({ events: [evt] });

      mockService.deleteEvent.mockRejectedValue(new Error('Delete failed'));

      const ok = await state().deleteEvent('evt_del', 'user_1');

      expect(ok).toBe(false);
      expect(state().events).toHaveLength(1);
      expect(state().error).toBe('Delete failed');
    });

    test('clears currentEvent when deleting the selected event', async () => {
      const evt = makeEvent({ event_id: 'evt_sel' });
      useCalendarStore.setState({ events: [evt], currentEvent: evt });

      mockService.deleteEvent.mockResolvedValue(undefined);
      await state().deleteEvent('evt_sel', 'user_1');

      expect(state().currentEvent).toBeNull();
    });
  });

  // ── setCurrentEvent ───────────────────────────────────────────────

  describe('setCurrentEvent', () => {
    test('sets and clears currentEvent', () => {
      const evt = makeEvent();
      state().setCurrentEvent(evt);
      expect(state().currentEvent).toEqual(evt);

      state().setCurrentEvent(null);
      expect(state().currentEvent).toBeNull();
    });
  });

  // ── fetchEvents ───────────────────────────────────────────────────

  describe('fetchEvents', () => {
    test('replaces events with fetched results', async () => {
      const events = [makeEvent(), makeEvent()];
      mockService.listEvents.mockResolvedValue({ events });

      await state().fetchEvents({ user_id: 'user_1' } as any);

      expect(state().events).toEqual(events);
      expect(state().isLoading).toBe(false);
      expect(state().lastFetched).toBeTruthy();
    });

    test('sets error on fetch failure', async () => {
      mockService.listEvents.mockRejectedValue(new Error('Timeout'));

      await state().fetchEvents({ user_id: 'user_1' } as any);

      expect(state().error).toBe('Timeout');
      expect(state().isLoading).toBe(false);
    });
  });

  // ── fetchTodayEvents ──────────────────────────────────────────────

  describe('fetchTodayEvents', () => {
    test('stores events from getTodayEvents', async () => {
      const events = [makeEvent()];
      mockService.getTodayEvents.mockResolvedValue(events);

      await state().fetchTodayEvents('user_1');

      expect(state().events).toEqual(events);
      expect(mockService.getTodayEvents).toHaveBeenCalledWith('user_1');
    });
  });

  // ── fetchWeekEvents ───────────────────────────────────────────────

  describe('fetchWeekEvents', () => {
    test('stores events from getWeekEvents', async () => {
      const events = [makeEvent(), makeEvent()];
      mockService.getWeekEvents.mockResolvedValue(events);

      await state().fetchWeekEvents('user_1');

      expect(state().events).toEqual(events);
      expect(mockService.getWeekEvents).toHaveBeenCalledWith('user_1');
    });
  });

  // ── fetchUpcomingEvents ───────────────────────────────────────────

  describe('fetchUpcomingEvents', () => {
    test('passes default days=7', async () => {
      mockService.getUpcomingEvents.mockResolvedValue([]);

      await state().fetchUpcomingEvents('user_1');

      expect(mockService.getUpcomingEvents).toHaveBeenCalledWith('user_1', 7);
    });

    test('passes custom days', async () => {
      mockService.getUpcomingEvents.mockResolvedValue([]);

      await state().fetchUpcomingEvents('user_1', 14);

      expect(mockService.getUpcomingEvents).toHaveBeenCalledWith('user_1', 14);
    });
  });

  // ── syncCalendar ──────────────────────────────────────────────────

  describe('syncCalendar', () => {
    test('syncs and refreshes events', async () => {
      const events = [makeEvent()];
      mockService.syncCalendar.mockResolvedValue(undefined);
      mockService.getUpcomingEvents.mockResolvedValue(events);

      await state().syncCalendar('user_1', 'google');

      expect(mockService.syncCalendar).toHaveBeenCalledWith('user_1', 'google');
      expect(mockService.getUpcomingEvents).toHaveBeenCalledWith('user_1');
      expect(state().events).toEqual(events);
      expect(state().isLoading).toBe(false);
    });

    test('sets error on sync failure', async () => {
      mockService.syncCalendar.mockRejectedValue(new Error('Auth expired'));

      await state().syncCalendar('user_1', 'google');

      expect(state().error).toBe('Auth expired');
    });
  });

  // ── getSyncStatus ─────────────────────────────────────────────────

  describe('getSyncStatus', () => {
    test('stores sync status', async () => {
      const status = { provider: 'google', last_sync: '2026-01-01T00:00:00Z' };
      mockService.getSyncStatus.mockResolvedValue(status);

      await state().getSyncStatus('user_1');

      expect(state().syncStatus).toEqual(status);
    });
  });

  // ── Utility ───────────────────────────────────────────────────────

  describe('clearError', () => {
    test('clears the error', () => {
      useCalendarStore.setState({ error: 'Some error' });
      state().clearError();
      expect(state().error).toBeNull();
    });
  });

  describe('clearEvents', () => {
    test('resets events, currentEvent, and lastFetched', () => {
      useCalendarStore.setState({
        events: [makeEvent()],
        currentEvent: makeEvent(),
        lastFetched: '2026-01-01',
      });

      state().clearEvents();

      expect(state().events).toHaveLength(0);
      expect(state().currentEvent).toBeNull();
      expect(state().lastFetched).toBeNull();
    });
  });
});
