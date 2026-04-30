import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockConnection = {
  stream: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockTransport = {
  connect: vi.fn().mockResolvedValue(mockConnection),
};

vi.mock('../transport/SSETransport', () => ({
  createSSETransport: vi.fn(() => mockTransport),
}));

vi.mock('../../config/gatewayConfig', () => ({
  GATEWAY_ENDPOINTS: {
    AGENTS: {
      CHAT: 'http://localhost:9080/api/v1/agents/chat',
    },
  },
}));

vi.mock('../../utils/logger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
  LogCategory: {
    CHAT_FLOW: 'chat_flow',
  },
}));

vi.mock('../adapters/MateEventAdapter', () => ({
  adaptMateEvent: vi.fn(),
  createMateStreamContext: vi.fn(),
  buildMateRequest: vi.fn(),
}));

vi.mock('../storageService', () => ({
  getStorageService: vi.fn(),
}));

import { ChatService } from '../chatService';
import type { ChatServiceCallbacks } from '../chatService';

function createAsyncIterable(chunks: string[]): AsyncIterable<string> {
  return {
    [Symbol.asyncIterator]() {
      let index = 0;
      return {
        async next() {
          if (index < chunks.length) {
            return { value: chunks[index++], done: false };
          }
          return { value: undefined as never, done: true };
        },
      };
    },
  };
}

describe('ChatService artifact SSE integration', () => {
  let service: ChatService;
  let callbacks: ChatServiceCallbacks;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService();
    callbacks = {
      onStreamStart: vi.fn(),
      onStreamContent: vi.fn(),
      onStreamComplete: vi.fn(),
      onArtifactCreated: vi.fn(),
      onArtifactUpdated: vi.fn(),
      onError: vi.fn(),
    };
  });

  test('forwards legacy artifact_created SSE payloads to onArtifactCreated', async () => {
    const artifact = {
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
    };

    mockConnection.stream.mockReturnValue(createAsyncIterable([
      `data: ${JSON.stringify({
        type: 'text_message_content',
        content: 'Working on the todo component...',
        message_id: 'stream-1',
      })}\n\n` +
      `data: ${JSON.stringify({
        type: 'artifact_created',
        artifact,
      })}\n\n` +
      `data: ${JSON.stringify({
        type: 'text_message_end',
        final_content: 'Initial version ready.',
        message_id: 'stream-1',
      })}\n\n` +
      'data: [DONE]\n\n',
    ]));

    await service.sendMessage(
      'Create a React todo component and a PDF summary.',
      {
        user_id: 'user-356',
        session_id: 'session-1',
        prompt_args: {},
      },
      'token-356',
      callbacks,
    );

    expect(callbacks.onStreamContent).toHaveBeenCalledWith('Working on the todo component...');
    expect(callbacks.onArtifactCreated).toHaveBeenCalledWith(artifact);
  });
});
