/**
 * ============================================================================
 * useCalendar Hook - Calendar data and actions for UI components
 * ============================================================================
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createLogger } from '../utils/logger';
import {
  useCalendarStore,
  useCalendarEvents,
  useCalendarLoading,
  useCalendarError,
  useCalendarSyncStatus,
  useCalendarActions,
} from '../stores/useCalendarStore';
import type { CalendarSyncProvider } from '../stores/useCalendarStore';

// Re-export types for consumer convenience
export type {
  CalendarEvent,
  CreateEventRequest,
  UpdateEventRequest,
  EventQueryParams,
  SyncStatusResponse,
} from '../api/calendarService';
export type { CalendarSyncProvider } from '../stores/useCalendarStore';

const log = createLogger('useCalendar');

// ================================================================================
// Main Hook
// ================================================================================

export const useCalendar = (userId?: string) => {
  const events = useCalendarEvents();
  const isLoading = useCalendarLoading();
  const error = useCalendarError();
  const syncStatus = useCalendarSyncStatus();
  const actions = useCalendarActions();
  const fetchedRef = useRef(false);

  // Auto-fetch on mount
  useEffect(() => {
    if (userId && !fetchedRef.current) {
      fetchedRef.current = true;
      actions.fetchUpcomingEvents(userId).catch(() => {
        log.debug('Initial calendar fetch failed (backend may be offline)');
      });
    }
  }, [userId, actions]);

  // ── Derived data ──────────────────────────────────────────────────

  const todayEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return events.filter((e) => {
      const start = new Date(e.start_time || '');
      return start >= today && start < tomorrow;
    });
  }, [events]);

  const weekEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    return events.filter((e) => {
      const start = new Date(e.start_time || '');
      return start >= now && start < weekEnd;
    });
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.start_time || '') >= now)
      .sort((a, b) => {
        const aTime = new Date(a.start_time || '').getTime();
        const bTime = new Date(b.start_time || '').getTime();
        return aTime - bTime;
      });
  }, [events]);

  // ── Date helpers ──────────────────────────────────────────────────

  const getEventsForDate = useCallback(
    (date: Date) => {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      return events.filter((e) => {
        const start = new Date(e.start_time || '');
        return start >= dayStart && start < dayEnd;
      });
    },
    [events]
  );

  const getEventsInRange = useCallback(
    (start: Date, end: Date) => {
      return events.filter((e) => {
        const eventStart = new Date(e.start_time || '');
        return eventStart >= start && eventStart <= end;
      });
    },
    [events]
  );

  // ── Actions ───────────────────────────────────────────────────────

  const refreshEvents = useCallback(async () => {
    if (userId) {
      await actions.fetchUpcomingEvents(userId);
    }
  }, [userId, actions]);

  const syncCalendar = useCallback(
    async (provider: CalendarSyncProvider) => {
      if (userId) {
        await actions.syncCalendar(userId, provider);
      }
    },
    [userId, actions]
  );

  const getSyncStatus = useCallback(async () => {
    if (userId) {
      await actions.getSyncStatus(userId);
    }
  }, [userId, actions]);

  return {
    // State
    events,
    todayEvents,
    weekEvents,
    upcomingEvents,
    isLoading,
    error,
    syncStatus,

    // CRUD
    createEvent: actions.createEvent,
    updateEvent: actions.updateEvent,
    deleteEvent: actions.deleteEvent,
    setCurrentEvent: actions.setCurrentEvent,

    // Queries
    fetchEvents: actions.fetchEvents,
    fetchTodayEvents: actions.fetchTodayEvents,
    fetchWeekEvents: actions.fetchWeekEvents,
    fetchUpcomingEvents: actions.fetchUpcomingEvents,
    refreshEvents,

    // Sync
    syncCalendar,
    getSyncStatus,

    // Date helpers
    getEventsForDate,
    getEventsInRange,

    // Utility
    clearError: actions.clearError,
  };
};

// ================================================================================
// Specialized Sub-Hooks
// ================================================================================

export const useTodayEvents = (userId?: string) => {
  const { todayEvents, isLoading, fetchTodayEvents } = useCalendar(userId);
  return { todayEvents, isLoading, fetchTodayEvents };
};

export const useUpcomingEvents = (userId?: string, days = 7) => {
  const { upcomingEvents, isLoading, fetchUpcomingEvents } = useCalendar(userId);
  return { upcomingEvents, isLoading, fetchUpcomingEvents };
};

export const useCalendarSync = (userId?: string) => {
  const { syncStatus, syncCalendar, getSyncStatus, isLoading } = useCalendar(userId);
  return { syncStatus, syncCalendar, getSyncStatus, isLoading };
};
