/**
 * ============================================================================
 * Mate Service (mateService.ts) - isA_Mate REST API Client
 * ============================================================================
 *
 * Core Responsibilities:
 * - Uses BaseApiService for robust network transport
 * - Provides REST client for Mate's health, memory, scheduler, and tools endpoints
 * - All requests route through the gateway (or direct NEXT_PUBLIC_MATE_URL)
 *
 * Architecture:
 * - Transport: BaseApiService with retry/timeout/auth
 * - Types: src/types/mateTypes.ts
 * - Endpoints: GATEWAY_ENDPOINTS.MATE.*
 */

import { BaseApiService } from './BaseApiService';
import { GATEWAY_ENDPOINTS, buildUrlWithParams } from '../config/gatewayConfig';
import { createLogger, LogCategory } from '../utils/logger';
import type {
  MateHealthResponse,
  MateMemorySession,
  MateMemoryMessage,
  MateMemorySessionsResponse,
  MateMemoryMessagesResponse,
  MateKnowledgeItem,
  MateKnowledgeResponse,
  MateSchedulerJob,
  MateJobRun,
  MateSchedulerJobsResponse,
  CreateSchedulerJobData,
  MateTool,
  MateToolsResponse,
} from '../types/mateTypes';

const log = createLogger('MateService', LogCategory.API_REQUEST);

// ================================================================================
// MateService Class
// ================================================================================

export class MateService {
  private apiService: BaseApiService;

  constructor(getAuthHeaders?: () => Promise<Record<string, string>>) {
    this.apiService = new BaseApiService(
      GATEWAY_ENDPOINTS.MATE.BASE,
      undefined,
      getAuthHeaders
    );
    log.info('MateService initialized');
  }

  // ================================================================================
  // Health
  // ================================================================================

