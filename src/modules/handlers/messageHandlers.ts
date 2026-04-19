/**
 * Message Handler Functions
 *
 * Extracted from ChatModule.tsx for separation of concerns.
 * All handler logic is identical to the original — this is a move, not a refactor.
 */
import { useChatStore } from '../../stores/useChatStore';
import { useMessageStore } from '../../stores/useMessageStore';
import { useBranchStore } from '../../stores/useBranchStore';
import { logger, LogCategory, createLogger } from '../../utils/logger';
import { detectPluginTrigger, executePlugin } from '../../plugins';
import { ArtifactMessage } from '../../types/chatTypes';
import { AppId } from '../../types/appTypes';
import { isDelegationTool } from '../../constants/delegationTeams';

const log = createLogger('ChatModule:Message');

export interface MessageHandlerDeps {
  authUserSub: string | undefined;
  currentSessionId: string | undefined;
  sessionActions: {
    createSession: (title: string) => { id: string };
    selectSession: (id: string) => void;
  };
  userModule: {
    hasCredits: boolean;
    credits: number;
    totalCredits: number;
    currentPlan: string;
    getAccessToken: () => Promise<string>;
    createCheckout: (plan: any) => Promise<string>;
  };
  setShowUpgradeModal: React.Dispatch<React.SetStateAction<boolean>>;
  getChatService: () => Promise<any>;
  setCurrentApp: (appId: AppId | null) => void;
  setShowRightSidebar: (show: boolean) => void;
  setHuntSearchResults: (results: any[]) => void;
}

