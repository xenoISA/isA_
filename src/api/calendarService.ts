/**
 * ============================================================================
 * Calendar Service - Using @isa/core SDK
 * ============================================================================
 *
 * SDK-backed wrapper for calendar event operations. Mirrors the SessionService
 * integration pattern: initialize the SDK client once, inject auth headers
 * from the app, and keep app-side logging/error handling local.
 */

import {
  CalendarService as CoreCalendarService,
  EventCategory,
  RecurrenceType,
  SyncProvider,
} from '@isa/core';
import type { CalendarTypes } from '@isa/core';

import { GATEWAY_CONFIG, getAuthHeaders } from '../config/gatewayConfig';
import { createLogger, LogCategory } from '../utils/logger';

const log = createLogger('CalendarService', LogCategory.API_REQUEST);

export type CalendarEvent = CalendarTypes.CalendarEvent;
export type CreateEventRequest = CalendarTypes.CreateEventRequest;
export type UpdateEventRequest = CalendarTypes.UpdateEventRequest;
export type EventQueryParams = CalendarTypes.EventQueryParams;
export type DeleteEventResponse = CalendarTypes.DeleteEventResponse;
export type EventListResponse = {
  events: CalendarEvent[];
  total: number;
  page: number;
  page_size: number;
};
export type SyncStatusResponse = CalendarTypes.SyncStatusResponse;

export { EventCategory, RecurrenceType, SyncProvider };

type AuthHeaders = Record<string, string>;
type GetAuthHeadersFn = () => Promise<AuthHeaders> | AuthHeaders;

function extractBearerToken(headers: AuthHeaders | undefined): string | null {
  const authHeader = headers?.Authorization;
  if (!authHeader) return null;
  return authHeader.replace(/^Bearer\s+/i, '');
}

export class CalendarService {
  private readonly coreCalendarService: CoreCalendarService;
  private readonly getAuthHeadersFn?: GetAuthHeadersFn;
  private readonly authReady: Promise<void>;

  constructor(baseUrl: string = GATEWAY_CONFIG.BASE_URL, getAuthHeadersFn?: GetAuthHeadersFn) {
    this.coreCalendarService = new CoreCalendarService(baseUrl);
    this.getAuthHeadersFn = getAuthHeadersFn;
    this.authReady = this.initAuth();

    log.info('Initialized SDK-backed calendar service', { baseUrl });
  }

  private async initAuth(): Promise<void> {
    try {
      await this.refreshAuth();
    } catch (error) {
      log.error('Initial calendar auth setup failed', { error });
    }
  }

  private async ensureAuth(): Promise<void> {
    await this.authReady;
    await this.refreshAuth();
  }

  async refreshAuth(): Promise<void> {
    try {
      const headers = this.getAuthHeadersFn
        ? await this.getAuthHeadersFn()
        : getAuthHeaders();
      const token = extractBearerToken(headers);

      if (token) {
        this.coreCalendarService.setAuthToken(token);
      } else {
        this.coreCalendarService.clearAuth();
      }
    } catch (error) {
      log.warn('Refreshing calendar auth failed', { error });
      this.coreCalendarService.clearAuth();
    }
  }

  async createEvent(request: CreateEventRequest): Promise<CalendarEvent> {
    await this.ensureAuth();
    try {
      log.debug('Creating calendar event', {
        userId: request.user_id,
        title: request.title,
      });
      return await this.coreCalendarService.createEvent(request);
    } catch (error) {
      log.error('Failed to create calendar event', {
        userId: request.user_id,
        title: request.title,
        error,
      });
      throw error;
    }
  }

  async getEvent(eventId: string, userId?: string): Promise<CalendarEvent> {
    await this.ensureAuth();
    try {
      log.debug('Fetching calendar event', { eventId, userId });
      return await this.coreCalendarService.getEvent(eventId, userId);
    } catch (error) {
      log.error('Failed to fetch calendar event', { eventId, userId, error });
      throw error;
    }
  }

  async updateEvent(
    eventId: string,
    userId: string,
    updates: UpdateEventRequest,
  ): Promise<CalendarEvent> {
    await this.ensureAuth();
    try {
      log.debug('Updating calendar event', { eventId, userId });
      return await this.coreCalendarService.updateEvent(eventId, userId, updates);
    } catch (error) {
      log.error('Failed to update calendar event', { eventId, userId, error });
      throw error;
    }
  }

  async deleteEvent(eventId: string, userId: string): Promise<DeleteEventResponse> {
    await this.ensureAuth();
    try {
      log.debug('Deleting calendar event', { eventId, userId });
      return await this.coreCalendarService.deleteEvent(eventId, userId);
    } catch (error) {
      log.error('Failed to delete calendar event', { eventId, userId, error });
      throw error;
    }
  }

  async listEvents(params: EventQueryParams): Promise<EventListResponse> {
    await this.ensureAuth();
    try {
      log.debug('Listing calendar events', {
        userId: params.user_id,
        startDate: params.start_date,
        endDate: params.end_date,
      });
      return await this.coreCalendarService.queryEvents(params);
    } catch (error) {
      log.error('Failed to list calendar events', {
        userId: params.user_id,
        error,
      });
      throw error;
    }
  }

  async getEventsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    await this.ensureAuth();
    try {
      log.debug('Fetching events by date range', { userId, startDate, endDate });
      return await this.coreCalendarService.getEventsByDateRange(userId, startDate, endDate);
    } catch (error) {
      log.error('Failed to fetch events by date range', {
        userId,
        startDate,
        endDate,
        error,
      });
      throw error;
    }
  }

  async getTodayEvents(userId: string): Promise<CalendarEvent[]> {
    await this.ensureAuth();
    try {
      log.debug('Fetching today calendar events', { userId });
      return await this.coreCalendarService.getTodayEvents(userId);
    } catch (error) {
      log.error('Failed to fetch today calendar events', { userId, error });
      throw error;
    }
  }

  async getWeekEvents(userId: string): Promise<CalendarEvent[]> {
    await this.ensureAuth();
    try {
      log.debug('Fetching week calendar events', { userId });
      return await this.coreCalendarService.getWeekEvents(userId);
    } catch (error) {
      log.error('Failed to fetch week calendar events', { userId, error });
      throw error;
    }
  }

  async getMonthEvents(userId: string): Promise<CalendarEvent[]> {
    await this.ensureAuth();
    try {
      log.debug('Fetching month calendar events', { userId });
      return await this.coreCalendarService.getMonthEvents(userId);
    } catch (error) {
      log.error('Failed to fetch month calendar events', { userId, error });
      throw error;
    }
  }

  async syncCalendar(
    userId: string,
    provider: 'google' | 'apple' | 'outlook',
  ): Promise<SyncStatusResponse> {
    await this.ensureAuth();
    try {
      log.debug('Syncing calendar provider', { userId, provider });
      return await this.coreCalendarService.syncCalendar(userId, provider);
    } catch (error) {
      log.error('Failed to sync calendar provider', { userId, provider, error });
      throw error;
    }
  }

  async getSyncStatus(userId: string): Promise<SyncStatusResponse> {
    await this.ensureAuth();
    try {
      log.debug('Fetching calendar sync status', { userId });
      return await this.coreCalendarService.getSyncStatus(userId);
    } catch (error) {
      log.error('Failed to fetch calendar sync status', { userId, error });
      throw error;
    }
  }
}
