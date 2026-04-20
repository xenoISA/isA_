/**
 * Types for the /v1/interactive/* capability router on the isA_Mate gateway
 * (xenoISA/isA_Mate#404). Mirrors the Pydantic DTOs in
 * isa_mate/execution/hil_router.py and the App_SDK InteractiveClient
 * (xenoISA/isA_App_SDK#304).
 *
 * TODO: Replace with `import { ... } from '@isa/transport'` once
 * xenoISA/isA_App_SDK#304 publishes InteractiveClient and its types.
 */

export type InterruptType =
  | 'input_validation'
  | 'tool_authorization'
  | 'review_and_edit'
  | 'approve_reject'
  | 'ask_human'
  | 'input_collection'
  | 'oauth'
  | 'credential_usage';

export type SecurityLevel = 'low' | 'medium' | 'high' | 'critical';
export type ResponseAction = 'continue' | 'skip' | 'reject';
export type ResumeStatus = 'resumed' | 'completed' | 'failed';
export type AuditOutcome = 'approved' | 'rejected' | 'timeout' | 'resumed';

export interface Interrupt {
  id: string;
  type: InterruptType;
  title: string;
  message: string;
  timestamp: string; // ISO8601
  thread_id: string;
  expires_at: string | null;
  security_level: SecurityLevel;
  data: Record<string, unknown>;
}

export interface InterruptListResponse {
  pending: Interrupt[];
  active_sessions: string[];
  next_cursor: string | null;
}

export interface InterruptResponseBody {
  response: unknown;
  metadata?: Record<string, unknown>;
  action?: ResponseAction;
}

export interface ResumeResult {
  session_id: string;
  status: ResumeStatus;
}

export interface ExpiryInfo {
  request_id: string;
  new_expires_at: string;
}

export interface AuditEntry {
  timestamp: string;
  user_id: string;
  response: unknown;
  latency_ms: number;
  outcome: AuditOutcome;
}

export interface InteractiveHealth {
  status: 'healthy' | 'down';
  features: {
    human_in_loop: boolean;
    approval_workflow: boolean;
    tool_authorization: boolean;
  };
  graph_info: {
    durable: boolean;
    total_interrupts: number;
  };
}
