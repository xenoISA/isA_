/**
 * Types for the isA_Mate /v1/responsive/stream/{session_id} SSE
 * endpoint (xenoISA/isA_Mate#408 / #428).
 *
 * TODO: Replace with `import { ... } from '@isa/transport'` once
 * xenoISA/isA_App_SDK#312 publishes ResponsiveClient.
 */

export interface ResponsiveEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  duration_ms: number | null;
  node_name: string | null;
}

export interface SubscribeOptions {
  baseURL?: string;
  lastEventId?: string;
}
