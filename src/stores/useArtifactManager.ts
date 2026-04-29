/**
 * useArtifactManager — Central artifact state management (#250)
 *
 * Replaces useArtifactStore with version-aware, A2UI-native artifact management.
 * All artifacts flow through this store — widgets create, panel displays, chat previews.
 */
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import type {
  ArtifactNode,
  ArtifactContentType,
} from '../types/artifactTypes';
import type { ArtifactMessage } from '../types/chatTypes';
import {
  createArtifactNode,
  addArtifactVersion,
  getActiveVersion,
} from '../types/artifactTypes';

interface ArtifactManagerState {
  /** All artifacts indexed by ID */
  artifacts: Record<string, ArtifactNode>;
  /** Currently open artifact ID (shown in panel) */
  openArtifactId: string | null;
  /** Panel layout mode */
  panelLayout: 'closed' | 'inspect' | 'canvas';
}

interface ArtifactManagerActions {
  /** Create a new artifact and return its ID */
  createArtifact: (params: {
    title: string;
    content: string;
    contentType: ArtifactContentType;
    language?: string;
    widgetType?: string;
    id?: string;
    filename?: string;
    downloadUrl?: string;
    generatedFiles?: import('../types/artifactTypes').ArtifactGeneratedFile[];
    sessionId?: string;
    sourceMessageId?: string;
    a2uiState?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }) => string;

  /** Add a new version to an existing artifact */
  addVersion: (artifactId: string, content: string, instruction: string) => void;

  /** Sync an artifact message from the chat stream into the manager */
  syncArtifactMessage: (message: ArtifactMessage) => string | null;

  /** Set the active version index */
  setActiveVersion: (artifactId: string, versionIndex: number) => void;

  /** Fork an artifact (creates a copy with parentId link) */
  forkArtifact: (artifactId: string) => string | null;

  /** Open an artifact in the panel */
  openArtifact: (artifactId: string, layout?: 'inspect' | 'canvas') => void;

  /** Close the artifact panel */
  closePanel: () => void;

  /** Remove an artifact */
  removeArtifact: (artifactId: string) => void;

  /** Get an artifact by ID */
  getArtifact: (artifactId: string) => ArtifactNode | undefined;

  /** Get all artifacts for a session */
  getSessionArtifacts: (sessionId: string) => ArtifactNode[];
}

type ArtifactManagerStore = ArtifactManagerState & ArtifactManagerActions;

export const ARTIFACT_MANAGER_STORAGE_KEY = 'isa-artifact-manager';