export function createMessageHandlers(deps: MessageHandlerDeps) {
  const {
    authUserSub,
    currentSessionId,
    sessionActions,
    userModule,
    setShowUpgradeModal,
    getChatService,
    setCurrentApp,
    setShowRightSidebar,
    setHuntSearchResults,
  } = deps;

  const handleNewChat = () => {
    logger.info(LogCategory.CHAT_FLOW, '📱 Creating new chat session from mobile interface');

    const newSessionTitle = `New Chat ${new Date().toLocaleTimeString()}`;
    const newSession = sessionActions.createSession(newSessionTitle);
    sessionActions.selectSession(newSession.id);

    logger.info(LogCategory.CHAT_FLOW, 'New chat session created', {
      sessionId: newSession.id,
      title: newSessionTitle
    });
  };

  const handleSendMessage = async (content: string, metadata?: Record<string, any>) => {
    if (!userModule.hasCredits) {
      log.warn('User has no credits, blocking message send');
      setShowUpgradeModal(true);
      return;
    }

    let sessionId = currentSessionId;

    if (!sessionId) {
      const newSessionTitle = `New Chat ${new Date().toLocaleTimeString()}`;
      const newSession = sessionActions.createSession(newSessionTitle);
      sessionActions.selectSession(newSession.id);
      sessionId = newSession.id;

      logger.info(LogCategory.CHAT_FLOW, 'Auto-creating session for message sending', {
        sessionId: newSession.id,
        messagePreview: content.substring(0, 50)
      });
    }

    const enrichedMetadata = {
      ...metadata,
      user_id: authUserSub || (() => { throw new Error('User not authenticated') })(),
      session_id: sessionId
    };

    const userMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: 'regular' as const,
      role: 'user' as const,
      content: content,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      metadata: enrichedMetadata,
      processed: true
    };

    useChatStore.getState().addMessage(userMessage);

    const pluginTrigger = detectPluginTrigger(content);

    if (pluginTrigger.triggered && pluginTrigger.pluginId) {
      log.info('Plugin detected, routing to PluginManager:', pluginTrigger);

      try {
        const processingMessage = {
          id: `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          type: 'regular' as const,
          role: 'assistant' as const,
          content: '',
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          isStreaming: true,
          streamingStatus: `Processing with ${pluginTrigger.pluginId} plugin...`,
          metadata: {
            ...enrichedMetadata,
            pluginId: pluginTrigger.pluginId,
            trigger: pluginTrigger.trigger
          }
        };

        useChatStore.getState().addMessage(processingMessage);

        const pluginInput = {
          prompt: pluginTrigger.extractedParams?.prompt || content,
          options: pluginTrigger.extractedParams || {},
          context: {
            sessionId,
            userId: authUserSub || (() => { throw new Error('User not authenticated') })(),
            messageId: userMessage.id
          }
        };

        const pluginResult = await executePlugin(pluginTrigger.pluginId as any, pluginInput);

        if (pluginResult.success && pluginResult.output) {
          const completedMessage = {
            ...processingMessage,
            content: typeof pluginResult.output.content === 'string'
              ? pluginResult.output.content
              : JSON.stringify(pluginResult.output.content),
            isStreaming: false,
            streamingStatus: undefined,
            metadata: {
              ...processingMessage.metadata,
              pluginResult: pluginResult.output,
              executionTime: pluginResult.executionTime
            }
          };

          useChatStore.getState().addMessage(completedMessage);
          log.info('Plugin execution completed successfully');

        } else {
          const errorMessage = {
            ...processingMessage,
            content: `Plugin execution failed: ${pluginResult.error}`,
            isStreaming: false,
            streamingStatus: undefined,
            metadata: {
              ...processingMessage.metadata,
              error: pluginResult.error
            }
          };

          useChatStore.getState().addMessage(errorMessage);
          log.error('Plugin execution failed:', pluginResult.error);
        }

      } catch (error) {
        log.error('Plugin system error:', error);
      }

    } else {
      try {
        const token = await userModule.getAccessToken();
        const chatService = await getChatService();

        const { getChatBackend } = await import('../../config/runtimeEnv');
        const useMate = getChatBackend() === 'mate';

        // Include selected model in the request (wiring gap fix — #194)
        const selectedModel = typeof window !== 'undefined' ? localStorage.getItem('isa_selected_model') : null;
        const matePayload: Record<string, any> = { session_id: enrichedMetadata.session_id };
        if (selectedModel) matePayload.model = selectedModel;

        const sendFn = useMate
          ? chatService.sendMessageViaMate.bind(chatService, content, matePayload, token)
          : chatService.sendMessage.bind(chatService, content, { ...enrichedMetadata, ...(selectedModel ? { model: selectedModel } : {}) }, token);

        // Show immediate thinking indicator — don't wait for Mate's first SSE event
        const placeholderId = `thinking-${Date.now()}`;
        useChatStore.getState().startStreamingMessage(placeholderId, 'Thinking...');
        useChatStore.getState().setIsTyping(true);

        await sendFn({
          onStreamStart: (messageId: string, status?: string) => {
            // Replace the placeholder with the real streaming message
            useChatStore.getState().finishStreamingMessage(); // close placeholder
            useChatStore.getState().startStreamingMessage(messageId, status);
            useChatStore.getState().setExecutingPlan(true);
          },
          onStreamContent: (contentChunk: string) => {
            useChatStore.getState().appendToStreamingMessage(contentChunk);
          },
          onStreamStatus: (status: string) => {
            useChatStore.getState().updateStreamingStatus(status);
          },
          onStreamComplete: () => {
            useChatStore.getState().finishStreamingMessage();
            useChatStore.getState().setChatLoading(false);
            useChatStore.getState().setIsTyping(false);
            useChatStore.getState().setExecutingPlan(false);
            logger.info(LogCategory.CHAT_FLOW, 'Message sending completed successfully');

            // Artifact edit-to-version: if this was an artifact edit, create new version (#256)
            if (typeof window !== 'undefined' && (window as any).__pendingArtifactEdit) {
              const { artifactId, instruction } = (window as any).__pendingArtifactEdit;
              delete (window as any).__pendingArtifactEdit;
              // Get the last assistant message content as the new version
              const messages = useMessageStore.getState().messages;
              const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
              if (lastAssistant && 'content' in lastAssistant && lastAssistant.content) {
                import('../../stores/useArtifactManager').then(({ useArtifactManager }) => {
                  useArtifactManager.getState().addVersion(artifactId, lastAssistant.content, instruction);
                  log.info('Artifact version created from edit response', { artifactId, instruction });
                });
              }
            }
          },
          onToolStart: (toolName: string, toolCallId?: string) => {
            if (isDelegationTool(toolName) && toolCallId) {
              useMessageStore.getState().startDelegation(toolName, toolCallId);
            }
          },
          onToolCompleted: (toolName: string, result?: any, error?: string) => {
            const delegations = useMessageStore.getState().activeDelegations;
            const active = delegations.find(
              (d) => d.teamId === toolName && (d.status === 'delegating' || d.status === 'working')
            );
            if (active) {
              useMessageStore.getState().completeDelegation(active.toolCallId, result, error);
            }
          },
          onError: (error: Error) => {
            logger.error(LogCategory.CHAT_FLOW, 'Message sending failed', { error: error.message });
            useChatStore.getState().setChatLoading(false);
            useChatStore.getState().setIsTyping(false);
            useChatStore.getState().setExecutingPlan(false);
          }
        });

        log.info('Regular chat message sent successfully via direct ChatService call');

      } catch (error) {
        log.error('Failed to send regular chat message:', error);
        throw error;
      }
    }
  };

  const handleSendMultimodal = async (content: string, files: File[], metadata?: Record<string, any>) => {
    log.info('sendMultimodalMessage called', { content, fileCount: files.length });

    if (!userModule.hasCredits) {
      log.warn('User has no credits, blocking multimodal message send');

      const shouldUpgrade = window.confirm(
        `💳 No Credits Remaining\n\n` +
        `You've used all your available credits. Multimodal messages (with files) require credits to process.\n\n` +
        `Current Plan: ${userModule.currentPlan.toUpperCase()}\n` +
        `Credits: ${userModule.credits} / ${userModule.totalCredits}\n\n` +
        `Would you like to upgrade your plan now?`
      );

      if (shouldUpgrade) {
        try {
          const checkoutUrl = await userModule.createCheckout('pro');
          window.open(checkoutUrl, '_blank');
        } catch (error) {
          log.error('Failed to create checkout:', error);
          window.open('/pricing', '_blank');
        }
      }

      return;
    }

    log.info('Credit check passed for multimodal, proceeding with message send');

    const enrichedMetadata = {
      ...metadata,
      user_id: authUserSub || (() => { throw new Error('User not authenticated') })(),
      session_id: metadata?.session_id || 'default',
      files: files.map(f => ({ name: f.name, type: f.type, size: f.size }))
    };

    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'regular' as const,
      role: 'user' as const,
      content: content,
      timestamp: new Date().toISOString(),
      sessionId: metadata?.session_id || 'default',
      metadata: enrichedMetadata,
      processed: true
    };

    log.info('Adding multimodal user message to store');
    useChatStore.getState().addMessage(userMessage);

    log.info('Calling sendMessage API for multimodal content');

    try {
      const token = await userModule.getAccessToken();
      const chatService = await getChatService();
      log.info('Retrieved access token for multimodal API call');

      await chatService.sendMultimodalMessage(content, enrichedMetadata, token, {
        onStreamStart: (messageId: string, status?: string) => {
          useChatStore.getState().startStreamingMessage(messageId, status);
          useChatStore.getState().setExecutingPlan(true);
        },
        onStreamContent: (contentChunk: string) => {
          useChatStore.getState().appendToStreamingMessage(contentChunk);
        },
        onStreamStatus: (status: string) => {
          useChatStore.getState().updateStreamingStatus(status);
        },
        onStreamComplete: () => {
          useChatStore.getState().finishStreamingMessage();
          useChatStore.getState().setChatLoading(false);
          useChatStore.getState().setIsTyping(false);
          useChatStore.getState().setExecutingPlan(false);
          logger.info(LogCategory.CHAT_FLOW, 'Multimodal message sending completed successfully');
        },
        onError: (error: Error) => {
          logger.error(LogCategory.CHAT_FLOW, 'Multimodal message sending failed', { error: error.message });
          useChatStore.getState().setChatLoading(false);
          useChatStore.getState().setIsTyping(false);
          useChatStore.getState().setExecutingPlan(false);
        }
      }, files);
      log.info('Multimodal message sent successfully via direct ChatService call');
    } catch (error) {
      log.error('Failed to send multimodal message:', error);
      throw error;
    }
  };

  const handleMessageClick = (message: any) => {
    log.info('Message clicked:', message);

    if (message.type === 'artifact') {
      const artifactMessage = message as ArtifactMessage;
      const widgetType = artifactMessage.artifact.widgetType;

      const widgetToAppMap = {
        'dream': 'dream',
        'hunt': 'hunt',
        'omni': 'omni',
        'data_scientist': 'data-scientist',
        'knowledge': 'knowledge'
      };

      const appId = widgetToAppMap[widgetType as keyof typeof widgetToAppMap];
      if (appId) {
        log.info(`Navigating to ${appId} widget for artifact`, { artifactId: artifactMessage.artifact.id });

        const artifactContent = artifactMessage.artifact.content;

        if (appId === 'hunt' && artifactContent) {
          try {
            const searchResults = typeof artifactContent === 'string' ? JSON.parse(artifactContent) : artifactContent;
            if (Array.isArray(searchResults)) {
              log.info('Setting hunt search results', { count: searchResults.length });
              setHuntSearchResults(searchResults);
            }
          } catch (e) {
            log.warn('Could not parse hunt artifact content:', e);
          }
        }

        setCurrentApp(appId as AppId);
        setShowRightSidebar(true);

        log.info('Navigation completed', { app: appId, sidebar: true });
      } else {
        log.warn('Unknown widget type for navigation:', widgetType);
      }
    }
  };

  /**
   * Edit a user message — saves the old chain as a branch, removes messages
   * from that point, and re-sends with the edited content (#190 branch support).
   */
  const handleEditMessage = (editedContent: string, originalMessageId: string) => {
    const { messages } = useMessageStore.getState();
    const idx = messages.findIndex(m => m.id === originalMessageId);
    if (idx < 0) return;

    // Snapshot the message chain from the edit point onward (inclusive)
    const chainFromPoint = messages.slice(idx);

    // Save the current chain as a branch before removing
    const branchStore = useBranchStore.getState();
    const isFirstEdit = !branchStore.branchPoints[originalMessageId];
    branchStore.saveBranch(originalMessageId, chainFromPoint, isFirstEdit);

    // Remove the edited message and everything after it
    const { removeMessage } = useChatStore.getState();
    for (let i = messages.length - 1; i >= idx; i--) {
      removeMessage(messages[i].id);
    }

    // Re-send with edited content — after the response completes,
    // the new chain will be captured by a subscription in the store.
    handleSendMessage(editedContent).then(() => {
      // Capture the new branch after the response is added
      // Use a short delay to ensure the streaming message is finalized
      setTimeout(() => {
        const currentMessages = useMessageStore.getState().messages;
        const newChainStart = currentMessages.findIndex(m => m.timestamp > chainFromPoint[0].timestamp);
        if (newChainStart >= 0) {
          const newChain = currentMessages.slice(newChainStart);
          branchStore.addNewBranch(originalMessageId, newChain);
        }
      }, 500);
    });
  };

  /**
   * Regenerate an assistant response — removes it and re-sends the prior user message (wiring gap fix)
   */
  const handleRegenerateMessage = (userContent: string, assistantMessageId: string) => {
    const { removeMessage } = useChatStore.getState();
    removeMessage(assistantMessageId);
    handleSendMessage(userContent);
  };

  /**
   * Edit an artifact — sends structured follow-up to Mate, creates new version (#256)
   *
   * The core evolution loop:
   * 1. User types instruction in artifact Edit tab
   * 2. System sends: "[Artifact Edit] <instruction>\n\nOriginal content:\n```\n<content>\n```"
   * 3. Mate responds with updated content
   * 4. Response callback creates a new ArtifactVersion
   */
  const handleArtifactEdit = async (artifactId: string, instruction: string, currentContent: string) => {
    const { useArtifactManager } = await import('../../stores/useArtifactManager');
    const artifactManager = useArtifactManager.getState();

    // Build structured edit prompt
    const editPrompt = `[Artifact Edit Request]
Instruction: ${instruction}

Current artifact content:
\`\`\`
${currentContent}
\`\`\`

Please apply the requested changes and return ONLY the updated content. Do not include explanations — just the updated artifact.`;

    // Send as a regular message — the response will be captured
    // and used to create a new artifact version
    const originalSendMessage = handleSendMessage;

    // Store the artifact ID so the response callback can create a version
    if (typeof window !== 'undefined') {
      (window as any).__pendingArtifactEdit = {
        artifactId,
        instruction,
      };
    }

    await originalSendMessage(editPrompt, {
      artifact_edit: true,
      artifact_id: artifactId,
      edit_instruction: instruction,
    });
  };

  return {
    handleNewChat,
    handleSendMessage,
    handleSendMultimodal,
    handleMessageClick,
    handleEditMessage,
    handleRegenerateMessage,
    handleArtifactEdit,
  };
}
