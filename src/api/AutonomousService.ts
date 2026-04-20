/**
 * AutonomousService — client for the isA_Mate /v1/autonomous/*
 * capability router (xenoISA/isA_Mate#409 / #429). Surfaces
 * background-job management in the UI (async-task panel, chat-side
 * "running in background" badges).
 *
 * TODO: Replace with `import { AutonomousClient } from '@isa/transport'`
 * once xenoISA/isA_App_SDK#313 publishes.
 */

import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { authTokenStore } from '../stores/authTokenStore';
import type {
  BackgroundJob,
  BackgroundJobInput,
  BackgroundJobListResponse,
  ListJobsOptions,
} from './types/autonomous';

export class AutonomousService {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = authTokenStore.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async enqueueJob(input: BackgroundJobInput): Promise<BackgroundJob> {
    if (!input.prompt || input.prompt.trim().length === 0) {
      throw new RangeError('enqueueJob: prompt must be non-empty');
    }
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.AUTONOMOUS.JOBS, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    if (!resp.ok) throw new Error(`enqueueJob failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async listJobs(opts: ListJobsOptions = {}): Promise<BackgroundJobListResponse> {
    const qs = new URLSearchParams();
    if (opts.status) qs.set('status', opts.status);
    if (opts.cursor) qs.set('cursor', opts.cursor);
    qs.set('limit', String(opts.limit ?? 50));
    const resp = await fetch(
      `${GATEWAY_ENDPOINTS.MATE.AUTONOMOUS.JOBS}?${qs.toString()}`,
      { method: 'GET', headers: this.getHeaders() },
    );
    if (!resp.ok) throw new Error(`listJobs failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async getJob(jobId: string): Promise<BackgroundJob> {
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.AUTONOMOUS.JOB(jobId), {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!resp.ok) throw new Error(`getJob failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async cancelJob(jobId: string): Promise<BackgroundJob> {
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.AUTONOMOUS.JOB(jobId), {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!resp.ok) throw new Error(`cancelJob failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }
}

export const autonomousService = new AutonomousService();
export default autonomousService;
