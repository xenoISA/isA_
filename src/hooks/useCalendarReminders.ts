/**
 * ============================================================================
 * useCalendarReminders Hook - Connects CalendarReminderService to React
 * ============================================================================
 *
 * Starts monitoring on mount, updates when events change, stops on unmount.
 *
 * Usage:
 *   const { isMonitoring } = useCalendarReminders(userId);
 */

import { useEffect, useRef, useState } from 'react';
import { CalendarReminderService } from '../services/calendarReminderService';
import { useCalendar } from './useCalendar';

export const useCalendarReminders = (userId?: string) => {
  const { events } = useCalendar(userId);
  const serviceRef = useRef<CalendarReminderService | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Instantiate the service once
  useEffect(() => {
    const service = new CalendarReminderService();
    serviceRef.current = service;

    return () => {
      service.stopMonitoring();
      serviceRef.current = null;
    };
  }, []);

  // Start / update monitoring when events change
  useEffect(() => {
    const service = serviceRef.current;
    if (!service || events.length === 0) return;

    if (!service.isMonitoring) {
      service.startMonitoring(events);
      setIsMonitoring(true);
    } else {
      service.updateEvents(events);
    }
  }, [events]);

  return { isMonitoring };
};
