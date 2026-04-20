/**
 * ProactiveService — client for the isA_Mate /v1/proactive/* capability
 * router (xenoISA/isA_Mate#405 / #425). Wraps the HTTP CRUD endpoints
 * plus the /v1/autonomous/events SSE stream.
 *
 * TODO: Replace with `import { ProactiveClient } from '@isa/transport'`
 * once xenoISA/isA_App_SDK#311 publishes.
 */

import { logger, LogCategory } from '../utils/logger';
import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { authTokenStore } from '../stores/authTokenStore';
import type {
  AutonomousFireEvent,
  Trigger,
  TriggerInput,
  TriggerListResponse,
  TriggerPatch,
  TriggerRunListResponse,
  TriggerTestRequest,
  TriggerTestResult,
} from './types/proactive';

export interface ListTriggersOptions {
  cursor?: string;
  limit?: number;
}

export interface ListTriggerRunsOptions {
  cursor?: string;
  limit?: number;
}

export class ProactiveService {
  private getHeaders(operation?: string): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = authTokenStore.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (operation) {
      logger.debug(
        LogCategory.CHAT_FLOW,
        `No auth token for ${operation} — request may 401`,
      );
    }
    return headers;
  }

  async listTriggers(
    opts: ListTriggersOptions = {},
  ): Promise<TriggerListResponse> {
    const qs = new URLSearchParams();
    if (opts.cursor) qs.set('cursor', opts.cursor);
    qs.set('limit', String(opts.limit ?? 50));
    const resp = await fetch(
      `${GATEWAY_ENDPOINTS.MATE.PROACTIVE.TRIGGERS}?${qs.toString()}`,
      { method: 'GET', headers: this.getHeaders('listTriggers') },
    );
    if (!resp.ok) throw new Error(`listTriggers failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async createTrigger(body: TriggerInput): Promise<Trigger> {
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.PROACTIVE.TRIGGERS, {
      method: 'POST',
      headers: this.getHeaders('createTrigger'),
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`createTrigger failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async getTrigger(id: string): Promise<Trigger> {
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.PROACTIVE.TRIGGER(id), {
      method: 'GET',
      headers: this.getHeaders('getTrigger'),
    });
    if (!resp.ok) throw new Error(`getTrigger failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async updateTrigger(id: string, patch: TriggerPatch): Promise<Trigger> {
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.PROACTIVE.TRIGGER(id), {
      method: 'PATCH',
      headers: this.getHeaders('updateTrigger'),
      body: JSON.stringify(patch),
    });
    if (!resp.ok) throw new Error(`updateTrigger failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async deleteTrigger(id: string, opts: { hard?: boolean } = {}): Promise<void> {
    const path = opts.hard
      ? `${GATEWAY_ENDPOINTS.MATE.PROACTIVE.TRIGGER(id)}?hard=true`
      : GATEWAY_ENDPOINTS.MATE.PROACTIVE.TRIGGER(id);
    const resp = await fetch(path, {
      method: 'DELETE',
      headers: this.getHeaders('deleteTrigger'),
    });
    if (!resp.ok && resp.status !== 204) {
      throw new Error(`deleteTrigger failed: ${resp.status} ${resp.statusText}`);
    }
  }

  async testTrigger(
    id: string,
    req: TriggerTestRequest,
  ): Promise<TriggerTestResult> {
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.PROACTIVE.TEST(id), {
      method: 'POST',
      headers: this.getHeaders('testTrigger'),
      body: JSON.stringify(req),
    });
    if (!resp.ok) throw new Error(`testTrigger failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async listRuns(
    id: string,
    opts: ListTriggerRunsOptions = {},
  ): Promise<TriggerRunListResponse> {
    const qs = new URLSearchParams();
    if (opts.cursor) qs.set('cursor', opts.cursor);
    qs.set('limit', String(opts.limit ?? 50));
    const resp = await fetch(
      `${GATEWAY_ENDPOINTS.MATE.PROACTIVE.RUNS(id)}?${qs.toString()}`,
      { method: 'GET', headers: this.getHeaders('listRuns') },
    );
    if (!resp.ok) throw new Error(`listRuns failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  /**
   * Subscribe to trigger fires via /v1/autonomous/events SSE.
   *
   * Returns an unsubscribe function. Browser-native EventSource is
   * used — note that EventSource cannot send custom headers, so the
   * Mate gateway must accept cookies for auth, or the caller must
   * ensure `NEXT_PUBLIC_MATE_URL` points at a deployment where the
   * fire stream is publicly readable per-user (e.g. via a signed URL).
   */
  subscribeToFires(handler: (event: AutonomousFireEvent) => void): () => void {
    if (typeof EventSource === 'undefined') {
      throw new Error(
        'ProactiveService.subscribeToFires requires EventSource (browser env)',
      );
    }
    const source = new EventSource(
      GATEWAY_ENDPOINTS.MATE.AUTONOMOUS_EVENTS,
      { withCredentials: true },
    );
    const listener = (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data) as AutonomousFireEvent;
        handler(payload);
      } catch {
        // Ignore malformed / heartbeat messages
      }
    };
    source.addEventListener('trigger.fired', listener as EventListener);
    return () => {
      source.removeEventListener('trigger.fired', listener as EventListener);
      source.close();
    };
  }
}

export const proactiveService = new ProactiveService();
export default proactiveService;
