import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockCreateEvent,
  mockGetEvent,
  mockUpdateEvent,
  mockDeleteEvent,
  mockQueryEvents,
  mockGetTodayEvents,
  mockGetWeekEvents,
  mockGetMonthEvents,
  mockGetEventsByDateRange,
  mockSyncCalendar,
  mockGetSyncStatus,
  mockHealthCheck,
  mockGetServiceInfo,
  mockSetAuthToken,
  mockClearAuth,
  mockGetAuthHeaders,
  mockLogDebug,
  mockLogInfo,
  mockLogWarn,
  mockLogError,
} = vi.hoisted(() => ({
  mockCreateEvent: vi.fn(),
  mockGetEvent: vi.fn(),
  mockUpdateEvent: vi.fn(),
  mockDeleteEvent: vi.fn(),
  mockQueryEvents: vi.fn(),
  mockGetTodayEvents: vi.fn(),
  mockGetWeekEvents: vi.fn(),
  mockGetMonthEvents: vi.fn(),
  mockGetEventsByDateRange: vi.fn(),
  mockSyncCalendar: vi.fn(),
  mockGetSyncStatus: vi.fn(),
  mockHealthCheck: vi.fn(),
  mockGetServiceInfo: vi.fn(),
  mockSetAuthToken: vi.fn(),
  mockClearAuth: vi.fn(),
  mockGetAuthHeaders: vi.fn(),
  mockLogDebug: vi.fn(),
  mockLogInfo: vi.fn(),
  mockLogWarn: vi.fn(),
  mockLogError: vi.fn(),
}));

vi.mock('@isa/core', () => ({
  CalendarService: vi.fn().mockImplementation(() => ({
    createEvent: mockCreateEvent,
    getEvent: mockGetEvent,
    updateEvent: mockUpdateEvent,
    deleteEvent: mockDeleteEvent,
    queryEvents: mockQueryEvents,
    getTodayEvents: mockGetTodayEvents,
    getWeekEvents: mockGetWeekEvents,
    getMonthEvents: mockGetMonthEvents,
    getEventsByDateRange: mockGetEventsByDateRange,
    syncCalendar: mockSyncCalendar,
    getSyncStatus: mockGetSyncStatus,
    healthCheck: mockHealthCheck,
    getServiceInfo: mockGetServiceInfo,
    setAuthToken: mockSetAuthToken,
    clearAuth: mockClearAuth,
  })),
  EventCategory: {
    WORK: 'work',
  },
  RecurrenceType: {
    NONE: 'none',
  },
  SyncProvider: {
    GOOGLE: 'google_calendar',
  },
}));

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_CONFIG: {
    BASE_URL: 'http://localhost:9080',
  },
  getAuthHeaders: mockGetAuthHeaders,
}));

vi.mock('../../utils/logger', () => ({
  createLogger: vi.fn(() => ({
    debug: mockLogDebug,
    info: mockLogInfo,
    warn: mockLogWarn,
    error: mockLogError,
  })),
  LogCategory: {
    API_REQUEST: 'API_REQUEST',
  },
}));

import { CalendarService } from '../calendarService';
import { CalendarService as CoreCalendarService } from '@isa/core';

