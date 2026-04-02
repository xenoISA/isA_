/**
 * ============================================================================
 * Mate Types - TypeScript types for isA_Mate REST API responses
 * ============================================================================
 *
 * Covers: health, memory, scheduler, and tools endpoints.
 * Used by mateService.ts for type-safe API interactions.
 */

// ================================================================================
// Health
// ================================================================================

export interface MateStackHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | string;
  latency_ms?: number;
  details?: Record<string, unknown>;
}

export interface MateHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy' | string;
  version?: string;
  uptime_seconds?: number;
  stack?: MateStackHealth[];
  channels?: string[];
  timestamp?: string;
}

// ================================================================================
// Memory — Sessions & Messages
// ================================================================================

export interface MateMemorySession {
  session_id: string;
  user_id?: string;
  title?: string;
  created_at: string;
  updated_at?: string;
  message_count?: number;
  metadata?: Record<string, unknown>;
}

export interface MateMemoryMessage {
  message_id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
  tokens_used?: number;
}

export interface MateMemorySessionsResponse {
  sessions: MateMemorySession[];
  total: number;
}

export interface MateMemoryMessagesResponse {
  messages: MateMemoryMessage[];
  total: number;
}

// ================================================================================
// Scheduler — Jobs
// ================================================================================

export interface MateSchedulerJob {
  job_id: string;
  name: string;
  description?: string;
  cron_expression?: string;
  enabled: boolean;
  created_at: string;
  updated_at?: string;
  last_run_at?: string;
  next_run_at?: string;
  metadata?: Record<string, unknown>;
}

export interface MateJobRun {
  run_id: string;
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | string;
  started_at: string;
  completed_at?: string;
  result?: unknown;
  error?: string;
}

export interface CreateSchedulerJobData {
  name: string;
  description?: string;
  cron_expression?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MateSchedulerJobsResponse {
  jobs: MateSchedulerJob[];
  total: number;
}

// ================================================================================
// Tools
// ================================================================================

export interface MateTool {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  category?: string;
  enabled?: boolean;
}

export interface MateToolsResponse {
  tools: MateTool[];
  total: number;
}
