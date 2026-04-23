import { create, type StateCreator } from 'zustand';
import {
  CalendarService,
  type CalendarEvent as SDKCalendarEvent,
  type CreateEventRequest,
  type UpdateEventRequest,
} from '../api/calendarService';
import type { CalendarProvider } from '../api/adapters/CalendarAdapter';
import * as CalendarAdapter from '../api/adapters/CalendarAdapter';
import { useUserStore } from './useUserStore';

const calendarService = new CalendarService();

function requireUserId(): string | null {
  const externalUser = useUserStore.getState().externalUser as Record<string, any> | null;
  return externalUser?.auth0_id || externalUser?.sub || externalUser?.user_id || externalUser?.id || null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  provider?: string;
  reminders?: number[];
  metadata?: Record<string, any>;
}

export type CalendarEventDraft = Omit<CalendarEvent, 'id'>;
export type CalendarEventPatch = Partial<CalendarEventDraft>;

export interface CalendarState {
  events: CalendarEvent[];
  todayEvents: CalendarEvent[];
  providers: CalendarProvider[];
  isLoading: boolean;
  error: string | null;
  fetchTodayEvents: () => Promise<void>;
  fetchEvents: (start: string, end: string) => Promise<void>;
  fetchProviders: () => Promise<void>;
  createEvent: (event: CalendarEventDraft) => Promise<CalendarEvent>;
  updateEvent: (id: string, updates: CalendarEventPatch) => Promise<CalendarEvent>;
  deleteEvent: (id: string) => Promise<void>;
  addEvent: (event: CalendarEventDraft) => Promise<CalendarEvent>;
  removeEvent: (id: string) => Promise<void>;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function toISO(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function fromSDKEvent(event: SDKCalendarEvent): CalendarEvent {
  return {
    id: event.event_id,
    title: event.title,
    description: event.description,
    startTime: toISO(event.start_time),
    endTime: toISO(event.end_time),
    allDay: event.all_day,
    provider: event.sync_provider,
    reminders: event.reminders,
    metadata: event.metadata,
  };
}

function toCreateRequest(userId: string, event: CalendarEventDraft): CreateEventRequest {
  return {
    user_id: userId,
    title: event.title,
    description: event.description,
    start_time: event.startTime,
    end_time: event.endTime,
    all_day: event.allDay,
    reminders: event.reminders,
    metadata: event.metadata,
  };
}

function toUpdateRequest(updates: CalendarEventPatch): UpdateEventRequest {
  return {
    title: updates.title,
    description: updates.description,
    start_time: updates.startTime,
    end_time: updates.endTime,
    all_day: updates.allDay,
    reminders: updates.reminders,
  };
}

function optimisticEvent(event: CalendarEventDraft): CalendarEvent {
  return {
    id: `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    allDay: false,
    reminders: [],
    ...event,
  };
}

function replaceEvent(events: CalendarEvent[], id: string, next: CalendarEvent): CalendarEvent[] {
  return events.map((event) => (event.id === id ? next : event));
}

function patchEvent(events: CalendarEvent[], id: string, updates: CalendarEventPatch): CalendarEvent[] {
  return events.map((event) => (event.id === id ? { ...event, ...updates } : event));
}

function removeEvent(events: CalendarEvent[], id: string): CalendarEvent[] {
  return events.filter((event) => event.id !== id);
}

function startOfLocalDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isInRange(event: CalendarEvent, start: Date, end: Date): boolean {
  const time = new Date(event.startTime).getTime();
  return time >= start.getTime() && time < end.getTime();
}

function isToday(event: CalendarEvent): boolean {
  const start = startOfLocalDay(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return isInRange(event, start, end);
}

export const selectTodayEvents = (state: CalendarState): CalendarEvent[] =>
  state.events.filter(isToday);

export const selectWeekEvents = (state: CalendarState): CalendarEvent[] => {
  const start = startOfLocalDay(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return state.events.filter((event) => isInRange(event, start, end));
};

export const selectUpcomingEvents = (state: CalendarState): CalendarEvent[] => {
  const now = Date.now();
  return [...state.events]
    .filter((event) => new Date(event.endTime).getTime() >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
};

const createCalendarState: StateCreator<CalendarState> = (set, get) => ({
  events: [],
  todayEvents: [],
  providers: [],
  isLoading: false,
  error: null,
  fetchTodayEvents: async () => {
    const userId = requireUserId();
    if (!userId) {
      set({ error: 'Not authenticated: calendar fetch requires a logged-in user', isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const todayEvents = (await calendarService.getTodayEvents(userId)).map(fromSDKEvent);
      set({ todayEvents, isLoading: false });
    } catch (err: any) {
      set({ error: errorMessage(err), isLoading: false });
    }
  },
  fetchEvents: async (start, end) => {
    const userId = requireUserId();
    if (!userId) {
      set({ error: 'Not authenticated: calendar fetch requires a logged-in user', isLoading: false });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const events = (await calendarService.getEventsByDateRange(
        userId,
        new Date(start),
        new Date(end),
      )).map(fromSDKEvent);
      set({ events, isLoading: false });
    } catch (err: any) {
      set({ error: errorMessage(err), isLoading: false });
    }
  },
  fetchProviders: async () => {
    try {
      const providers = await CalendarAdapter.getProviders();
      set({ providers });
    } catch (err: any) {
      set({ error: errorMessage(err) });
    }
  },
  createEvent: async (event) => {
    const userId = requireUserId();
    if (!userId) {
      const message = 'Not authenticated: calendar create requires a logged-in user';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }

    const pending = optimisticEvent(event);
    const previous = get();
    set((state) => ({
      error: null,
      events: [...state.events, pending],
      todayEvents: isToday(pending) ? [...state.todayEvents, pending] : state.todayEvents,
    }));

    try {
      const created = fromSDKEvent(await calendarService.createEvent(toCreateRequest(userId, event)));
      set((state) => ({
        events: replaceEvent(state.events, pending.id, created),
        todayEvents: replaceEvent(state.todayEvents, pending.id, created),
      }));
      return created;
    } catch (err) {
      set({
        events: previous.events,
        todayEvents: previous.todayEvents,
        error: errorMessage(err),
      });
      throw err;
    }
  },
  updateEvent: async (id, updates) => {
    const userId = requireUserId();
    if (!userId) {
      const message = 'Not authenticated: calendar update requires a logged-in user';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }

    const previous = get();
    set((s) => ({
      error: null,
      events: patchEvent(s.events, id, updates),
      todayEvents: patchEvent(s.todayEvents, id, updates),
    }));

    try {
      const updated = fromSDKEvent(await calendarService.updateEvent(id, userId, toUpdateRequest(updates)));
      set((s) => ({
        events: replaceEvent(s.events, id, updated),
        todayEvents: replaceEvent(s.todayEvents, id, updated),
      }));
      return updated;
    } catch (err) {
      set({
        events: previous.events,
        todayEvents: previous.todayEvents,
        error: errorMessage(err),
      });
      throw err;
    }
  },
  deleteEvent: async (id) => {
    const userId = requireUserId();
    if (!userId) {
      const message = 'Not authenticated: calendar delete requires a logged-in user';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }

    const previous = get();
    set((s) => ({
      error: null,
      events: removeEvent(s.events, id),
      todayEvents: removeEvent(s.todayEvents, id),
    }));

    try {
      await calendarService.deleteEvent(id, userId);
    } catch (err) {
      set({
        events: previous.events,
        todayEvents: previous.todayEvents,
        error: errorMessage(err),
      });
      throw err;
    }
  },
  addEvent: async (event) => {
    return get().createEvent(event);
  },
  removeEvent: async (id) => {
    return get().deleteEvent(id);
  },
});

export const useCalendarStore = create<CalendarState>(createCalendarState);