describe('calendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthHeaders.mockReturnValue({ Authorization: 'Bearer test-token' });
  });

  describe('constructor and auth setup', () => {
    test('initializes SDK CalendarService with the default gateway base URL', async () => {
      const service = new CalendarService();
      await service.refreshAuth();

      expect(CoreCalendarService).toHaveBeenCalledWith('http://localhost:9080');
      expect(mockSetAuthToken).toHaveBeenCalledWith('test-token');
    });

    test('prefers the provided auth headers function', async () => {
      const customAuth = vi.fn().mockResolvedValue({ Authorization: 'Bearer custom-token' });
      const service = new CalendarService(undefined, customAuth);

      await service.refreshAuth();

      expect(customAuth).toHaveBeenCalled();
      expect(mockSetAuthToken).toHaveBeenCalledWith('custom-token');
    });

    test('clears auth when no token is available', async () => {
      mockGetAuthHeaders.mockReturnValue({});
      const service = new CalendarService();

      await service.refreshAuth();

      expect(mockClearAuth).toHaveBeenCalled();
    });
  });

  describe('createEvent', () => {
    test('creates an event through the SDK service', async () => {
      const createdEvent = {
        event_id: 'evt-1',
        user_id: 'user-1',
        title: 'Standup',
      };
      mockCreateEvent.mockResolvedValue(createdEvent);
      const service = new CalendarService();

      const payload = {
        user_id: 'user-1',
        title: 'Standup',
        start_time: '2026-04-23T09:00:00Z',
        end_time: '2026-04-23T09:30:00Z',
      };
      const result = await service.createEvent(payload as any);

      expect(mockCreateEvent).toHaveBeenCalledWith(payload);
      expect(result).toEqual(createdEvent);
    });

    test('logs and rethrows SDK errors', async () => {
      const error = new Error('create failed');
      mockCreateEvent.mockRejectedValue(error);
      const service = new CalendarService();

      await expect(
        service.createEvent({
          user_id: 'user-1',
          title: 'Broken',
          start_time: '2026-04-23T09:00:00Z',
          end_time: '2026-04-23T10:00:00Z',
        } as any),
      ).rejects.toThrow('create failed');

      expect(mockLogError).toHaveBeenCalled();
    });
  });

  describe('CRUD methods', () => {
    test('gets an event by ID', async () => {
      mockGetEvent.mockResolvedValue({ event_id: 'evt-1', title: 'Review' });
      const service = new CalendarService();

      const result = await service.getEvent('evt-1', 'user-1');

      expect(mockGetEvent).toHaveBeenCalledWith('evt-1', 'user-1');
      expect(result.event_id).toBe('evt-1');
    });

    test('updates an event', async () => {
      mockUpdateEvent.mockResolvedValue({ event_id: 'evt-1', title: 'Updated' });
      const service = new CalendarService();

      const result = await service.updateEvent('evt-1', 'user-1', { title: 'Updated' } as any);

      expect(mockUpdateEvent).toHaveBeenCalledWith('evt-1', 'user-1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    test('deletes an event', async () => {
      mockDeleteEvent.mockResolvedValue({ success: true, message: 'deleted' });
      const service = new CalendarService();

      const result = await service.deleteEvent('evt-1', 'user-1');

      expect(mockDeleteEvent).toHaveBeenCalledWith('evt-1', 'user-1');
      expect(result.success).toBe(true);
    });
  });

  describe('list and date-range helpers', () => {
    test('lists events with query params', async () => {
      const response = {
        events: [{ event_id: 'evt-1', title: 'Sprint review' }],
        total: 1,
        page: 1,
        page_size: 100,
      };
      mockQueryEvents.mockResolvedValue(response);
      const service = new CalendarService();

      const result = await service.listEvents({
        user_id: 'user-1',
        start_date: '2026-04-23T00:00:00Z',
        end_date: '2026-04-24T00:00:00Z',
      } as any);

      expect(mockQueryEvents).toHaveBeenCalledWith({
        user_id: 'user-1',
        start_date: '2026-04-23T00:00:00Z',
        end_date: '2026-04-24T00:00:00Z',
      });
      expect(result.total).toBe(1);
      expect(result.events[0].event_id).toBe('evt-1');
    });

    test('gets today events', async () => {
      mockGetTodayEvents.mockResolvedValue([{ event_id: 'evt-today' }]);
      const service = new CalendarService();

      const result = await service.getTodayEvents('user-1');

      expect(mockGetTodayEvents).toHaveBeenCalledWith('user-1');
      expect(result).toEqual([{ event_id: 'evt-today' }]);
    });

    test('gets week events', async () => {
      mockGetWeekEvents.mockResolvedValue([{ event_id: 'evt-week' }]);
      const service = new CalendarService();

      await service.getWeekEvents('user-1');

      expect(mockGetWeekEvents).toHaveBeenCalledWith('user-1');
    });

    test('gets month events', async () => {
      mockGetMonthEvents.mockResolvedValue([{ event_id: 'evt-month' }]);
      const service = new CalendarService();

      await service.getMonthEvents('user-1');

      expect(mockGetMonthEvents).toHaveBeenCalledWith('user-1');
    });

    test('gets events by custom date range', async () => {
      const start = new Date('2026-04-23T00:00:00Z');
      const end = new Date('2026-04-24T00:00:00Z');
      mockGetEventsByDateRange.mockResolvedValue([{ event_id: 'evt-custom' }]);
      const service = new CalendarService();

      const result = await service.getEventsByDateRange('user-1', start, end);

      expect(mockGetEventsByDateRange).toHaveBeenCalledWith('user-1', start, end);
      expect(result).toEqual([{ event_id: 'evt-custom' }]);
    });
  });

  describe('sync helpers', () => {
    test('syncs a calendar provider', async () => {
      mockSyncCalendar.mockResolvedValue({ status: 'ok' });
      const service = new CalendarService();

      const result = await service.syncCalendar('user-1', 'google');

      expect(mockSyncCalendar).toHaveBeenCalledWith('user-1', 'google');
      expect(result.status).toBe('ok');
    });

    test('gets sync status', async () => {
      mockGetSyncStatus.mockResolvedValue({ status: 'idle' });
      const service = new CalendarService();

      const result = await service.getSyncStatus('user-1');

      expect(mockGetSyncStatus).toHaveBeenCalledWith('user-1');
      expect(result.status).toBe('idle');
    });
  });
});
