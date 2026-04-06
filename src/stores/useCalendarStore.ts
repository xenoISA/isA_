/**
 * ============================================================================
 * Calendar Store (useCalendarStore.ts) - Zustand store with SDK sync
 * ============================================================================
 */

import { create } from 'zustand';
import { createLogger } from '../utils/logger';
import { getCalendarService } from '../api/calendarService';
import type {
  CalendarEvent,
  CreateEventRequest,
  UpdateEventRequest,
  EventQueryParams,
  SyncStatusResponse,
} from '../api/calendarService';
export type CalendarSyncProvider = 'google' | 'apple' | 'outlook';

const log = createLogger('CalendarStore');

// ================================================================================
// Store Types
// ================================================================================

interface CalendarState {
  events: CalendarEvent[];
  currentEvent: CalendarEvent | null;
  isLoading: boolean;
  error: string | null;
  syncStatus: SyncStatusResponse | null;
  lastFetched: string | null;
}

interface CalendarActions {
  // CRUD
  createEvent: (request: CreateEventRequest) => Promise<CalendarEvent | null>;
  updateEvent: (eventId: string, userId: string, updates: UpdateEventRequest) => Promise<CalendarEvent | null>;
  deleteEvent: (eventId: string, userId: string) => Promise<boolean>;
  setCurrentEvent: (event: CalendarEvent | null) => void;

  // Queries
  fetchEvents: (params: EventQueryParams) => Promise<void>;
  fetchTodayEvents: (userId: string) => Promise<void>;
  fetchWeekEvents: (userId: string) => Promise<void>;
  fetchUpcomingEvents: (userId: string, days?: number) => Promise<void>;

  // Sync
  syncCalendar: (userId: string, provider: CalendarSyncProvider) => Promise<void>;
  getSyncStatus: (userId: string) => Promise<void>;

  // Utility
  clearError: () => void;
  clearEvents: () => void;
}

type CalendarStore = CalendarState & CalendarActions;

