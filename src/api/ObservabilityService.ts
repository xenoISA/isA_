/**
 * ObservabilityService — client for the isA_Mate /v1/observability/*
 * capability router (xenoISA/isA_Mate#406 / #426). Powers the cost
 * badge + audit drawer surfaces.
 *
 * TODO: Replace with `import { ObservabilityClient } from '@isa/transport'`
 * once xenoISA/isA_App_SDK#311 publishes.
 */

import { logger, LogCategory } from '../utils/logger';
import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { authTokenStore } from '../stores/authTokenStore';
import type {
  AuditFilter,
  AuditListResponse,
  ExecutionMetrics,
  MetricsFilter,
} from './types/observability';

export class ObservabilityService {
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

  async getMetrics(filter: MetricsFilter = {}): Promise<ExecutionMetrics> {
    const qs = new URLSearchParams();
    if (filter.since) qs.set('since', toISO(filter.since));
    if (filter.until) qs.set('until', toISO(filter.until));
    if (filter.agent_id) qs.set('agent_id', filter.agent_id);
    if (filter.session_id) qs.set('session_id', filter.session_id);
    const path = qs.toString()
      ? `${GATEWAY_ENDPOINTS.MATE.OBSERVABILITY.METRICS}?${qs.toString()}`
      : GATEWAY_ENDPOINTS.MATE.OBSERVABILITY.METRICS;
    const resp = await fetch(path, {
      method: 'GET',
      headers: this.getHeaders('getMetrics'),
    });
    if (!resp.ok) throw new Error(`getMetrics failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async getAudit(filter: AuditFilter = {}): Promise<AuditListResponse> {
    const qs = new URLSearchParams();
    if (filter.action) qs.set('action', filter.action);
    if (filter.since) qs.set('since', toISO(filter.since));
    if (filter.until) qs.set('until', toISO(filter.until));
    if (filter.session_id) qs.set('session_id', filter.session_id);
    qs.set('limit', String(filter.limit ?? 100));
    if (filter.cursor) qs.set('cursor', filter.cursor);
    const resp = await fetch(
      `${GATEWAY_ENDPOINTS.MATE.OBSERVABILITY.AUDIT}?${qs.toString()}`,
      { method: 'GET', headers: this.getHeaders('getAudit') },
    );
    if (!resp.ok) throw new Error(`getAudit failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }
}

function toISO(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

export const observabilityService = new ObservabilityService();
export default observabilityService;
