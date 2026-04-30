import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../plugins', () => ({
  detectPluginTrigger: vi.fn(() => ({ triggered: false })),
  executePlugin: vi.fn(),
}));

vi.mock('../../../config/runtimeEnv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../config/runtimeEnv')>();
  return {
    ...actual,
    getChatBackend: vi.fn(() => 'agent'),
  };
});

vi.mock('../../../utils/observabilityEvents', () => ({
  emitObservabilityRefresh: vi.fn(),
}));

import { createMessageHandlers } from '../messageHandlers';
import { useChatStore } from '../../../stores/useChatStore';
import { useMessageStore } from '../../../stores/useMessageStore';
import { useSessionStore } from '../../../stores/useSessionStore';
import { useArtifactManager } from '../../../stores/useArtifactManager';
import { useProjectStore } from '../../../stores/useProjectStore';
import { useUserStore } from '../../../stores/useUserStore';
import { getActiveVersion } from '../../../types/artifactTypes';

describe('createMessageHandlers artifact flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useChatStore.setState({
      messages: [],
      streamingBuffers: {},
      streamingLastFlush: {},
      isTyping: false,
      chatLoading: false,
      currentTasks: [],
      taskProgress: null,
      isExecutingPlan: false,
      hasExecutedTasks: false,
      hilStatus: 'idle',
      currentHILInterrupt: null,
      hilHistory: [],
      hilCheckpoints: [],
      currentThreadId: null,
    });

    useMessageStore.setState({
      messages: [],
      currentTasks: [],
      taskProgress: null,
      isExecutingPlan: false,
      hasExecutedTasks: false,
      hilStatus: 'idle',
      currentHILInterrupt: null,
      hilHistory: [],
      hilCheckpoints: [],
      currentThreadId: null,
      activeDelegations: [],
    });

    useSessionStore.setState({
      sessions: [
        {
          id: 'session-1',
          title: 'Artifact Session',
          lastMessage: 'New conversation started',
          timestamp: '2026-04-29T00:00:00Z',
          messageCount: 0,
          artifacts: [],
          messages: [],
          metadata: {
            apps_used: [],
            total_messages: 0,
            last_activity: '2026-04-29T00:00:00Z',
          },
        },
      ],
      currentSessionId: 'session-1',
      starredSessionIds: new Set<string>(),
      searchQuery: '',
      isLoading: false,
      error: null,
      isSyncingToAPI: false,
      syncStatus: 'idle',
      lastSyncError: null,
    } as any);

    useArtifactManager.setState({
      artifacts: {},
      openArtifactId: null,
      panelLayout: 'closed',
    });

    useProjectStore.setState({
      projects: [],
      activeProjectId: null,
      filesByProjectId: {},
      isLoaded: true,
      isLoading: false,
      savingInstructions: false,
      isUploadingFile: false,
      error: null,
    } as any);

    useUserStore.setState({
      externalUser: {
        auth0_id: 'user-356',
        email: 'codex356@example.com',
        name: 'Codex 356',
        credits: 25,
        credits_total: 25,
        plan: 'free',
      },
      _pendingCreditConsumptions: [],
      _nextOptimisticCreditId: 0,
    } as any);
  });

  test('persists backend artifact creation into chat and artifact manager state', async () => {
    const sendMessage = vi.fn(async (_content, _metadata, _token, callbacks) => {
      callbacks.onStreamStart?.('stream-1', 'Generating...');
      callbacks.onStreamContent?.('Working on the todo component...');
      callbacks.onArtifactCreated?.({
        id: 'artifact-356',
        title: 'Todo Component',
        widgetType: 'artifact',
        version: 1,
        type: 'code',
        language: 'tsx',
        filename: 'Todo.tsx',
        content: 'export default function App() { return <main>Todo v1</main>; }',
        generated_files: [
          {
            id: 'file-v1',
            filename: 'todo-v1.pdf',
            type: 'pdf',
            url: 'http://localhost:4100/__artifacts/todo-v1.pdf',
          },
        ],
      });
      callbacks.onStreamComplete?.('Initial version ready.');
    });

    const handlers = createMessageHandlers({
      authUserSub: 'user-356',
      currentSessionId: 'session-1',
      sessionActions: {
        createSession: vi.fn(),
        selectSession: vi.fn(),
      },
      userModule: {
        hasCredits: true,
        credits: 25,
        totalCredits: 25,
        currentPlan: 'free',
        getAccessToken: vi.fn().mockResolvedValue('token-356'),
        createCheckout: vi.fn(),
        consumeUserCredits: vi.fn().mockResolvedValue(undefined),
      },
      setShowUpgradeModal: vi.fn(),
      getChatService: vi.fn().mockResolvedValue({ sendMessage }),
      setCurrentApp: vi.fn(),
      setShowRightSidebar: vi.fn(),
      setHuntSearchResults: vi.fn(),
    });

    await handlers.handleSendMessage('Create a React todo component and a PDF summary.');
    await new Promise(resolve => setTimeout(resolve, 0));

    const artifactMessages = useChatStore.getState().messages.filter(message => message.type === 'artifact');
    expect(artifactMessages).toHaveLength(1);
    expect(artifactMessages[0]?.artifact.widgetName).toBe('Todo Component');
    expect(artifactMessages[0]?.artifact.generatedFiles?.[0]?.filename).toBe('todo-v1.pdf');

    const persistedArtifactMessages = useSessionStore.getState().getArtifactMessages('session-1');
    expect(persistedArtifactMessages).toHaveLength(1);
    expect(persistedArtifactMessages[0]?.artifact.id).toBe('artifact-356');

    const managedArtifact = useArtifactManager.getState().getArtifact('artifact-356');
    expect(managedArtifact?.id).toBe('artifact-356');
    expect(managedArtifact?.title).toBe('Todo Component');
    expect(getActiveVersion(managedArtifact!).filename).toBe('Todo.tsx');
    expect(getActiveVersion(managedArtifact!).generatedFiles?.[0]?.filename).toBe('todo-v1.pdf');
  });
});
