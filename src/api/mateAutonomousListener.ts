/**
 * ============================================================================
 * MateAutonomousListener — Background event listener for Mate
 * ============================================================================
 *
 * Connects to Mate's autonomous events endpoint (WebSocket with SSE fallback)
 * to receive background messages — scheduled task results, trigger responses,
 * and channel notifications — without requiring an active chat session.
 *
 * Events are inserted into the chat timeline via useChatStore.insertAutonomousMessage()
 * so they appear alongside user-initiated messages.
 *
 * Lifecycle:
 *   start()  — called once when the app mounts (via ChatModule useEffect)
 *   stop()   — called on unmount or when the user logs out
 *
 * Reconnection:
 *   Automatically reconnects with exponential back-off (1s -> 2s -> 4s ... 30s).
 *   Does NOT interfere with active chat streaming — uses a separate connection.
 */

import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { authTokenStore } from '../stores/authTokenStore';
import { useChatStore } from '../stores/useChatStore';
import { createLogger, LogCategory } from '../utils/logger';
import type { AutonomousSource } from '../types/chatTypes';

const log = createLogger('MateAutonomousListener', LogCategory.CHAT_FLOW);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of an autonomous event pushed by Mate */
export interface MateAutonomousEvent {
  /** Event kind: task_completed, trigger_fired, channel_message, etc. */
  type: string;
  /** Human-readable content to display in the chat timeline */
  content: string;
  /** What triggered this event */
  source: AutonomousSource;
  /** ISO timestamp of the original occurrence */
  occurred_at: string;
  /** Additional metadata from the trigger/scheduler system */
  metadata?: {
    schedule_name?: string;
    trigger_type?: string;
    outcome?: string;
    [key: string]: unknown;
  };
}

// ---------------------------------------------------------------------------
// Listener singleton
// ---------------------------------------------------------------------------

class MateAutonomousListenerService {
  private eventSource: EventSource | null = null;
  private running = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000; // starts at 1s
  private static readonly MAX_RECONNECT_DELAY = 30_000;
  private static readonly MAX_RECONNECT_ATTEMPTS = 5;
  private reconnectAttempts = 0;

  /** Start listening for autonomous events. Safe to call multiple times. */
  start(): void {
    if (this.running) {
      log.debug('Listener already running, skipping start');
      return;
    }
    this.running = true;
    this.connect();
    log.info('Autonomous listener started');
  }

  /** Stop listening and tear down the connection. */
  stop(): void {
    this.running = false;
    this.cleanup();
    log.info('Autonomous listener stopped');
  }

  // -------------------------------------------------------------------------
  // Connection management
  // -------------------------------------------------------------------------

  private connect(): void {
    if (!this.running) return;

    const token = authTokenStore.getToken();
    if (!token) {
      log.warn('No auth token — will retry in 5s');
      this.scheduleReconnect(5000);
      return;
    }

    // Build the autonomous events SSE endpoint via gateway config.
    const url = `${GATEWAY_ENDPOINTS.MATE.AUTONOMOUS_EVENTS}?token=${encodeURIComponent(token)}`;

    try {
      const es = new EventSource(url);

      es.onopen = () => {
        log.info('Connected to Mate autonomous events stream');
        this.reconnectDelay = 1000; // reset back-off on success
      };

      es.onmessage = (event) => {
        this.handleRawEvent(event.data);
      };

      // Named event types that Mate may emit
      es.addEventListener('task_completed', (event: MessageEvent) => {
        this.handleRawEvent(event.data);
      });
      es.addEventListener('trigger_fired', (event: MessageEvent) => {
        this.handleRawEvent(event.data);
      });
      es.addEventListener('channel_message', (event: MessageEvent) => {
        this.handleRawEvent(event.data);
      });

      es.onerror = () => {
        log.warn('Autonomous events connection error — will reconnect');
        this.cleanup();
        this.scheduleReconnect();
      };

      this.eventSource = es;
    } catch (err) {
      log.error('Failed to create EventSource', err);
      this.scheduleReconnect();
    }
  }

  private handleRawEvent(data: string): void {
    if (!data || data === '[DONE]') return;

    try {
      const event: MateAutonomousEvent = JSON.parse(data);
      this.dispatchToStore(event);
    } catch (err) {
      log.warn('Failed to parse autonomous event', { data, err });
    }
  }

  private dispatchToStore(event: MateAutonomousEvent): void {
    const { insertAutonomousMessage } = useChatStore.getState();

    // Build a human-readable message with trigger context
    const triggerLabel = event.metadata?.schedule_name
      || event.metadata?.trigger_type
      || event.type;
    const prefix = `[${triggerLabel}] `;
    const content = `${prefix}${event.content}`;

    // Pass occurred_at as completedAt so the timeline card can display it.
    // Falls back to current time inside the store if occurred_at is absent.
    insertAutonomousMessage(
      content,
      event.source || 'scheduler',
      event.occurred_at || new Date().toISOString(),
    );

    log.debug('Autonomous event dispatched to store', {
      type: event.type,
      source: event.source,
      completedAt: event.occurred_at,
    });
  }

  // -------------------------------------------------------------------------
  // Reconnect with exponential back-off
  // -------------------------------------------------------------------------

  private scheduleReconnect(overrideDelay?: number): void {
    if (!this.running) return;

    this.reconnectAttempts++;
    if (this.reconnectAttempts > MateAutonomousListenerService.MAX_RECONNECT_ATTEMPTS) {
      log.warn(`Autonomous events: giving up after ${this.reconnectAttempts} failed attempts`);
      this.running = false;
      return;
    }

    const delay = overrideDelay ?? this.reconnectDelay;
    log.debug(`Scheduling reconnect in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // Exponential back-off (capped)
      if (!overrideDelay) {
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          MateAutonomousListenerService.MAX_RECONNECT_DELAY,
        );
      }
      this.connect();
    }, delay);
  }

  private cleanup(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Export a singleton instance
export const mateAutonomousListener = new MateAutonomousListenerService();
