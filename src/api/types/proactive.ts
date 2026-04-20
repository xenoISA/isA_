/**
 * Types for the isA_Mate /v1/proactive/* capability router
 * (xenoISA/isA_Mate#405 / #425). Mirrors the Pydantic DTOs in
 * isa_mate/execution/proactive_router.py and the TypeScript types in
 * @isa/transport's ProactiveClient (xenoISA/isA_App_SDK#311).
 *
 * TODO: Replace with `import { ... } from '@isa/transport'` once
 * @isa/transport publishes ProactiveClient.
 */

export type TriggerType = 'cron' | 'webhook' | 'threshold' | 'event';

export interface TriggerInput {
  type: TriggerType;
  name: string;
  condition?: Record<string, unknown>;
  action_prompt: string;
  enabled?: boolean;
}

export interface Trigger {
  id: string;
  type: TriggerType;
  name: string;
  condition: Record<string, unknown>;
  action_prompt: string;
  enabled: boolean;
  created_at: string;
  next_fire: string | null;
  last_result: Record<string, unknown> | null;
}

export interface TriggerListResponse {
  triggers: Trigger[];
  next_cursor: string | null;
}

export interface TriggerPatch {
  name?: string;
  condition?: Record<string, unknown>;
  action_prompt?: string;
  enabled?: boolean;
}

export interface TriggerTestRequest {
  mock_event: Record<string, unknown>;
  apply_rate_limit?: boolean;
}

export interface TriggerTestResult {
  would_fire: boolean;
  reason: string;
  resolved_prompt: string;
  matched_conditions: Record<string, unknown>;
}

export interface TriggerRun {
  id: string;
  trigger_id: string;
  fired_at: string;
  session_id: string | null;
  result: Record<string, unknown>;
  duration_ms: number | null;
  error: string | null;
}

export interface TriggerRunListResponse {
  runs: TriggerRun[];
  next_cursor: string | null;
}

export interface AutonomousFireEvent {
  trigger_id: string;
  fire_reason: string;
  session_id: string;
  timestamp: string;
}
