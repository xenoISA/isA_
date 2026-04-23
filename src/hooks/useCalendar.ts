import { useMemo } from 'react';
import {
  selectTodayEvents,
  selectUpcomingEvents,
  selectWeekEvents,
  useCalendarStore,
  type CalendarEvent,
  type CalendarState,
} from '../stores/useCalendarStore';

export type CalendarActions = Pick<
  CalendarState,
  | 'fetchTodayEvents'
  | 'fetchEvents'
  | 'fetchProviders'
  | 'createEvent'
  | 'updateEvent'
  | 'deleteEvent'
  | 'addEvent'
  | 'removeEvent'
>;

export interface CalendarSnapshot {
  events: CalendarEvent[];
  providers: CalendarState['providers'];
  loading: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface CalendarDateHelpers {
  todayEvents: CalendarEvent[];
  weekEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
}

export interface UseCalendarReturn extends CalendarSnapshot, CalendarDateHelpers, CalendarActions {
  actions: CalendarActions;
}

export const calendarStateSelector = (state: CalendarState): CalendarSnapshot => ({
  events: state.events,
  providers: state.providers,
  loading: state.isLoading,
  isLoading: state.isLoading,
  error: state.error,
});

export const calendarActionsSelector = (state: CalendarState): CalendarActions => ({
  fetchTodayEvents: state.fetchTodayEvents,
  fetchEvents: state.fetchEvents,
  fetchProviders: state.fetchProviders,
  createEvent: state.createEvent,
  updateEvent: state.updateEvent,
  deleteEvent: state.deleteEvent,
  addEvent: state.addEvent,
  removeEvent: state.removeEvent,
});

function uniqueById(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

export const calendarDateHelpersSelector = (state: CalendarState): CalendarDateHelpers => ({
  todayEvents: uniqueById([...state.todayEvents, ...selectTodayEvents(state)]),
  weekEvents: selectWeekEvents(state),
  upcomingEvents: selectUpcomingEvents(state),
});

function sameEventList(left: CalendarEvent[], right: CalendarEvent[]): boolean {
  return left.length === right.length && left.every((event, index) => Object.is(event, right[index]));
}

export function calendarDateHelpersEqual(
  left: CalendarDateHelpers,
  right: CalendarDateHelpers,
): boolean {
  return (
    sameEventList(left.todayEvents, right.todayEvents) &&
    sameEventList(left.weekEvents, right.weekEvents) &&
    sameEventList(left.upcomingEvents, right.upcomingEvents)
  );
}

function calendarSnapshotEqual(left: CalendarSnapshot, right: CalendarSnapshot): boolean {
  return (
    Object.is(left.events, right.events) &&
    Object.is(left.providers, right.providers) &&
    left.loading === right.loading &&
    left.isLoading === right.isLoading &&
    left.error === right.error
  );
}

function calendarActionsEqual(left: CalendarActions, right: CalendarActions): boolean {
  return (
    Object.is(left.fetchTodayEvents, right.fetchTodayEvents) &&
    Object.is(left.fetchEvents, right.fetchEvents) &&
    Object.is(left.fetchProviders, right.fetchProviders) &&
    Object.is(left.createEvent, right.createEvent) &&
    Object.is(left.updateEvent, right.updateEvent) &&
    Object.is(left.deleteEvent, right.deleteEvent) &&
    Object.is(left.addEvent, right.addEvent) &&
    Object.is(left.removeEvent, right.removeEvent)
  );
}

export function useCalendar(): UseCalendarReturn {
  const snapshot = useCalendarStore(calendarStateSelector, calendarSnapshotEqual);
  const dateHelpers = useCalendarStore(calendarDateHelpersSelector, calendarDateHelpersEqual);
  const actions = useCalendarStore(calendarActionsSelector, calendarActionsEqual);

  return useMemo(
    () => ({
      ...snapshot,
      ...dateHelpers,
      ...actions,
      actions,
    }),
    [snapshot, dateHelpers, actions],
  );
}
