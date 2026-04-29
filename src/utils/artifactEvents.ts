import type { ArtifactMessage } from '../types/chatTypes';
import type { ArtifactContentType, ArtifactGeneratedFile } from '../types/artifactTypes';

export interface ArtifactEventPayload {
  id?: string;
  title?: string;
  name?: string;
  widgetType?: string;
  widget_type?: string;
  widgetName?: string;
  widget_name?: string;
  version?: number;
  type?: string;
  contentType?: string;
  content_type?: string;
  content?: unknown;
  language?: string;
  filename?: string;
  downloadUrl?: string;
  download_url?: string;
  generatedFiles?: ArtifactGeneratedFile[] | ArtifactEventFilePayload[];
  generated_files?: ArtifactGeneratedFile[] | ArtifactEventFilePayload[];
  files?: ArtifactGeneratedFile[] | ArtifactEventFilePayload[];
  a2uiState?: Record<string, unknown>;
  a2ui_state?: Record<string, unknown>;
  metadata?: Record<string, any>;
}

interface ArtifactEventFilePayload {
  id?: string;
  file_id?: string;
  filename?: string;
  name?: string;
  type?: string;
  file_type?: string;
  size?: number;
  file_size?: number;
  url?: string;
  downloadUrl?: string;
  download_url?: string;
}

const CONTENT_TYPE_ALIASES: Record<string, ArtifactContentType> = {
  code: 'code',
  text: 'text',
  image: 'image',
  html: 'html',
  svg: 'svg',
  data: 'data',
  chart: 'chart',
  form: 'form',
  dashboard: 'dashboard',
  search_results: 'search_results',
  search: 'search_results',
  analysis: 'analysis',
  knowledge: 'knowledge',
  a2ui_surface: 'a2ui_surface',
  a2ui: 'a2ui_surface',
};

export function normalizeArtifactContentType(payload: ArtifactEventPayload): ArtifactContentType {
  const raw = (
    payload.contentType ||
    payload.content_type ||
    payload.type ||
    (payload.a2uiState || payload.a2ui_state ? 'a2ui_surface' : undefined)
  );

  if (typeof raw === 'string' && CONTENT_TYPE_ALIASES[raw]) {
    return CONTENT_TYPE_ALIASES[raw];
  }

  if (payload.language || payload.filename?.match(/\.(tsx|ts|jsx|js|py|rb|go|rs|java|php|c|cpp)$/i)) {
    return 'code';
  }

  return 'text';
}

export function normalizeArtifactGeneratedFiles(payload: ArtifactEventPayload): ArtifactGeneratedFile[] {
  const files = payload.generatedFiles || payload.generated_files || payload.files || [];
  if (!Array.isArray(files)) return [];

  return files
    .map((file, index) => {
      const normalized = file as ArtifactEventFilePayload;
      const filename = normalized.filename || normalized.name;
      const url = normalized.url || normalized.downloadUrl || normalized.download_url;
      if (!filename || !url) return null;

      return {
        id: normalized.id || normalized.file_id || `generated-file-${index}`,
        filename,
        type: normalized.type || normalized.file_type,
        size: normalized.size || normalized.file_size,
        url,
      } satisfies ArtifactGeneratedFile;
    })
    .filter((file): file is ArtifactGeneratedFile => Boolean(file));
}

export function normalizeArtifactContent(payload: ArtifactEventPayload): string {
  if (typeof payload.content === 'string') {
    return payload.content;
  }

  const generatedFiles = normalizeArtifactGeneratedFiles(payload);
  if (generatedFiles.length > 0) {
    return generatedFiles.map(file => file.filename).join('\n');
  }

  if (payload.content == null) {
    return '';
  }

  return JSON.stringify(payload.content, null, 2);
}

export function resolveArtifactVersion(
  payload: ArtifactEventPayload,
  fallbackVersion: number,
): number {
  return typeof payload.version === 'number' && payload.version > 0
    ? payload.version
    : fallbackVersion;
}

export function buildArtifactMessageFromEvent(
  payload: ArtifactEventPayload,
  options: {
    sessionId: string;
    userPrompt: string;
    fallbackVersion: number;
    action: 'created' | 'updated';
  },
): ArtifactMessage | null {
  const artifactId = payload.id;
  if (!artifactId) return null;

  const version = resolveArtifactVersion(payload, options.fallbackVersion);
  const contentType = normalizeArtifactContentType(payload);
  const content = normalizeArtifactContent(payload);
  const generatedFiles = normalizeArtifactGeneratedFiles(payload);
  const filename = payload.filename || payload.name;
  const downloadUrl = payload.downloadUrl || payload.download_url || generatedFiles[0]?.url;
  const widgetType = payload.widgetType || payload.widget_type || 'artifact';
  const widgetName = payload.widgetName || payload.widget_name || payload.title || payload.name || 'Artifact';

  return {
    id: `artifact-msg-${artifactId}-v${version}`,
    type: 'artifact',
    role: 'assistant',
    timestamp: new Date().toISOString(),
    sessionId: options.sessionId,
    userPrompt: options.userPrompt,
    artifact: {
      id: artifactId,
      widgetType,
      widgetName,
      version,
      contentType,
      content,
      language: payload.language,
      filename,
      downloadUrl,
      generatedFiles,
      a2uiState: payload.a2uiState || payload.a2ui_state,
      metadata: {
        ...(payload.metadata || {}),
        action: options.action,
        title: payload.title,
        originalFilename: filename,
      },
    },
  };
}
