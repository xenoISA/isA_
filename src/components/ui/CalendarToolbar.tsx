/**
 * ============================================================================
 * Calendar Toolbar (CalendarToolbar.tsx) - macOS-style Calendar Management
 * ============================================================================
 *
 * Core Responsibilities:
 * - Calendar and event management for header toolbar
 * - Quick event viewing and scheduling
 * - Integration with assistant for AI-powered scheduling
 * - Similar to macOS Calendar app in toolbar
 *
 * Design Philosophy:
 * - Quick access to schedule information
 * - Clean, focused interface for time management
 * - Assistant-powered scheduling intelligence
 * - Non-intrusive but highly functional
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCalendar } from '../../hooks/useCalendar';
import type { CalendarEvent } from '../../stores/useCalendarStore';

const UPCOMING_WINDOW_DAYS = 7;
const UPCOMING_LIMIT = 5;

// Glass Button Style Creator for Calendar Toolbar
const createGlassButtonStyle = (color: string, size: 'sm' | 'md' = 'md', isDisabled: boolean = false) => ({
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: `rgba(${color}, 0.1)`,
  backdropFilter: 'blur(10px)',
  border: `1px solid rgba(${color}, 0.2)`,
  opacity: isDisabled ? 0.4 : 1,
  boxShadow: `0 2px 8px rgba(${color}, 0.15)`,
  width: size === 'sm' ? '20px' : '24px',
  height: size === 'sm' ? '20px' : '24px',
  color: `rgb(${color})`,
});

interface CalendarToolbarProps {
  className?: string;
}

export interface CalendarToolbarDraft {
  title: string;
  startInput: string;
  endInput: string;
}

export type CalendarToolbarEventType = 'meeting' | 'reminder' | 'task' | 'personal';

function roundToNextSlot(now: Date): Date {
  const next = new Date(now);
  next.setSeconds(0, 0);

  const minutes = next.getMinutes();
  if (minutes === 0 || minutes === 30) {
    return next;
  }

  if (minutes < 30) {
    next.setMinutes(30, 0, 0);
    return next;
  }

  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
}

export function toDateTimeLocalValue(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function buildDefaultEventDraft(now: Date = new Date()): CalendarToolbarDraft {
  const start = roundToNextSlot(now);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    title: '',
    startInput: toDateTimeLocalValue(start),
    endInput: toDateTimeLocalValue(end),
  };
}

export function selectToolbarUpcomingEvents(
  events: CalendarEvent[],
  now: number = Date.now(),
  limit: number = UPCOMING_LIMIT,
): CalendarEvent[] {
  return [...events]
    .filter((event) => new Date(event.endTime).getTime() >= now)
    .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime())
    .slice(0, limit);
}

export function getCalendarToolbarEventType(event: CalendarEvent): CalendarToolbarEventType {
  const metadata = event.metadata ?? {};
  const candidates = [
    metadata.type,
    metadata.eventType,
    metadata.kind,
    metadata.category,
    metadata.source_type,
  ]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toLowerCase());

  if (candidates.some((value) => value.includes('task') || value.includes('todo'))) {
    return 'task';
  }

  if (candidates.some((value) => value.includes('reminder') || value.includes('alert'))) {
    return 'reminder';
  }

  if (candidates.some((value) => value.includes('personal') || value.includes('private'))) {
    return 'personal';
  }

  if (event.title.toLowerCase().includes('remind')) {
    return 'reminder';
  }

  return 'meeting';
}

export function isAssistantGeneratedEvent(event: CalendarEvent): boolean {
  const metadata = event.metadata ?? {};
  return Boolean(
    metadata.assistantGenerated
    || metadata.aiGenerated
    || metadata.createdBy === 'mate'
    || metadata.createdBy === 'assistant'
    || metadata.source === 'mate'
    || metadata.source === 'assistant',
  );
}

export function getEventAttendees(event: CalendarEvent): string[] {
  const attendees = event.metadata?.attendees;
  if (!Array.isArray(attendees)) {
    return [];
  }

  return attendees
    .map((attendee) => {
      if (typeof attendee === 'string') return attendee;
      if (attendee && typeof attendee === 'object') {
        const name = attendee.name;
        const email = attendee.email;
        if (typeof name === 'string' && name.trim()) return name;
        if (typeof email === 'string' && email.trim()) return email;
      }
      return null;
    })
    .filter((attendee): attendee is string => Boolean(attendee));
}

function toIsoOrNull(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function formatTime(dateLike: string) {
  return new Date(dateLike).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getTimeLabel(dateLike: string, now: Date = new Date()) {
  const date = new Date(dateLike);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function eventTypeIcon(type: CalendarToolbarEventType) {
  switch (type) {
    case 'meeting':
      return '👥';
    case 'reminder':
      return '⏰';
    case 'task':
      return '✅';
    case 'personal':
      return '🗓️';
    default:
      return '📅';
  }
}

function eventTypeColor(type: CalendarToolbarEventType) {
  switch (type) {
    case 'meeting':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'reminder':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'task':
      return 'bg-green-500/20 text-green-300 border-green-500/30';
    case 'personal':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function buildDraftFromEvent(event: CalendarEvent): CalendarToolbarDraft {
  return {
    title: event.title,
    startInput: toDateTimeLocalValue(event.startTime),
    endInput: toDateTimeLocalValue(event.endTime),
  };
}

function draftIsValid(draft: CalendarToolbarDraft): boolean {
  const startIso = toIsoOrNull(draft.startInput);
  const endIso = toIsoOrNull(draft.endInput);
  return Boolean(
    draft.title.trim()
    && startIso
    && endIso
    && new Date(startIso).getTime() < new Date(endIso).getTime(),
  );
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerDraft, setComposerDraft] = useState<CalendarToolbarDraft>(() => buildDefaultEventDraft());
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<CalendarToolbarDraft>(() => buildDefaultEventDraft());
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const {
    upcomingEvents,
    providers,
    isLoading,
    error,
    fetchEvents,
    fetchProviders,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendar();

  const visibleEvents = useMemo(
    () => selectToolbarUpcomingEvents(upcomingEvents),
    [upcomingEvents],
  );
  const connectedProviders = providers.filter((provider) => provider.connected);
  const nextEvent = visibleEvents[0];
  const activeError = submissionError ?? error;

  const refreshCalendarPanel = useCallback(async () => {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + UPCOMING_WINDOW_DAYS);

    setSubmissionError(null);
    await Promise.all([
      fetchEvents(start.toISOString(), end.toISOString()),
      fetchProviders(),
    ]);
  }, [fetchEvents, fetchProviders]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current
        && buttonRef.current
        && !dropdownRef.current.contains(event.target as Node)
        && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      void refreshCalendarPanel();
    }
  }, [isOpen, refreshCalendarPanel]);

  const toggleCalendarPanel = () => {
    setIsOpen((prev) => !prev);
  };

  const openComposer = () => {
    setEditingEventId(null);
    setSubmissionError(null);
    setComposerDraft(buildDefaultEventDraft());
    setComposerOpen(true);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setComposerDraft(buildDefaultEventDraft());
  };

  const startEditing = (event: CalendarEvent) => {
    setComposerOpen(false);
    setSubmissionError(null);
    setEditingEventId(event.id);
    setEditingDraft(buildDraftFromEvent(event));
  };

  const cancelEditing = () => {
    setEditingEventId(null);
    setEditingDraft(buildDefaultEventDraft());
  };

  const handleCreateEvent = async () => {
    if (!draftIsValid(composerDraft)) {
      setSubmissionError('Enter a title and a valid time range.');
      return;
    }

    const startTime = toIsoOrNull(composerDraft.startInput);
    const endTime = toIsoOrNull(composerDraft.endInput);
    if (!startTime || !endTime) {
      setSubmissionError('Enter a valid start and end time.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);
    try {
      await createEvent({
        title: composerDraft.title.trim(),
        startTime,
        endTime,
        allDay: false,
        metadata: { source: 'calendar_toolbar' },
      });
      closeComposer();
    } catch (createError) {
      setSubmissionError(errorMessage(createError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEventId) return;
    if (!draftIsValid(editingDraft)) {
      setSubmissionError('Enter a title and a valid time range.');
      return;
    }

    const startTime = toIsoOrNull(editingDraft.startInput);
    const endTime = toIsoOrNull(editingDraft.endInput);
    if (!startTime || !endTime) {
      setSubmissionError('Enter a valid start and end time.');
      return;
    }

    setBusyEventId(editingEventId);
    setSubmissionError(null);
    try {
      await updateEvent(editingEventId, {
        title: editingDraft.title.trim(),
        startTime,
        endTime,
      });
      cancelEditing();
    } catch (updateError) {
      setSubmissionError(errorMessage(updateError));
    } finally {
      setBusyEventId(null);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setBusyEventId(eventId);
    setSubmissionError(null);
    try {
      await deleteEvent(eventId);
      if (editingEventId === eventId) {
        cancelEditing();
      }
    } catch (deleteError) {
      setSubmissionError(errorMessage(deleteError));
    } finally {
      setBusyEventId(null);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={toggleCalendarPanel}
        className="relative flex items-center gap-2 px-3 py-1.5 bg-gray-800/30 border border-gray-700/50 rounded-lg text-white hover:bg-gray-700/50 transition-colors cursor-pointer"
        title="Calendar"
      >
        <div className="relative">
          <div
            style={createGlassButtonStyle('107, 114, 128', 'md', true)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" />
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" />
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          {visibleEvents.length > 0 && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
          )}
        </div>

        <span className="text-xs font-medium">Calendar</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" />

          <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-96 bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
              <div className="flex items-center gap-2">
                <div
                  style={createGlassButtonStyle('59, 130, 246', 'md')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                    <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" />
                    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" />
                    <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Calendar</h3>
                  <p className="text-xs text-gray-400">
                    {isLoading
                      ? 'Loading schedule...'
                      : visibleEvents.length > 0
                        ? `${visibleEvents.length} upcoming events`
                        : 'No upcoming events'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 flex items-center justify-center hover:bg-gray-700/50 rounded text-gray-400 hover:text-white transition-colors"
                title="Close"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {nextEvent && (
              <div className="p-4 border-b border-gray-700/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">⏰</span>
                  <span className="text-xs font-medium text-blue-300">Up Next</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-white">{nextEvent.title}</div>
                    <div className="text-xs text-gray-400">
                      {getTimeLabel(nextEvent.startTime)} at {formatTime(nextEvent.startTime)}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs border ${eventTypeColor(getCalendarToolbarEventType(nextEvent))}`}>
                    {eventTypeIcon(getCalendarToolbarEventType(nextEvent))} {getCalendarToolbarEventType(nextEvent)}
                  </div>
                </div>
              </div>
            )}

            {activeError && (
              <div className="mx-4 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {activeError}
              </div>
            )}

            {composerOpen && (
              <div className="p-4 border-b border-gray-700/50 space-y-3">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Quick Event</div>
                <input
                  type="text"
                  value={composerDraft.title}
                  onChange={(event) => setComposerDraft((draft) => ({ ...draft, title: event.target.value }))}
                  placeholder="Event title"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800/50 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-gray-400">
                    <span className="mb-1 block">Start</span>
                    <input
                      type="datetime-local"
                      value={composerDraft.startInput}
                      onChange={(event) => setComposerDraft((draft) => ({ ...draft, startInput: event.target.value }))}
                      className="w-full rounded-lg border border-gray-600 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </label>
                  <label className="text-xs text-gray-400">
                    <span className="mb-1 block">End</span>
                    <input
                      type="datetime-local"
                      value={composerDraft.endInput}
                      onChange={(event) => setComposerDraft((draft) => ({ ...draft, endInput: event.target.value }))}
                      className="w-full rounded-lg border border-gray-600 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={closeComposer}
                    className="px-3 py-2 text-xs text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleCreateEvent()}
                    disabled={isSubmitting}
                    className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Create Event'}
                  </button>
                </div>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto">
              {visibleEvents.length === 0 && !isLoading ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  <div className="text-2xl mb-2">🗓️</div>
                  <div>No upcoming events</div>
                  <div className="text-xs mt-2">Your schedule is clear for the next week.</div>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {visibleEvents.map((event, index) => {
                    const eventType = getCalendarToolbarEventType(event);
                    const attendees = getEventAttendees(event);
                    const isEditing = editingEventId === event.id;

                    return (
                      <div
                        key={event.id}
                        className={`p-3 hover:bg-gray-800/30 transition-colors ${index === 0 ? 'bg-blue-500/5' : ''}`}
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editingDraft.title}
                              onChange={(editEvent) => setEditingDraft((draft) => ({ ...draft, title: editEvent.target.value }))}
                              className="w-full rounded-lg border border-gray-600 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <label className="text-xs text-gray-400">
                                <span className="mb-1 block">Start</span>
                                <input
                                  type="datetime-local"
                                  value={editingDraft.startInput}
                                  onChange={(editEvent) => setEditingDraft((draft) => ({ ...draft, startInput: editEvent.target.value }))}
                                  className="w-full rounded-lg border border-gray-600 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                              </label>
                              <label className="text-xs text-gray-400">
                                <span className="mb-1 block">End</span>
                                <input
                                  type="datetime-local"
                                  value={editingDraft.endInput}
                                  onChange={(editEvent) => setEditingDraft((draft) => ({ ...draft, endInput: editEvent.target.value }))}
                                  className="w-full rounded-lg border border-gray-600 bg-gray-800/50 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                />
                              </label>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={cancelEditing}
                                className="px-3 py-2 text-xs text-gray-300 hover:text-white transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => void handleUpdateEvent()}
                                disabled={busyEventId === event.id}
                                className="rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {busyEventId === event.id ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 flex items-center justify-center bg-gray-800 rounded-lg">
                              <span className="text-sm">{eventTypeIcon(eventType)}</span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-white truncate">
                                  {event.title}
                                </span>
                                {isAssistantGeneratedEvent(event) && (
                                  <span className="text-xs bg-purple-500/20 text-purple-300 px-1 rounded">
                                    AI
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-gray-400 mb-1">
                                {getTimeLabel(event.startTime)} • {formatTime(event.startTime)} - {formatTime(event.endTime)}
                              </div>

                              {attendees.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  👥 {attendees.slice(0, 2).join(', ')}
                                  {attendees.length > 2 && ` +${attendees.length - 2}`}
                                </div>
                              )}

                              {event.provider && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Source: {event.provider}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <div className={`px-2 py-1 rounded text-xs border ${eventTypeColor(eventType)}`}>
                                {eventType}
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <button
                                  onClick={() => startEditing(event)}
                                  className="text-blue-300 hover:text-blue-200 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => void handleDeleteEvent(event.id)}
                                  disabled={busyEventId === event.id}
                                  className="text-red-300 hover:text-red-200 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {busyEventId === event.id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-700/50">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={composerOpen ? closeComposer : openComposer}
                  className="flex items-center gap-2 p-2 bg-gray-800/30 hover:bg-gray-700/50 border border-gray-700/50 rounded text-left transition-colors"
                >
                  <span className="text-sm">➕</span>
                  <span className="text-xs text-gray-300">
                    {composerOpen ? 'Close Composer' : 'Quick Event'}
                  </span>
                </button>
                <button
                  onClick={() => void refreshCalendarPanel()}
                  disabled={isLoading}
                  className="flex items-center gap-2 p-2 bg-gray-800/30 hover:bg-gray-700/50 border border-gray-700/50 rounded text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-sm">↻</span>
                  <span className="text-xs text-gray-300">{isLoading ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 border-t border-gray-700/50 bg-gray-800/30">
              <div className="flex items-center justify-between text-xs text-gray-400 gap-3">
                <div>
                  {connectedProviders.length > 0
                    ? `${connectedProviders.length} calendar sync ${connectedProviders.length === 1 ? 'provider' : 'providers'} connected`
                    : 'No calendar providers connected'}
                </div>
                <div className="text-right">
                  {nextEvent ? (
                    <span className="text-blue-400">Next: {formatTime(nextEvent.startTime)}</span>
                  ) : (
                    <span className="text-green-400">Schedule is clear</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
