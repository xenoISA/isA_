/**
 * ============================================================================
 * Calendar Service - Using @isa/core SDK
 * ============================================================================
 *
 * Wraps @isa/core CalendarService with auth token injection and gateway routing.
 *
 * Architecture:
 *   Frontend → Gateway(9080) → Calendar Microservice(8215)
 *
 * Supports:
 *   - Event CRUD (create, get, update, delete)
 *   - Event listing with date-range queries
 *   - Upcoming events
 *   - External calendar sync (Google/Apple/Outlook)
 *   - Convenience helpers (today, this week, this month)
 */

import {
  CalendarService as CoreCalendarService,
  CalendarTypes,
  RecurrenceType,
  EventCategory,
  SyncProvider,
} from '@isa/core';
import { GATEWAY_ENDPOINTS, getAuthHeaders } from '../config/gatewayConfig';
import { logger, LogCategory } from '../utils/logger';

// Re-export SDK types for consumer convenience
export type CalendarEvent = CalendarTypes.CalendarEvent;
export type CreateEventRequest = CalendarTypes.CreateEventRequest;
export type UpdateEventRequest = CalendarTypes.UpdateEventRequest;
export type EventQueryParams = CalendarTypes.EventQueryParams;
export type EventResponse = CalendarTypes.EventResponse;
export type EventListResponse = CalendarTypes.EventListResponse;
export type SyncStatusResponse = CalendarTypes.SyncStatusResponse;
export type DeleteEventResponse = CalendarTypes.DeleteEventResponse;

export { RecurrenceType, EventCategory, SyncProvider };

// ================================================================================
// CalendarService Wrapper
// ================================================================================

export class CalendarService {
  private coreCalendarService: CoreCalendarService;

  private getAuthHeadersFn?: () => Promise<Record<string, string>>;

  /** Resolves when initial auth setup is complete */
  private authReady: Promise<void>;

  constructor(getAuthHeadersFn?: () => Promise<Record<string, string>>) {
    // Pass the calendar-service-scoped gateway URL to the SDK.
    // The gateway routes /{service}/... to the backend, so the SDK's base URL
    // must include the service prefix (e.g. http://localhost:9080/api/v1/calendar).
    this.coreCalendarService = new CoreCalendarService(GATEWAY_ENDPOINTS.CALENDAR.BASE);

    this.getAuthHeadersFn = getAuthHeadersFn;

    // Initialize auth: prefer async fn, fallback to in-memory token store.
    this.authReady = this.initAuth();

    logger.info(LogCategory.API_REQUEST, 'CalendarService initialized with @isa/core SDK');
  }

  // ================================================================================
  // Auth Helpers
  // ================================================================================

  /**
   * Run initial auth setup — called once from the constructor.
   * Never rejects so the constructor promise does not produce unhandled rejections.
   */
  private async initAuth(): Promise<void> {
    try {
      if (this.getAuthHeadersFn) {
        try {
          const headers = await this.getAuthHeadersFn();
          const authHeader = headers['Authorization'];
          if (authHeader) {
            this.coreCalendarService.setAuthToken(authHeader.replace('Bearer ', ''));
            return;
          }
        } catch (err) {
          logger.warn(LogCategory.API_REQUEST, 'Async auth init failed, falling back to token store', { error: err });
        }
      }

      // Synchronous fallback: read token from in-memory store
      const headers = getAuthHeaders();
      const authHeader = headers['Authorization'];
      if (authHeader) {
        this.coreCalendarService.setAuthToken(authHeader.replace('Bearer ', ''));
      }
    } catch (err) {
      logger.error(LogCategory.API_REQUEST, 'CalendarService initAuth failed entirely', { error: err });
    }
  }

  /** Wait for initial auth to complete before making API calls */
  private async ensureAuth(): Promise<void> {
    await this.authReady;
  }

  /** Refresh the SDK auth token from current state (or custom fn) */
  async refreshAuth(): Promise<void> {
    if (this.getAuthHeadersFn) {
      const headers = await this.getAuthHeadersFn();
      const authHeader = headers['Authorization'];
      if (authHeader) {
        this.coreCalendarService.setAuthToken(authHeader.replace('Bearer ', ''));
        return;
      }
    }
    const headers = getAuthHeaders();
    const authHeader = headers['Authorization'];
    if (authHeader) {
      this.coreCalendarService.setAuthToken(authHeader.replace('Bearer ', ''));
    } else {
      this.coreCalendarService.clearAuth();
    }
  }

  // ================================================================================
  // Event CRUD
  // ================================================================================

  /**
   * Create a calendar event
   */
  async createEvent(request: CalendarTypes.CreateEventRequest): Promise<CalendarTypes.CalendarEvent> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Creating calendar event', { title: request.title, user_id: request.user_id });

      if (!request.user_id) {
        throw new Error('user_id is required to create a calendar event');
      }

      const event = await this.coreCalendarService.createEvent(request);

