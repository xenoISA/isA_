import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

type ArtifactManagerModule = typeof import('../useArtifactManager');
type ArtifactTypesModule = typeof import('../../types/artifactTypes');

let useArtifactManager: ArtifactManagerModule['useArtifactManager'];
let getActiveVersion: ArtifactTypesModule['getActiveVersion'];
let artifactManagerStorageKey: string;

async function loadArtifactManager() {
  vi.resetModules();
  vi.stubGlobal('localStorage', localStorageMock);

  const artifactManagerModule = await import('../useArtifactManager');
  const artifactTypesModule = await import('../../types/artifactTypes');

  useArtifactManager = artifactManagerModule.useArtifactManager;
  artifactManagerStorageKey = artifactManagerModule.ARTIFACT_MANAGER_STORAGE_KEY;
  getActiveVersion = artifactTypesModule.getActiveVersion;

  await (useArtifactManager as any).persist?.rehydrate?.();
}

function createA2UISurface() {
  const surfaceState = {
    surfaceId: 'surface_trip_plan',
    phase: 'streaming',
    components: [
      { id: 'summary', type: 'text', value: 'Draft itinerary' },
    ],
  };

  const artifactId = useArtifactManager.getState().createArtifact({
    title: 'Trip planner',
    content: '{"title":"Draft itinerary"}',
    contentType: 'a2ui_surface',
    sessionId: 'session-1',
    sourceMessageId: 'msg-1',
    a2uiState: surfaceState,
  });

  return { artifactId, surfaceState };
}

async function flushAsyncWork() {
  await Promise.resolve();
  await new Promise(resolve => setTimeout(resolve, 0));
}

