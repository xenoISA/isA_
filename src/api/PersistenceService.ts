/**
 * PersistenceService — client for the isA_Mate /v1/persistence/*
 * capability router (xenoISA/isA_Mate#407 / #427). Powers the
 * checkpoint restore (`/restore`) slash command + Cmd+K semantic
 * memory lookup + graph view.
 *
 * TODO: Replace with `import { PersistenceClient } from '@isa/transport'`
 * once xenoISA/isA_App_SDK#312 publishes.
 */

import { logger, LogCategory } from '../utils/logger';
import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { authTokenStore } from '../stores/authTokenStore';
import type {
  CheckpointListResponse,
  CheckpointPayload,
  GraphNeighborhood,
  KnowledgeListResponse,
  KnowledgeSearchResponse,
  RestoreResult,
} from './types/persistence';

export class PersistenceService {
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

  async listCheckpoints(sessionId: string): Promise<CheckpointListResponse> {
    const qs = new URLSearchParams({ session_id: sessionId });
    const resp = await fetch(
      `${GATEWAY_ENDPOINTS.MATE.PERSISTENCE.CHECKPOINTS}?${qs.toString()}`,
      { method: 'GET', headers: this.getHeaders('listCheckpoints') },
    );
    if (!resp.ok) throw new Error(`listCheckpoints failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async getCheckpoint(checkpointId: string): Promise<CheckpointPayload> {
    const resp = await fetch(
      GATEWAY_ENDPOINTS.MATE.PERSISTENCE.CHECKPOINT(checkpointId),
      { method: 'GET', headers: this.getHeaders('getCheckpoint') },
    );
    if (!resp.ok) throw new Error(`getCheckpoint failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async restore(checkpointId: string, newSessionId?: string): Promise<RestoreResult> {
    const body: Record<string, unknown> = { checkpoint_id: checkpointId };
    if (newSessionId) body.new_session_id = newSessionId;
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.PERSISTENCE.RESTORE, {
      method: 'POST',
      headers: this.getHeaders('restore'),
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`restore failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async listKnowledge(opts: { cursor?: string; limit?: number } = {}): Promise<KnowledgeListResponse> {
    const qs = new URLSearchParams();
    if (opts.cursor) qs.set('cursor', opts.cursor);
    qs.set('limit', String(opts.limit ?? 50));
    const resp = await fetch(
      `${GATEWAY_ENDPOINTS.MATE.PERSISTENCE.KNOWLEDGE}?${qs.toString()}`,
      { method: 'GET', headers: this.getHeaders('listKnowledge') },
    );
    if (!resp.ok) throw new Error(`listKnowledge failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async searchKnowledge(query: string, opts: { limit?: number } = {}): Promise<KnowledgeSearchResponse> {
    if (!query || query.trim().length === 0) {
      throw new RangeError('searchKnowledge: query must not be empty');
    }
    const qs = new URLSearchParams({ q: query });
    qs.set('limit', String(opts.limit ?? 10));
    const resp = await fetch(
      `${GATEWAY_ENDPOINTS.MATE.PERSISTENCE.KNOWLEDGE_SEARCH}?${qs.toString()}`,
      { method: 'GET', headers: this.getHeaders('searchKnowledge') },
    );
    if (!resp.ok) throw new Error(`searchKnowledge failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async getGraphNode(nodeId: string, opts: { depth?: number } = {}): Promise<GraphNeighborhood> {
    const depth = opts.depth ?? 1;
    if (!Number.isInteger(depth) || depth < 1 || depth > 3) {
      throw new RangeError(`getGraphNode: depth must be integer in [1, 3], got ${depth}`);
    }
    const qs = new URLSearchParams({ depth: String(depth) });
    const resp = await fetch(
      `${GATEWAY_ENDPOINTS.MATE.PERSISTENCE.GRAPH_NODE(nodeId)}?${qs.toString()}`,
      { method: 'GET', headers: this.getHeaders('getGraphNode') },
    );
    if (!resp.ok) throw new Error(`getGraphNode failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }
}

export const persistenceService = new PersistenceService();
export default persistenceService;
