/**
 * Types for the isA_Mate /v1/observability/* capability router
 * (xenoISA/isA_Mate#406 / #426).
 */

export interface TokenUsage {
  input: number;
  output: number;
}

export interface ExecutionMetrics {
  nodes_executed: number;
  tool_calls: number;
  model_calls: number;
  tokens_used: TokenUsage;
  cost_usd: number;
  window_start: string | null;
  window_end: string | null;
}

export type ObservabilityAuditOutcome = 'success' | 'failure' | 'unknown';

export interface ObservabilityAuditEntry {
  timestamp: string;
  action: string;
  user_id: string;
  result: ObservabilityAuditOutcome;
  cost_usd: number | null;
  session_id: string | null;
  metadata: Record<string, unknown>;
}

export interface AuditListResponse {
  entries: ObservabilityAuditEntry[];
  total: number;
  next_cursor: string | null;
}

export interface MetricsFilter {
  since?: string | Date;
  until?: string | Date;
  agent_id?: string;
  session_id?: string;
}

export interface AuditFilter {
  action?: string;
  since?: string | Date;
  until?: string | Date;
  session_id?: string;
  limit?: number;
  cursor?: string;
}