describe('useArtifactManager', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorageMock.clear();
    await loadArtifactManager();
    useArtifactManager.setState({
      artifacts: {},
      openArtifactId: null,
      panelLayout: 'closed',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test('creates an A2UI surface artifact with initial state and shared panel identity', () => {
    const { artifactId, surfaceState } = createA2UISurface();
    const artifact = useArtifactManager.getState().getArtifact(artifactId);

    expect(artifact).toBeDefined();
    expect(artifact?.sourceMessageId).toBe('msg-1');
    expect(getActiveVersion(artifact!).a2uiState).toEqual(surfaceState);

    useArtifactManager.getState().openArtifact(artifactId, 'inspect');
    expect(useArtifactManager.getState().openArtifactId).toBe(artifactId);
    expect(useArtifactManager.getState().panelLayout).toBe('inspect');

    useArtifactManager.getState().openArtifact(artifactId, 'canvas');
    expect(useArtifactManager.getState().openArtifactId).toBe(artifactId);
    expect(useArtifactManager.getState().panelLayout).toBe('canvas');
    expect(useArtifactManager.getState().getSessionArtifacts('session-1')).toHaveLength(1);
  });

  test('adds immutable versions for artifact edits without mutating history', () => {
    const { artifactId, surfaceState } = createA2UISurface();
    const original = useArtifactManager.getState().getArtifact(artifactId)!;
    const originalVersion = { ...original.versions[0] };

    useArtifactManager
      .getState()
      .addVersion(artifactId, '{"title":"Updated itinerary"}', 'Make the itinerary actionable');

    const updated = useArtifactManager.getState().getArtifact(artifactId)!;
    expect(updated.versions).toHaveLength(2);
    expect(updated.activeVersionIndex).toBe(1);
    expect(updated.versions[0]).toEqual(originalVersion);
    expect(updated.versions[0].content).toBe('{"title":"Draft itinerary"}');
    expect(updated.versions[0].a2uiState).toEqual(surfaceState);
    expect(updated.versions[1]).toMatchObject({
      number: 2,
      content: '{"title":"Updated itinerary"}',
      contentType: 'a2ui_surface',
      instruction: 'Make the itinerary actionable',
      createdBy: 'agent',
      a2uiState: surfaceState,
    });
  });

  test('forks from the active version while preserving the A2UI surface state', () => {
    const { artifactId, surfaceState } = createA2UISurface();
    useArtifactManager
      .getState()
      .addVersion(artifactId, '{"title":"Updated itinerary"}', 'Make the itinerary actionable');

    const forkedId = useArtifactManager.getState().forkArtifact(artifactId);
    const forked = forkedId ? useArtifactManager.getState().getArtifact(forkedId) : undefined;

    expect(forkedId).toBeTruthy();
    expect(forked).toBeDefined();
    expect(forked?.parentId).toBe(artifactId);
    expect(forked?.versions).toHaveLength(1);
    expect(forked?.versions[0]).toMatchObject({
      number: 1,
      content: '{"title":"Updated itinerary"}',
      contentType: 'a2ui_surface',
      a2uiState: surfaceState,
    });
  });

  test('persists artifact versions across store reloads', async () => {
    const { artifactId, surfaceState } = createA2UISurface();
    useArtifactManager
      .getState()
      .addVersion(artifactId, '{"title":"Updated itinerary"}', 'Make the itinerary actionable');

    const stored = localStorageMock.getItem(artifactManagerStorageKey);
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).state.artifacts[artifactId].versions).toHaveLength(2);

    await loadArtifactManager();

    const restored = useArtifactManager.getState().getArtifact(artifactId);
    expect(restored).toBeDefined();
    expect(restored?.versions).toHaveLength(2);
    expect(restored?.activeVersionIndex).toBe(1);
    expect(restored?.versions[0].a2uiState).toEqual(surfaceState);
    expect(restored?.versions[1]).toMatchObject({
      content: '{"title":"Updated itinerary"}',
      instruction: 'Make the itinerary actionable',
      a2uiState: surfaceState,
    });
  });

  test('registers completed chat A2UI artifact messages with surface state', async () => {
    const { useChatStore } = await import('../useChatStore');
    const surfaceState = {
      surfaceId: 'surface_from_mate',
      phase: 'complete',
      components: [{ id: 'answer', type: 'markdown', value: 'Ready' }],
    };

    useChatStore.setState({
      messages: [],
      streamingBuffers: {},
      streamingLastFlush: {},
    });

    useChatStore.getState().addMessage({
      id: 'msg-a2ui',
      type: 'artifact',
      role: 'assistant',
      content: 'Generated Mate surface',
      timestamp: '2026-04-23T08:00:00.000Z',
      userPrompt: 'Build an interactive answer',
      artifact: {
        id: 'artifact-a2ui',
        widgetType: 'mate',
        widgetName: 'Mate Surface',
        version: 1,
        contentType: 'a2ui_surface',
        content: { title: 'Interactive answer' },
        a2uiState: surfaceState,
      },
      isStreaming: false,
    } as any);

    await flushAsyncWork();

    const artifact = Object.values(useArtifactManager.getState().artifacts).find(
      node => node.sourceMessageId === 'msg-a2ui',
    );

    expect(artifact).toBeDefined();
    expect(artifact?.contentType).toBe('a2ui_surface');
    expect(getActiveVersion(artifact!).content).toBe(JSON.stringify({ title: 'Interactive answer' }, null, 2));
    expect(getActiveVersion(artifact!).a2uiState).toEqual(surfaceState);
  }, 15000);

  test('syncArtifactMessage creates artifacts with backend file metadata', () => {
    const artifactId = useArtifactManager.getState().syncArtifactMessage({
      id: 'artifact-msg-art-1-v1',
      type: 'artifact',
      role: 'assistant',
      timestamp: '2026-04-29T00:00:00Z',
      sessionId: 'session-1',
      userPrompt: 'Create a report',
      artifact: {
        id: 'art-1',
        widgetType: 'artifact',
        widgetName: 'Quarterly Report',
        version: 1,
        contentType: 'code',
        content: 'export default function App() { return <div>v1</div>; }',
        language: 'tsx',
        filename: 'Report.tsx',
        downloadUrl: 'http://localhost:4100/__artifacts/report-v1.pdf',
        generatedFiles: [
          {
            id: 'file-v1',
            filename: 'report-v1.pdf',
            type: 'pdf',
            url: 'http://localhost:4100/__artifacts/report-v1.pdf',
          },
        ],
      },
    });

    expect(artifactId).toBe('art-1');
    const artifact = useArtifactManager.getState().getArtifact('art-1');
    expect(artifact?.filename).toBe('Report.tsx');
    expect(artifact?.downloadUrl).toBe('http://localhost:4100/__artifacts/report-v1.pdf');
    expect(getActiveVersion(artifact!).generatedFiles?.[0]?.filename).toBe('report-v1.pdf');
  });

  test('syncArtifactMessage appends a new version for backend artifact updates', () => {
    const store = useArtifactManager.getState();

    store.syncArtifactMessage({
      id: 'artifact-msg-art-2-v1',
      type: 'artifact',
      role: 'assistant',
      timestamp: '2026-04-29T00:00:00Z',
      sessionId: 'session-1',
      userPrompt: 'Create a todo component',
      artifact: {
        id: 'art-2',
        widgetType: 'artifact',
        widgetName: 'Todo Component',
        version: 1,
        contentType: 'code',
        content: 'export default function App() { return <main>v1</main>; }',
        language: 'tsx',
      },
    });

    store.syncArtifactMessage({
      id: 'artifact-msg-art-2-v2',
      type: 'artifact',
      role: 'assistant',
      timestamp: '2026-04-29T00:01:00Z',
      sessionId: 'session-1',
      userPrompt: 'Add dark mode',
      artifact: {
        id: 'art-2',
        widgetType: 'artifact',
        widgetName: 'Todo Component',
        version: 2,
        contentType: 'code',
        content: 'export default function App() { return <main className="dark">v2</main>; }',
        language: 'tsx',
        generatedFiles: [
          {
            id: 'file-v2',
            filename: 'todo-v2.pdf',
            type: 'pdf',
            url: 'http://localhost:4100/__artifacts/todo-v2.pdf',
          },
        ],
      },
    });

    const artifact = store.getArtifact('art-2');
    expect(artifact?.versions).toHaveLength(2);
    expect(getActiveVersion(artifact!).content).toContain('className="dark"');
    expect(getActiveVersion(artifact!).generatedFiles?.[0]?.filename).toBe('todo-v2.pdf');
  });

  test('syncArtifactMessage does not duplicate versions when the same backend update is replayed', () => {
    const store = useArtifactManager.getState();
    const updateMessage = {
      id: 'artifact-msg-art-3-v2',
      type: 'artifact' as const,
      role: 'assistant' as const,
      timestamp: '2026-04-29T00:01:00Z',
      sessionId: 'session-1',
      userPrompt: 'Refine the document',
      artifact: {
        id: 'art-3',
        widgetType: 'artifact',
        widgetName: 'Refined Document',
        version: 2,
        contentType: 'text' as const,
        content: 'Version 2 body',
      },
    };

    store.syncArtifactMessage({
      ...updateMessage,
      id: 'artifact-msg-art-3-v1',
      artifact: {
        ...updateMessage.artifact,
        version: 1,
        content: 'Version 1 body',
      },
    });
    store.syncArtifactMessage(updateMessage);
    store.syncArtifactMessage(updateMessage);

    const artifact = store.getArtifact('art-3');
    expect(artifact?.versions).toHaveLength(2);
    expect(getActiveVersion(artifact!).content).toBe('Version 2 body');
  });
});
