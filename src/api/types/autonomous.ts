/**
 * Types for the isA_Mate /v1/autonomous/* capability router
 * (xenoISA/isA_Mate#409 / #429). TODO: import from @isa/transport
 * once xenoISA/isA_App_SDK#313 publishes.
 */

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundJobInput {
  prompt: string;
  schedule?: string;
  idempotency_key?: string;
  metadata?: Record<string, unknown>;
}

export interface BackgroundJob {
  id: string;
  user_id: string;
  prompt: string;
  schedule: string | null;
  idempotency_key: string | null;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  started_at: string | null;
  completed_at: string | null;
  result: Record<string, unknown>;
  error: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown>;
}

export interface BackgroundJobListResponse {
  jobs: BackgroundJob[];
  next_cursor: string | null;
}

export interface ListJobsOptions {
  status?: JobStatus;
  cursor?: string;
  limit?: number;
}
