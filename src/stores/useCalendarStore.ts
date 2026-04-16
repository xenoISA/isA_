import { create } from 'zustand';
import type { CalendarEvent, CalendarProvider } from '../api/adapters/CalendarAdapter';
import * as CalendarAdapter from '../api/adapters/CalendarAdapter';

interface CalendarState {
  events: CalendarEvent[];
  todayEvents: CalendarEvent[];
  providers: CalendarProvider[];
  isLoading: boolean;
  error: string | null;
  fetchTodayEvents: () => Promise<void>;
  fetchEvents: (start: string, end: string) => Promise<void>;
  fetchProviders: () => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<CalendarEvent>;
  removeEvent: (id: string) => Promise<void>;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  events: [],
  todayEvents: [],
  providers: [],
  isLoading: false,
  error: null,
  fetchTodayEvents: async () => {
    set({ isLoading: true, error: null });
    try {
      const todayEvents = await CalendarAdapter.getTodayEvents();
      set({ todayEvents, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  fetchEvents: async (start, end) => {
    set({ isLoading: true, error: null });
    try {
      const events = await CalendarAdapter.getEvents(start, end);
      set({ events, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
  fetchProviders: async () => {
    try {
      const providers = await CalendarAdapter.getProviders();
      set({ providers });
    } catch (err: any) {
      set({ error: err.message });
    }
  },
  addEvent: async (event) => {
    const created = await CalendarAdapter.createEvent(event);
    set((s) => ({ todayEvents: [...s.todayEvents, created], events: [...s.events, created] }));
    return created;
  },
  removeEvent: async (id) => {
    await CalendarAdapter.deleteEvent(id);
    set((s) => ({
      todayEvents: s.todayEvents.filter((e) => e.id !== id),
      events: s.events.filter((e) => e.id !== id),
    }));
  },
}));