  /**
   * Check Mate health status including stack health and channels.
   */
  async healthCheck(): Promise<MateHealthResponse> {
    try {
      log.info('Checking Mate health');
      const response = await this.apiService.get<MateHealthResponse>(
        GATEWAY_ENDPOINTS.MATE.HEALTH
      );
      if (!response.success) {
        throw new Error(response.error || 'Health check failed');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Mate health check failed', { error: msg });
      throw new Error(`Mate health check failed: ${msg}`);
    }
  }

  /**
   * Fire-and-forget warmup ping — primes Mate's RuntimeContextHelper cache
   * so the user's first message doesn't pay a 10-15s cold-start cost.
   *
   * Contract: MUST NOT throw. Older Mate versions without the endpoint
   * return 404 — treated as a no-op. Network errors are swallowed.
   */
  async triggerWarmup(): Promise<void> {
    try {
      log.info('Warming up Mate backend');
      const response = await this.apiService.post<unknown>(
        GATEWAY_ENDPOINTS.MATE.CONTEXT_WARMUP,
        {}
      );
      if (response.success) return;
      if (response.statusCode === 404) {
        log.info('Mate warmup endpoint not available (404) — skipping');
        return;
      }
      log.warn('Mate warmup non-success', { statusCode: response.statusCode, error: response.error });
    } catch (error) {
      log.warn('Mate warmup threw (ignored)', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ================================================================================
  // Memory — Sessions & Messages
  // ================================================================================

  /**
   * List memory sessions.
   */
  async listSessions(): Promise<MateMemorySession[]> {
    try {
      log.info('Fetching Mate memory sessions');
      const response = await this.apiService.get<MateMemorySessionsResponse>(
        GATEWAY_ENDPOINTS.MATE.MEMORY.SESSIONS
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch sessions');
      }
      // Handle both array and wrapped responses
      const data = response.data;
      if (Array.isArray(data)) return data;
      return data?.sessions ?? [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch Mate sessions', { error: msg });
      throw new Error(`Fetch Mate sessions failed: ${msg}`);
    }
  }

  /**
   * Get messages for a specific session.
   */
  async getSessionMessages(sessionId: string): Promise<MateMemoryMessage[]> {
    try {
      log.info('Fetching Mate session messages', { sessionId });
      const url = buildUrlWithParams(
        GATEWAY_ENDPOINTS.MATE.MEMORY.SESSION_MESSAGES,
        { sessionId }
      );
      const response = await this.apiService.get<MateMemoryMessagesResponse>(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch session messages');
      }
      const data = response.data;
      if (Array.isArray(data)) return data;
      return data?.messages ?? [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch Mate session messages', { error: msg, sessionId });
      throw new Error(`Fetch Mate session messages failed: ${msg}`);
    }
  }

  // ================================================================================
  // Knowledge — Facts, Preferences, Patterns
  // ================================================================================

  /**
   * List knowledge items (facts, preferences, patterns) Mate has learned about the user.
   */
  async listKnowledge(): Promise<MateKnowledgeItem[]> {
    try {
      log.info('Fetching Mate knowledge items');
      const response = await this.apiService.get<MateKnowledgeResponse>(
        GATEWAY_ENDPOINTS.MATE.MEMORY.KNOWLEDGE
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch knowledge');
      }
      const data = response.data;
      if (Array.isArray(data)) return data;
      return data?.items ?? [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch Mate knowledge', { error: msg });
      throw new Error(`Fetch Mate knowledge failed: ${msg}`);
    }
  }

  /**
   * Delete a specific knowledge item by ID.
   */
  async deleteKnowledgeItem(itemId: string): Promise<void> {
    try {
      log.info('Deleting Mate knowledge item', { itemId });
      const url = buildUrlWithParams(
        GATEWAY_ENDPOINTS.MATE.MEMORY.KNOWLEDGE_ITEM,
        { itemId }
      );
      const response = await this.apiService.delete(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete knowledge item');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to delete Mate knowledge item', { error: msg, itemId });
      throw new Error(`Delete Mate knowledge item failed: ${msg}`);
    }
  }

  // ================================================================================
  // Scheduler — Jobs
  // ================================================================================

  /**
   * List scheduled jobs.
   */
  async listJobs(): Promise<MateSchedulerJob[]> {
    try {
      log.info('Fetching Mate scheduler jobs');
      const response = await this.apiService.get<MateSchedulerJobsResponse>(
        GATEWAY_ENDPOINTS.MATE.SCHEDULER.JOBS
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch scheduler jobs');
      }
      const data = response.data;
      if (Array.isArray(data)) return data;
      return data?.jobs ?? [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch Mate scheduler jobs', { error: msg });
      throw new Error(`Fetch Mate scheduler jobs failed: ${msg}`);
    }
  }

  /**
   * Create a new scheduled job.
   */
  async createJob(jobData: CreateSchedulerJobData): Promise<MateSchedulerJob> {
    try {
      log.info('Creating Mate scheduler job', { name: jobData.name });
      const response = await this.apiService.post<MateSchedulerJob>(
        GATEWAY_ENDPOINTS.MATE.SCHEDULER.JOBS,
        jobData
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to create scheduler job');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to create Mate scheduler job', { error: msg });
      throw new Error(`Create Mate scheduler job failed: ${msg}`);
    }
  }

  /**
   * Manually trigger a scheduled job.
   */
  async triggerJob(jobId: string): Promise<MateJobRun> {
    try {
      log.info('Triggering Mate scheduler job', { jobId });
      const url = buildUrlWithParams(
        GATEWAY_ENDPOINTS.MATE.SCHEDULER.JOB_RUN,
        { jobId }
      );
      const response = await this.apiService.post<MateJobRun>(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to trigger scheduler job');
      }
      return response.data!;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to trigger Mate scheduler job', { error: msg, jobId });
      throw new Error(`Trigger Mate scheduler job failed: ${msg}`);
    }
  }

  /**
   * Delete a scheduled job.
   */
  async deleteJob(jobId: string): Promise<void> {
    try {
      log.info('Deleting Mate scheduler job', { jobId });
      const url = buildUrlWithParams(
        GATEWAY_ENDPOINTS.MATE.SCHEDULER.JOB,
        { jobId }
      );
      const response = await this.apiService.delete(url);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete scheduler job');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to delete Mate scheduler job', { error: msg, jobId });
      throw new Error(`Delete Mate scheduler job failed: ${msg}`);
    }
  }

  // ================================================================================
  // Tools
  // ================================================================================

  /**
   * List available tools.
   */
  async listTools(): Promise<MateTool[]> {
    try {
      log.info('Fetching Mate tools');
      const response = await this.apiService.get<MateToolsResponse>(
        GATEWAY_ENDPOINTS.MATE.TOOLS
      );
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch tools');
      }
      const data = response.data;
      if (Array.isArray(data)) return data;
      return data?.tools ?? [];
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.error('Failed to fetch Mate tools', { error: msg });
      throw new Error(`Fetch Mate tools failed: ${msg}`);
    }
  }
}

// ================================================================================
// Export Functions and Default Instance
// ================================================================================

/**
 * Create authenticated MateService
 */
export const createAuthenticatedMateService = (
  getAuthHeadersFn?: () => Promise<Record<string, string>>
): MateService => {
  return new MateService(getAuthHeadersFn);
};

// Lazy-initialized default instance
let _defaultInstance: MateService | null = null;
export const getMateService = (): MateService => {
  if (!_defaultInstance) {
    _defaultInstance = createAuthenticatedMateService();
  }
  return _defaultInstance;
};

export default MateService;
