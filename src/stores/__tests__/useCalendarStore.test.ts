import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockGetTodayEvents,
  mockGetEventsByDateRange,
  mockCreateEvent,
  mockUpdateEvent,
  mockDeleteEvent,
  mockGetProviders,
} = vi.hoisted(() => ({
  mockGetTodayEvents: vi.fn(),
  mockGetEventsByDateRange: vi.fn(),
  mockCreateEvent: vi.fn(),
  mockUpdateEvent: vi.fn(),
  mockDeleteEvent: vi.fn(),
  mockGetProviders: vi.fn(),
}));

vi.mock('../../api/calendarService', () => ({
  CalendarService: vi.fn().mockImplementation(() => ({
    getTodayEvents: mockGetTodayEvents,
    getEventsByDateRange: mockGetEventsByDateRange,
    createEvent: mockCreateEvent,
    updateEvent: mockUpdateEvent,
    deleteEvent: mockDeleteEvent,
  })),
}));

vi.mock('../../api/adapters/CalendarAdapter', () => ({
  getProviders: mockGetProviders,
}));

import {
  selectTodayEvents,
  selectUpcomingEvents,
  selectWeekEvents,
  useCalendarStore,
} from '../useCalendarStore';
import { useUserStore } from '../useUserStore';

function makeSdkEvent(overrides: Record<string, any> = {}) {
  return {
    event_id: 'evt-1',
    user_id: 'user-1',
    title: 'Standup',
    description: 'Daily sync',
    start_time: new Date('2026-04-23T09:00:00Z'),
    end_time: new Date('2026-04-23T09:30:00Z'),
    all_day: false,
    timezone: 'UTC',
    category: 'work',
    recurrence_type: 'none',
    reminders: [15],
    sync_provider: 'local',
    is_shared: false,
    shared_with: [],
    created_at: new Date('2026-04-20T00:00:00Z'),
    ...overrides,
  };
}

function makeStoreEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'evt-1',
    title: 'Standup',
    description: 'Daily sync',
    startTime: '2026-04-23T09:00:00.000Z',
    endTime: '2026-04-23T09:30:00.000Z',
    allDay: false,
    provider: 'local',
    reminders: [15],
    metadata: undefined,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useCalendarStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCalendarStore.setState({
      events: [],
      todayEvents: [],
      providers: [],
      isLoading: false,
      error: null,
    });
    useUserStore.getState().clearUserState();
    useUserStore.getState().setExternalUser({ auth0_id: 'user-1' } as any);
  });

  test('fetches today events from the SDK-backed calendar service', async () => {
    mockGetTodayEvents.mockResolvedValue([makeSdkEvent()]);

    await useCalendarStore.getState().fetchTodayEvents();

    expect(mockGetTodayEvents).toHaveBeenCalledWith('user-1');
    expect(useCalendarStore.getState().todayEvents).toEqual([makeStoreEvent()]);
    expect(useCalendarStore.getState().isLoading).toBe(false);
    expect(useCalendarStore.getState().error).toBeNull();
  });

  test('blocks SDK fetches when no user is authenticated', async () => {
    useUserStore.getState().clearUserState();

    await useCalendarStore.getState().fetchEvents('2026-04-23T00:00:00Z', '2026-04-24T00:00:00Z');

    expect(mockGetEventsByDateRange).not.toHaveBeenCalled();
    expect(useCalendarStore.getState().error).toContain('Not authenticated');
  });

  test('fetches events for a custom date range', async () => {
    mockGetEventsByDateRange.mockResolvedValue([
      makeSdkEvent({ event_id: 'evt-custom', title: 'Custom range' }),
    ]);

    await useCalendarStore.getState().fetchEvents('2026-04-23T00:00:00Z', '2026-04-24T00:00:00Z');

    expect(mockGetEventsByDateRange).toHaveBeenCalledWith(
      'user-1',
      new Date('2026-04-23T00:00:00Z'),
      new Date('2026-04-24T00:00:00Z'),
    );
    expect(useCalendarStore.getState().events[0].id).toBe('evt-custom');
  });

  test('creates events optimistically and replaces the temporary event with SDK response', async () => {
    const pending = deferred<any>();
    mockCreateEvent.mockReturnValue(pending.promise);

    const createPromise = useCalendarStore.getState().createEvent({
      title: 'Planning',
      startTime: '2026-04-23T10:00:00Z',
      endTime: '2026-04-23T11:00:00Z',
    });

    expect(useCalendarStore.getState().events[0].id).toMatch(/^optimistic-/);
    expect(useCalendarStore.getState().todayEvents[0].title).toBe('Planning');

    pending.resolve(makeSdkEvent({ event_id: 'evt-created', title: 'Planning' }));
    const created = await createPromise;

    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        title: 'Planning',
        start_time: '2026-04-23T10:00:00Z',
        end_time: '2026-04-23T11:00:00Z',
      }),
    );
    expect(created.id).toBe('evt-created');
    expect(useCalendarStore.getState().events[0].id).toBe('evt-created');
    expect(useCalendarStore.getState().todayEvents[0].id).toBe('evt-created');
  });

  test('rolls back optimistic create when SDK create fails', async () => {
    mockCreateEvent.mockRejectedValue(new Error('create failed'));

    await expect(
      useCalendarStore.getState().createEvent({
        title: 'Broken',
        startTime: '2026-04-23T10:00:00Z',
        endTime: '2026-04-23T11:00:00Z',
      }),
    ).rejects.toThrow('create failed');

    expect(useCalendarStore.getState().events).toEqual([]);
    expect(useCalendarStore.getState().todayEvents).toEqual([]);
    expect(useCalendarStore.getState().error).toBe('create failed');
  });

  test('updates events optimistically and keeps SDK response', async () => {
    useCalendarStore.setState({
      events: [makeStoreEvent()],
      todayEvents: [makeStoreEvent()],
    });
    mockUpdateEvent.mockResolvedValue(makeSdkEvent({ event_id: 'evt-1', title: 'Updated' }));

    const updated = await useCalendarStore.getState().updateEvent('evt-1', { title: 'Updated' });

    expect(mockUpdateEvent).toHaveBeenCalledWith('evt-1', 'user-1', { title: 'Updated' });
    expect(updated.title).toBe('Updated');
    expect(useCalendarStore.getState().events[0].title).toBe('Updated');
    expect(useCalendarStore.getState().todayEvents[0].title).toBe('Updated');
  });

  test('rolls back optimistic update when SDK update fails', async () => {
    useCalendarStore.setState({
      events: [makeStoreEvent()],
      todayEvents: [makeStoreEvent()],
    });
    mockUpdateEvent.mockRejectedValue(new Error('update failed'));

    await expect(useCalendarStore.getState().updateEvent('evt-1', { title: 'Broken' })).rejects.toThrow(
      'update failed',
    );

    expect(useCalendarStore.getState().events[0].title).toBe('Standup');
    expect(useCalendarStore.getState().todayEvents[0].title).toBe('Standup');
    expect(useCalendarStore.getState().error).toBe('update failed');
  });

  test('deletes events optimistically', async () => {
    useCalendarStore.setState({
      events: [makeStoreEvent()],
      todayEvents: [makeStoreEvent()],
    });
    mockDeleteEvent.mockResolvedValue({ success: true, message: 'deleted' });

    await useCalendarStore.getState().deleteEvent('evt-1');

    expect(mockDeleteEvent).toHaveBeenCalledWith('evt-1', 'user-1');
    expect(useCalendarStore.getState().events).toEqual([]);
    expect(useCalendarStore.getState().todayEvents).toEqual([]);
  });

  test('rolls back optimistic delete when SDK delete fails', async () => {
    useCalendarStore.setState({
      events: [makeStoreEvent()],
      todayEvents: [makeStoreEvent()],
    });
    mockDeleteEvent.mockRejectedValue(new Error('delete failed'));

    await expect(useCalendarStore.getState().deleteEvent('evt-1')).rejects.toThrow('delete failed');

    expect(useCalendarStore.getState().events).toHaveLength(1);
    expect(useCalendarStore.getState().todayEvents).toHaveLength(1);
    expect(useCalendarStore.getState().error).toBe('delete failed');
  });

  test('keeps provider fetching through the existing provider adapter', async () => {
    mockGetProviders.mockResolvedValue([{ id: 'google', type: 'google', name: 'Google', connected: true }]);

    await useCalendarStore.getState().fetchProviders();

    expect(mockGetProviders).toHaveBeenCalled();
    expect(useCalendarStore.getState().providers).toHaveLength(1);
  });

  test('exports date filtering selectors', () => {
    const state = {
      ...useCalendarStore.getState(),
      events: [
        makeStoreEvent({ id: 'today', startTime: new Date().toISOString() }),
        makeStoreEvent({
          id: 'next-week',
          startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        }),
        makeStoreEvent({
          id: 'tomorrow',
          startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      ],
    };

    expect(selectTodayEvents(state).map((event) => event.id)).toEqual(['today']);
    expect(selectWeekEvents(state).map((event) => event.id)).toEqual(['today', 'tomorrow']);
    expect(selectUpcomingEvents(state).map((event) => event.id)).toEqual(['today', 'tomorrow', 'next-week']);
  });
});
