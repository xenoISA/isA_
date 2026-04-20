/**
 * Types for the isA_Mate /v1/persistence/* capability router
 * (xenoISA/isA_Mate#407 / #427).
 *
 * TODO: Replace with `import { ... } from '@isa/transport'` once
 * xenoISA/isA_App_SDK#312 publishes PersistenceClient.
 */

export interface CheckpointMeta {
  id: string;
  session_id: string;
  created_at: string;
  step: number | null;
  parent_id: string | null;
  summary: string | null;
}

export interface CheckpointPayload {
  id: string;
  session_id: string;
  created_at: string;
  state: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface CheckpointListResponse {
  checkpoints: CheckpointMeta[];
  next_cursor: string | null;
}

export interface RestoreRequest {
  checkpoint_id: string;
  new_session_id?: string;
}

export interface RestoreResult {
  restored_session_id: string;
  from_checkpoint_id: string;
  status: string;
}

export interface KnowledgeItem {
  id: string;
  text: string;
  source: string | null;
  metadata: Record<string, unknown>;
}

export interface KnowledgeListResponse {
  items: KnowledgeItem[];
  next_cursor: string | null;
}

export interface KnowledgeHit {
  id: string;
  text: string;
  similarity_score: number;
  source: string | null;
  metadata: Record<string, unknown>;
}

export interface KnowledgeSearchResponse {
  query: string;
  hits: KnowledgeHit[];
}

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  start_node_id: string;
  end_node_id: string;
  properties: Record<string, unknown>;
}

export interface GraphNeighborhood {
  node: GraphNode;
  neighbors: GraphNode[];
  relationships: GraphRelationship[];
}
