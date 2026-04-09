/**
 * useAgentIntegration — Bridge hook connecting Mate SSE events to @isa/hooks
 *
 * Creates an AgentStateMachine, wires it to useAgentEvents from @isa/hooks,
 * and exposes a feedEvent() function for the existing MateEventAdapter to
 * push SSE events into the SDK state machine.
 *
 * This is an incremental adoption bridge — it coexists alongside existing
 * Zustand stores (useChatStore, useAppStore) without replacing them.
 *
 * Usage:
 *   const { state, isLoading, isWaiting, hasError, feedEvent } = useAgentIntegration();
 *   // In your SSE handler:
 *   feedEvent("content.token", { tool: "search" });
 */

import { useMemo, useCallback } from 'react';
import { createAgentStateMachine } from '@isa/core';
import type { AgentStateMachine } from '@isa/core';
import { useAgentEvents } from '@isa/hooks';
import type { UseAgentEventsReturn } from '@isa/hooks';

export interface UseAgentIntegrationOptions {
  /** Callback when agent enters thinking state */
  onThinking?: () => void;
  /** Callback when agent enters acting state (tool use) */
  onActing?: () => void;
  /** Callback when agent is waiting for human input */
  onWaiting?: () => void;
  /** Callback when agent completes */
  onDone?: () => void;
  /** Callback when agent errors */
  onError?: () => void;
}

export interface UseAgentIntegrationReturn extends UseAgentEventsReturn {
  /** Push a raw SSE event type into the state machine */
  feedEvent: (eventType: string, metadata?: Record<string, unknown>) => void;
  /** The underlying state machine instance */
  stateMachine: AgentStateMachine;
}

/**
 * Bridge hook: creates a local AgentStateMachine and exposes it via
 * useAgentEvents. Call feedEvent() from your existing MateEventAdapter
 * to drive state transitions.
 */
export function useAgentIntegration(
  options: UseAgentIntegrationOptions = {},
): UseAgentIntegrationReturn {
  const stateMachine = useMemo(() => createAgentStateMachine(), []);

  const agentEvents = useAgentEvents({
    stateMachine,
    onThinking: options.onThinking ? () => options.onThinking!() : undefined,
    onActing: options.onActing ? () => options.onActing!() : undefined,
    onWaiting: options.onWaiting ? () => options.onWaiting!() : undefined,
    onDone: options.onDone ? () => options.onDone!() : undefined,
    onError: options.onError ? () => options.onError!() : undefined,
  });

  const feedEvent = useCallback(
    (eventType: string, metadata?: Record<string, unknown>) => {
      stateMachine.handleSSEEvent(eventType, metadata);
    },
    [stateMachine],
  );

  return {
    ...agentEvents,
    feedEvent,
    stateMachine,
  };
}

export default useAgentIntegration;
