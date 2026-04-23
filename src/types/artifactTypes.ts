/**
 * Unified Artifact Type System (#250)
 *
 * Artifacts are A2UI surfaces with lifecycle management.
 * Every rich interaction an agent generates is an artifact that can be
 * viewed (peek), inspected (panel), interacted with (canvas),
 * versioned, and evolved.
 */

// ============================================================================
// Core Types
// ============================================================================

export type ArtifactContentType =
  | 'code'
  | 'text'
  | 'image'
  | 'html'
  | 'svg'
  | 'data'
  | 'chart'
  | 'form'
  | 'dashboard'
  | 'search_results'
  | 'analysis'
  | 'a2ui_surface';

export type ArtifactLayout = 'peek' | 'inspect' | 'canvas';

export type ArtifactTransformType =
  | 'edit'
  | 'fork'
  | 'export'
  | 'annotate'
  | 'merge';

// ============================================================================
// ArtifactVersion — immutable snapshot of artifact content
// ============================================================================

export interface ArtifactVersion {
  /** Unique version ID */
  versionId: string;
  /** Version number (1, 2, 3...) */
  number: number;
  /** Content at this version */
  content: string;
  /** Content type */
  contentType: ArtifactContentType;
  /** Language hint for code artifacts */
  language?: string;
  /** A2UI surface state (JSON) — if this artifact is a dynamic A2UI surface */
  a2uiState?: Record<string, unknown>;
  /** The instruction that created this version (empty for v1) */
  instruction?: string;
  /** Who created this version */
  createdBy: 'user' | 'agent';
  /** ISO timestamp */
  createdAt: string;
}

// ============================================================================
// ArtifactNode — the artifact entity with version chain
// ============================================================================

export interface ArtifactNode {
  /** Unique artifact ID */
  id: string;
  /** Display title */
  title: string;
  /** Primary content type */
  contentType: ArtifactContentType;
  /** Source widget type (dream, hunt, omni, etc.) — null for pure agent artifacts */
  widgetType?: string;
  /** Filename hint */
  filename?: string;
  /** All versions (ordered, v1 first) */
  versions: ArtifactVersion[];
  /** Currently active version index */
  activeVersionIndex: number;
  /** Parent artifact ID (if forked) */
  parentId?: string;
  /** Session ID this artifact belongs to */
  sessionId?: string;
  /** Message ID that created this artifact */
  sourceMessageId?: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Download URL (if exportable) */
  downloadUrl?: string;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// ArtifactTransform — an operation on an artifact
// ============================================================================

export interface ArtifactTransform {
  type: ArtifactTransformType;
  artifactId: string;
  fromVersionId: string;
  toVersionId?: string;
  instruction?: string;
  timestamp: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Get the active version of an artifact */
export function getActiveVersion(artifact: ArtifactNode): ArtifactVersion {
  return artifact.versions[artifact.activeVersionIndex] || artifact.versions[0];
}

/** Get the latest version of an artifact */
export function getLatestVersion(artifact: ArtifactNode): ArtifactVersion {
  return artifact.versions[artifact.versions.length - 1];
}

/** Get version count */
export function getVersionCount(artifact: ArtifactNode): number {
  return artifact.versions.length;
}

/** Create a new artifact with initial content */
export function createArtifactNode(params: {
  title: string;
  content: string;
  contentType: ArtifactContentType;
  language?: string;
  widgetType?: string;
  filename?: string;
  sessionId?: string;
  sourceMessageId?: string;
  a2uiState?: Record<string, unknown>;
}): ArtifactNode {
  const now = new Date().toISOString();
  const versionId = `v_${Date.now().toString(36)}`;
  return {
    id: `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    title: params.title,
    contentType: params.contentType,
    widgetType: params.widgetType,
    filename: params.filename,
    versions: [{
      versionId,
      number: 1,
      content: params.content,
      contentType: params.contentType,
      language: params.language,
      a2uiState: params.a2uiState,
      createdBy: 'agent',
      createdAt: now,
    }],
    activeVersionIndex: 0,
    sessionId: params.sessionId,
    sourceMessageId: params.sourceMessageId,
    createdAt: now,
    updatedAt: now,
  };
}

/** Add a new version to an artifact */
export function addArtifactVersion(
  artifact: ArtifactNode,
  content: string,
  instruction: string,
  createdBy: 'user' | 'agent' = 'agent',
): ArtifactNode {
  const now = new Date().toISOString();
  const activeVersion = getActiveVersion(artifact);
  const newVersion: ArtifactVersion = {
    versionId: `v_${Date.now().toString(36)}`,
    number: artifact.versions.length + 1,
    content,
    contentType: artifact.contentType,
    language: activeVersion.language,
    a2uiState: activeVersion.a2uiState,
    instruction,
    createdBy,
    createdAt: now,
  };
  return {
    ...artifact,
    versions: [...artifact.versions, newVersion],
    activeVersionIndex: artifact.versions.length, // point to new version
    updatedAt: now,
  };
}