export const useArtifactManager = create<ArtifactManagerStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        artifacts: {},
        openArtifactId: null,
        panelLayout: 'closed',

        createArtifact: (params) => {
          const node = createArtifactNode(params);
          set(state => ({
            artifacts: { ...state.artifacts, [node.id]: node },
          }));
          return node.id;
        },

        addVersion: (artifactId, content, instruction) => {
          set(state => {
            const artifact = state.artifacts[artifactId];
            if (!artifact) return state;
            const updated = addArtifactVersion(artifact, content, instruction);
            return {
              artifacts: { ...state.artifacts, [artifactId]: updated },
            };
          });
        },

        syncArtifactMessage: (message) => {
          const streamArtifact = message.artifact;
          if (!streamArtifact?.id) return null;

          const content = typeof streamArtifact.content === 'string'
            ? streamArtifact.content
            : JSON.stringify(streamArtifact.content, null, 2);

          const existing = get().artifacts[streamArtifact.id];
          if (!existing) {
            const node = createArtifactNode({
              id: streamArtifact.id,
              title: streamArtifact.widgetName || streamArtifact.filename || 'Artifact',
              content,
              contentType: streamArtifact.contentType,
              language: streamArtifact.language,
              widgetType: streamArtifact.widgetType,
              filename: streamArtifact.filename,
              downloadUrl: streamArtifact.downloadUrl,
              generatedFiles: streamArtifact.generatedFiles,
              sessionId: message.sessionId,
              sourceMessageId: message.id,
              a2uiState: streamArtifact.a2uiState,
              metadata: streamArtifact.metadata,
            });

            set(state => ({
              artifacts: { ...state.artifacts, [node.id]: node },
            }));
            return node.id;
          }

          const activeVersion = getActiveVersion(existing);
          const incomingVersion = streamArtifact.version || existing.versions.length;
          const shouldAddVersion =
            incomingVersion > existing.versions.length ||
            content !== activeVersion.content ||
            streamArtifact.downloadUrl !== activeVersion.downloadUrl ||
            JSON.stringify(streamArtifact.generatedFiles || []) !== JSON.stringify(activeVersion.generatedFiles || []);

          set(state => {
            const current = state.artifacts[streamArtifact.id];
            if (!current) return state;

            const updated = shouldAddVersion
              ? addArtifactVersion(
                  current,
                  content,
                  String(streamArtifact.metadata?.instruction || streamArtifact.metadata?.action || 'Artifact updated'),
                  'agent',
                  {
                    contentType: streamArtifact.contentType,
                    language: streamArtifact.language,
                    filename: streamArtifact.filename,
                    downloadUrl: streamArtifact.downloadUrl,
                    generatedFiles: streamArtifact.generatedFiles,
                    a2uiState: streamArtifact.a2uiState,
                  },
                )
              : {
                  ...current,
                  title: streamArtifact.widgetName || current.title,
                  contentType: streamArtifact.contentType || current.contentType,
                  widgetType: streamArtifact.widgetType || current.widgetType,
                  filename: streamArtifact.filename || current.filename,
                  downloadUrl: streamArtifact.downloadUrl || current.downloadUrl,
                  generatedFiles: streamArtifact.generatedFiles || current.generatedFiles,
                  sourceMessageId: message.id,
                  metadata: {
                    ...(current.metadata || {}),
                    ...(streamArtifact.metadata || {}),
                  },
                  updatedAt: new Date().toISOString(),
                };

            return {
              artifacts: { ...state.artifacts, [streamArtifact.id]: updated },
            };
          });

          return streamArtifact.id;
        },

        setActiveVersion: (artifactId, versionIndex) => {
          set(state => {
            const artifact = state.artifacts[artifactId];
            if (!artifact || versionIndex < 0 || versionIndex >= artifact.versions.length) return state;
            return {
              artifacts: {
                ...state.artifacts,
                [artifactId]: { ...artifact, activeVersionIndex: versionIndex },
              },
            };
          });
        },

        forkArtifact: (artifactId) => {
          const artifact = get().artifacts[artifactId];
          if (!artifact) return null;
          const activeVersion = getActiveVersion(artifact);
          const forked = createArtifactNode({
            title: `${artifact.title} (fork)`,
            content: activeVersion.content,
            contentType: artifact.contentType,
            language: activeVersion.language,
            widgetType: artifact.widgetType,
            filename: activeVersion.filename || artifact.filename,
            downloadUrl: activeVersion.downloadUrl || artifact.downloadUrl,
            generatedFiles: activeVersion.generatedFiles || artifact.generatedFiles,
            sessionId: artifact.sessionId,
            a2uiState: activeVersion.a2uiState,
            metadata: artifact.metadata,
          });
          const forkedWithParent = { ...forked, parentId: artifactId };
          set(state => ({
            artifacts: { ...state.artifacts, [forkedWithParent.id]: forkedWithParent },
          }));
          return forkedWithParent.id;
        },

        openArtifact: (artifactId, layout = 'inspect') => {
          set({ openArtifactId: artifactId, panelLayout: layout });
        },

        closePanel: () => {
          set({ openArtifactId: null, panelLayout: 'closed' });
        },

        removeArtifact: (artifactId) => {
          set(state => {
            const { [artifactId]: _, ...rest } = state.artifacts;
            return {
              artifacts: rest,
              openArtifactId: state.openArtifactId === artifactId ? null : state.openArtifactId,
              panelLayout: state.openArtifactId === artifactId ? 'closed' : state.panelLayout,
            };
          });
        },

        getArtifact: (artifactId) => get().artifacts[artifactId],

        getSessionArtifacts: (sessionId) =>
          Object.values(get().artifacts).filter(a => a.sessionId === sessionId),
      }),
      {
        name: ARTIFACT_MANAGER_STORAGE_KEY,
        partialize: state => ({ artifacts: state.artifacts }),
      },
    ),
  )
);

// Selectors
export const useOpenArtifact = () => {
  const id = useArtifactManager(s => s.openArtifactId);
  const artifacts = useArtifactManager(s => s.artifacts);
  return id ? artifacts[id] : null;
};

export const usePanelLayout = () => useArtifactManager(s => s.panelLayout);
export const useArtifactActions = () => useArtifactManager(s => ({
  createArtifact: s.createArtifact,
  addVersion: s.addVersion,
  syncArtifactMessage: s.syncArtifactMessage,
  setActiveVersion: s.setActiveVersion,
  forkArtifact: s.forkArtifact,
  openArtifact: s.openArtifact,
  closePanel: s.closePanel,
  removeArtifact: s.removeArtifact,
}));
