/**
 * ObservabilityService — client for the isA_Mate /v1/observability/*
 * capability router (xenoISA/isA_Mate#406 / #426). Powers the cost
 * badge + audit drawer surfaces.
 */

import { HttpClient, ObservabilityClient } from '@isa/transport';
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
  private createClient(operation?: string): ObservabilityClient {
    return new ObservabilityClient(
      new HttpClient({
        baseURL: GATEWAY_ENDPOINTS.MATE.BASE,
        headers: this.getHeaders(operation),
      }),
    );
  }

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
    return this.createClient('getMetrics').getMetrics(filter);
  }

  async getAudit(filter: AuditFilter = {}): Promise<AuditListResponse> {
    return this.createClient('getAudit').getAudit(filter);
  }
}

export const observabilityService = new ObservabilityService();
export default observabilityService;
