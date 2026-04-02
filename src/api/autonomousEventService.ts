/**
 * ============================================================================
 * Autonomous Event Service — Background SSE listener for Mate autonomous events
 * ============================================================================
 *
 * Connects to Mate's autonomous events SSE endpoint to receive background
 * messages (scheduled task results, trigger responses, channel notifications)
 * without requiring an active user prompt or chat session.
 *
 * This service runs in the background when the app mounts and is NOT tied to
 * the active chat conversation. When autonomous events arrive, they are
 * inserted into the chat store via insertAutonomousMessage() so they appear
 * in the timeline alongside user-initiated messages.
 *
 * Usage:
 *   import { autonomousEventService } from './autonomousEventService';
 *   // On app mount:
 *   autonomousEventService.start();
 *   // On app unmount / logout:
 *   autonomousEventService.stop();
 *
 * Reconnection:
 *   Automatically reconnects with exponential back-off (1s -> 2s -> 4s ... 30s).
 *   Uses a separate connection from the chat SSE stream.
 */

export {
  mateAutonomousListener as autonomousEventService,
  type MateAutonomousEvent,
} from './mateAutonomousListener';