      logger.info(LogCategory.API_REQUEST, 'Calendar event created', { event_id: event.event_id });
      return event;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to create calendar event', { error });
      throw error;
    }
  }

  /**
   * Get a single event by ID
   */
  async getEvent(eventId: string, userId?: string): Promise<CalendarTypes.CalendarEvent> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Getting calendar event', { eventId, userId });

      const event = await this.coreCalendarService.getEvent(eventId, userId);
      return event;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get calendar event', { error, eventId });
      throw error;
    }
  }

  /**
   * Update an existing event
   */
  async updateEvent(
    eventId: string,
    userId: string,
    updates: CalendarTypes.UpdateEventRequest
  ): Promise<CalendarTypes.CalendarEvent> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Updating calendar event', { eventId, userId });

      const event = await this.coreCalendarService.updateEvent(eventId, userId, updates);

      logger.info(LogCategory.API_REQUEST, 'Calendar event updated', { event_id: event.event_id });
      return event;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to update calendar event', { error, eventId });
      throw error;
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, userId: string): Promise<CalendarTypes.DeleteEventResponse> {
    await this.ensureAuth();
    try {
      logger.info(LogCategory.API_REQUEST, 'Deleting calendar event', { eventId, userId });

      const result = await this.coreCalendarService.deleteEvent(eventId, userId);
      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to delete calendar event', { error, eventId });
      throw error;
    }
  }

  // ================================================================================
  // Event Queries
  // ================================================================================

  /**
   * List events with optional filters (date range, category, pagination)
   */
  async listEvents(params: CalendarTypes.EventQueryParams): Promise<{
    events: CalendarTypes.CalendarEvent[];
    total: number;
    page: number;
    page_size: number;
  }> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Listing calendar events', {
        user_id: params.user_id,
        start_date: params.start_date,
        end_date: params.end_date,
        category: params.category,
      });

      const result = await this.coreCalendarService.queryEvents(params);
      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to list calendar events', { error });
      throw error;
    }
  }

  /**
   * Get upcoming events for a user within the next N days
   */
  async getUpcomingEvents(userId: string, days: number = 7): Promise<CalendarTypes.CalendarEvent[]> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Getting upcoming events', { userId, days });

      const events = await this.coreCalendarService.getUpcomingEvents(userId, days);
      return events;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get upcoming events', { error, userId });
      throw error;
    }
  }

  /**
   * Get events within a specific date range
   */
  async getEventsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarTypes.CalendarEvent[]> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Getting events by date range', {
        userId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const events = await this.coreCalendarService.getEventsByDateRange(userId, startDate, endDate);
      return events;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get events by date range', { error, userId });
      throw error;
    }
  }

  /**
   * Get today's events for a user
   */
  async getTodayEvents(userId: string): Promise<CalendarTypes.CalendarEvent[]> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Getting today events', { userId });

      const events = await this.coreCalendarService.getTodayEvents(userId);
      return events;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get today events', { error, userId });
      throw error;
    }
  }

  /**
   * Get this week's events for a user
   */
  async getWeekEvents(userId: string): Promise<CalendarTypes.CalendarEvent[]> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Getting week events', { userId });

      const events = await this.coreCalendarService.getWeekEvents(userId);
      return events;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get week events', { error, userId });
      throw error;
    }
  }

  /**
   * Get this month's events for a user
   */
  async getMonthEvents(userId: string): Promise<CalendarTypes.CalendarEvent[]> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Getting month events', { userId });

      const events = await this.coreCalendarService.getMonthEvents(userId);
      return events;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get month events', { error, userId });
      throw error;
    }
  }

  // ================================================================================
  // Calendar Sync
  // ================================================================================

  /**
   * Sync with an external calendar provider
   */
  async syncCalendar(
    userId: string,
    provider: 'google' | 'apple' | 'outlook'
  ): Promise<CalendarTypes.SyncStatusResponse> {
    await this.ensureAuth();
    try {
      logger.info(LogCategory.API_REQUEST, 'Syncing calendar', { userId, provider });

      const result = await this.coreCalendarService.syncCalendar(userId, provider);
      return result;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to sync calendar', { error, userId, provider });
      throw error;
    }
  }

  /**
   * Get sync status for a user
   */
  async getSyncStatus(userId: string): Promise<CalendarTypes.SyncStatusResponse> {
    await this.ensureAuth();
    try {
      logger.debug(LogCategory.API_REQUEST, 'Getting sync status', { userId });

      const status = await this.coreCalendarService.getSyncStatus(userId);
      return status;
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Failed to get sync status', { error, userId });
      throw error;
    }
  }

  // ================================================================================
  // Utility
  // ================================================================================

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    try {
      logger.debug(LogCategory.API_REQUEST, 'Performing calendar service health check');

      const headers = getAuthHeaders();
      const response = await fetch(GATEWAY_ENDPOINTS.CALENDAR.HEALTH, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...headers },
      });

      if (!response.ok) {
        throw new Error(`Health check returned ${response.status}`);
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'CalendarService',
      };
    } catch (error) {
      logger.error(LogCategory.API_REQUEST, 'Calendar health check failed', { error });
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'CalendarService',
      };
    }
  }
}

// ================================================================================
// Export Functions and Default Instance
// ================================================================================

/**
 * Create authenticated CalendarService
 */
export const createAuthenticatedCalendarService = (
  getAuthHeadersFn?: () => Promise<Record<string, string>>
): CalendarService => {
  return new CalendarService(getAuthHeadersFn);
};

// Lazy-initialized default instance — uses in-memory token store fallback.
// For authenticated requests within React components, prefer
// createAuthenticatedCalendarService(getAuthHeadersFn) instead.
let _defaultInstance: CalendarService | null = null;
export const getCalendarService = (): CalendarService => {
  if (!_defaultInstance) {
    _defaultInstance = createAuthenticatedCalendarService();
  }
  return _defaultInstance;
};

export default CalendarService;