// ================================================================================
// Store
// ================================================================================

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  // Initial state
  events: [],
  currentEvent: null,
  isLoading: false,
  error: null,
  syncStatus: null,
  lastFetched: null,

  // ── CRUD ────────────────────────────────────────────────────────────

  createEvent: async (request) => {
    set({ isLoading: true, error: null });
    try {
      const service = getCalendarService();
      const event = await service.createEvent(request);
      set((state) => ({
        events: [event, ...state.events],
        isLoading: false,
      }));
      log.info('Event created', { id: event.event_id });
      return event;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to create event';
      log.error('Create event failed', { error: msg });
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  updateEvent: async (eventId, userId, updates) => {
    const { events } = get();
    const original = events.find((e) => e.event_id === eventId);

    // Optimistic update
    if (original) {
      set({
        events: events.map((e) => (e.event_id === eventId ? { ...e, ...updates } as CalendarEvent : e)),
        isLoading: true,
        error: null,
      });
    }

    try {
      const service = getCalendarService();
      const updated = await service.updateEvent(eventId, userId, updates);
      set((state) => ({
        events: state.events.map((e) => (e.event_id === eventId ? updated : e)),
        currentEvent: state.currentEvent?.event_id === eventId ? updated : state.currentEvent,
        isLoading: false,
      }));
      log.info('Event updated', { id: eventId });
      return updated;
    } catch (error) {
      // Rollback
      if (original) {
        set((state) => ({
          events: state.events.map((e) => (e.event_id === eventId ? original : e)),
        }));
      }
      const msg = error instanceof Error ? error.message : 'Failed to update event';
      log.error('Update event failed', { error: msg });
      set({ error: msg, isLoading: false });
      return null;
    }
  },

  deleteEvent: async (eventId, userId) => {
    const { events } = get();
    const original = events.find((e) => e.event_id === eventId);

    // Optimistic delete
    set({
      events: events.filter((e) => e.event_id !== eventId),
      currentEvent: get().currentEvent?.event_id === eventId ? null : get().currentEvent,
      isLoading: true,
      error: null,
    });

    try {
      const service = getCalendarService();
      await service.deleteEvent(eventId, userId);
      set({ isLoading: false });
      log.info('Event deleted', { eventId });
      return true;
    } catch (error) {
      // Rollback
      if (original) {
        set((state) => ({ events: [...state.events, original] }));
      }
      const msg = error instanceof Error ? error.message : 'Failed to delete event';
      log.error('Delete event failed', { error: msg });
      set({ error: msg, isLoading: false });
      return false;
    }
  },

  setCurrentEvent: (event) => set({ currentEvent: event }),

  // ── Queries ─────────────────────────────────────────────────────────

  fetchEvents: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const service = getCalendarService();
      const result = await service.listEvents(params);
      set({
        events: result.events,
        isLoading: false,
        lastFetched: new Date().toISOString(),
      });
      log.info('Events fetched', { count: result.events.length });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch events';
      log.error('Fetch events failed', { error: msg });
      set({ error: msg, isLoading: false });
    }
  },

  fetchTodayEvents: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const service = getCalendarService();
      const events = await service.getTodayEvents(userId);
      set({ events, isLoading: false, lastFetched: new Date().toISOString() });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch today events';
      log.error('Fetch today events failed', { error: msg });
      set({ error: msg, isLoading: false });
    }
  },

  fetchWeekEvents: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const service = getCalendarService();
      const events = await service.getWeekEvents(userId);
      set({ events, isLoading: false, lastFetched: new Date().toISOString() });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch week events';
      log.error('Fetch week events failed', { error: msg });
      set({ error: msg, isLoading: false });
    }
  },

  fetchUpcomingEvents: async (userId, days = 7) => {
    set({ isLoading: true, error: null });
    try {
      const service = getCalendarService();
      const events = await service.getUpcomingEvents(userId, days);
      set({ events, isLoading: false, lastFetched: new Date().toISOString() });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch upcoming events';
      log.error('Fetch upcoming events failed', { error: msg });
      set({ error: msg, isLoading: false });
    }
  },

  // ── Sync ────────────────────────────────────────────────────────────

  syncCalendar: async (userId, provider) => {
    set({ isLoading: true, error: null });
    try {
      const service = getCalendarService();
      await service.syncCalendar(userId, provider);
      log.info('Calendar sync started', { provider });
      // Refresh events after sync
      const events = await service.getUpcomingEvents(userId);
      set({ events, isLoading: false, lastFetched: new Date().toISOString() });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sync failed';
      log.error('Calendar sync failed', { error: msg });
      set({ error: msg, isLoading: false });
    }
  },

  getSyncStatus: async (userId) => {
    try {
      const service = getCalendarService();
      const syncStatus = await service.getSyncStatus(userId);
      set({ syncStatus });
    } catch (error) {
      log.error('Get sync status failed', { error });
    }
  },

  // ── Utility ─────────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
  clearEvents: () => set({ events: [], currentEvent: null, lastFetched: null }),
}));

// ================================================================================
// Selectors
// ================================================================================

export const useCalendarEvents = () => useCalendarStore((s) => s.events);
export const useCalendarLoading = () => useCalendarStore((s) => s.isLoading);
export const useCalendarError = () => useCalendarStore((s) => s.error);
export const useCurrentEvent = () => useCalendarStore((s) => s.currentEvent);
export const useCalendarSyncStatus = () => useCalendarStore((s) => s.syncStatus);

export const useCalendarActions = () =>
  useCalendarStore((s) => ({
    createEvent: s.createEvent,
    updateEvent: s.updateEvent,
    deleteEvent: s.deleteEvent,
    setCurrentEvent: s.setCurrentEvent,
    fetchEvents: s.fetchEvents,
    fetchTodayEvents: s.fetchTodayEvents,
    fetchWeekEvents: s.fetchWeekEvents,
    fetchUpcomingEvents: s.fetchUpcomingEvents,
    syncCalendar: s.syncCalendar,
    getSyncStatus: s.getSyncStatus,
    clearError: s.clearError,
    clearEvents: s.clearEvents,
  }));
