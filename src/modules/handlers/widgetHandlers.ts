/**
 * Widget Handler Functions
 *
 * Extracted from ChatModule.tsx for separation of concerns.
 * All handler logic is identical to the original — this is a move, not a refactor.
 */
import { useChatStore } from '../../stores/useChatStore';
import { createLogger } from '../../utils/logger';
import { executePlugin } from '../../plugins';
import { AppId } from '../../types/appTypes';

const log = createLogger('ChatModule:Widget');

export interface WidgetHandlerDeps {
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
  };
  setShowUpgradeModal: React.Dispatch<React.SetStateAction<boolean>>;
  eventEmitterRef: React.RefObject<{
    emit: (event: string, data: any) => void;
  }>;
  mapPluginTypeToContentType: (pluginType: string) => 'image' | 'text' | 'data' | 'analysis' | 'knowledge' | 'search_results';
  onCloseWidgetSelector?: () => void;
  setCurrentApp: (appId: AppId | null) => void;
  setShowRightSidebar: (show: boolean) => void;
  currentWidgetMode: 'half' | 'full' | null;
  setCurrentWidgetMode: React.Dispatch<React.SetStateAction<'half' | 'full' | null>>;
}

export function mapPluginTypeToContentType(pluginType: string): 'image' | 'text' | 'data' | 'analysis' | 'knowledge' | 'search_results' {
  switch (pluginType) {
    case 'image': return 'image';
    case 'data': return 'search_results';
    case 'search_results': return 'search_results';
    case 'search': return 'search_results';
    case 'knowledge': return 'knowledge';
    case 'text':
    default: return 'text';
  }
}

export function createWidgetHandlers(deps: WidgetHandlerDeps) {
  const {
    authUserSub,
    currentSessionId,
    sessionActions,
    userModule,
    setShowUpgradeModal,
    eventEmitterRef,
    onCloseWidgetSelector,
    setCurrentApp,
    setShowRightSidebar,
    currentWidgetMode,
    setCurrentWidgetMode,
  } = deps;

  const handleWidgetRequest = async (eventData: any) => {
    log.info('Received widget request event:', eventData);

    const { widgetType, params, requestId } = eventData;

    useChatStore.getState().setChatLoading(true);

    log.info('Credit check details:', {
      hasCredits: userModule.hasCredits,
      credits: userModule.credits,
      totalCredits: userModule.totalCredits,
      currentPlan: userModule.currentPlan
    });

    const shouldSkipCreditCheck = process.env.NODE_ENV === 'development';

    if (!userModule.hasCredits && !shouldSkipCreditCheck) {
      log.warn('User has no credits, blocking widget request');

      eventEmitterRef.current!.emit('widget:result', {
        widgetType,
        requestId,
        error: 'Insufficient credits',
        success: false
      });

      setShowUpgradeModal(true);
      return;
    }

    if (shouldSkipCreditCheck) {
      log.info('Development mode - skipping credit check');
    }

    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      const newSessionTitle = `${widgetType.toUpperCase()} Widget - ${new Date().toLocaleTimeString()}`;
      const newSession = sessionActions.createSession(newSessionTitle);
      sessionActions.selectSession(newSession.id);
      activeSessionId = newSession.id;

      log.info('Auto-created session for widget request:', {
        sessionId: newSession.id,
        widgetType
      });
    }

    const userMessage = {
      id: `user-widget-${requestId}`,
      type: 'regular' as const,
      role: 'user' as const,
      content: params.prompt || params.query || `Generate ${widgetType} content`,
      timestamp: new Date().toISOString(),
      sessionId: activeSessionId,
      metadata: {
        widgetType,
        widgetRequest: true,
        originalParams: params
      }
    };

    log.info('Adding widget user message to chat');
    useChatStore.getState().addMessage(userMessage);

    try {
      const actualUserInput = widgetType === 'hunt' ? params.query : params.prompt;
      if (!actualUserInput) {
        throw new Error(`${widgetType} widget requires user input`);
      }

      const pluginResult = await executePlugin(widgetType, {
        prompt: actualUserInput,
        options: params,
        context: {
          sessionId: activeSessionId,
          userId: authUserSub || 'anonymous',
          messageId: userMessage.id,
          requestId
        }
      });

      if (pluginResult.success && pluginResult.output) {
        let displayContent: string;
        let artifactContent: any;

        if (widgetType === 'hunt' && Array.isArray(pluginResult.output.content)) {
          const results = pluginResult.output.content;
          if (results.length > 0) {
            const firstResult = results[0];
            displayContent = `Search Results: ${firstResult.title || 'Found information'} - ${firstResult.content?.substring(0, 150) || ''}...`;
            artifactContent = results;
          } else {
            displayContent = 'No search results found';
            artifactContent = [];
          }
        } else if (widgetType === 'dream' && pluginResult.output.type === 'image') {
          const imageContent = pluginResult.output.content;
          if (typeof imageContent === 'string' && imageContent.startsWith('http')) {
            displayContent = `Generated Image: ${actualUserInput.substring(0, 100)}...`;
            artifactContent = imageContent;
          } else {
            displayContent = 'Image generation completed';
            artifactContent = imageContent;
          }
        } else if (widgetType === 'omni' && pluginResult.output.type === 'text') {
          const textContent = pluginResult.output.content;
          if (typeof textContent === 'string' && textContent.length > 0) {
            displayContent = `Generated Content: ${textContent.substring(0, 150)}...`;
            artifactContent = textContent;
          } else {
            displayContent = 'Content generation completed';
            artifactContent = textContent;
          }
        } else if (widgetType === 'data_scientist' && pluginResult.output.type === 'analysis') {
          const analysisContent = pluginResult.output.content;
          if (typeof analysisContent === 'object' && analysisContent.analysis) {
            displayContent = `Data Analysis: ${analysisContent.analysis.summary?.substring(0, 150) || 'Analysis completed'}...`;
            artifactContent = analysisContent;
          } else if (typeof analysisContent === 'string') {
            displayContent = `Data Analysis: ${analysisContent.substring(0, 150)}...`;
            artifactContent = analysisContent;
          } else {
            displayContent = 'Data analysis completed';
            artifactContent = analysisContent;
          }
        } else if (widgetType === 'knowledge' && pluginResult.output.type === 'knowledge') {
          const knowledgeContent = pluginResult.output.content;
          if (typeof knowledgeContent === 'string' && knowledgeContent.length > 0) {
            displayContent = `Knowledge Analysis: ${knowledgeContent.substring(0, 150)}...`;
            artifactContent = knowledgeContent;
          } else {
            displayContent = 'Knowledge analysis completed';
            artifactContent = knowledgeContent;
          }
        } else if (widgetType === 'custom_automation' && pluginResult.output.type === 'analysis') {
          const automationContent = pluginResult.output.content;
          if (typeof automationContent === 'object' && automationContent.summary) {
            displayContent = `Automation Completed: ${automationContent.summary.substring(0, 150)}...`;
            artifactContent = automationContent;
          } else if (typeof automationContent === 'string') {
            displayContent = `Automation Completed: ${automationContent.substring(0, 150)}...`;
            artifactContent = automationContent;
          } else {
            displayContent = 'Automation process completed';
            artifactContent = automationContent;
          }
        } else if (widgetType === 'digitalhub') {
          const digitalHubContent = pluginResult.output.content;
          if (typeof digitalHubContent === 'object' && digitalHubContent.files) {
            displayContent = `File Operation: ${digitalHubContent.files.length} file(s) found`;
            artifactContent = digitalHubContent;
          } else if (typeof digitalHubContent === 'string') {
            displayContent = `File Operation: ${digitalHubContent.substring(0, 150)}...`;
            artifactContent = digitalHubContent;
          } else {
            displayContent = 'File operation completed';
            artifactContent = digitalHubContent;
          }
        } else if (widgetType === 'doc') {
          const docContent = pluginResult.output.content;
          if (typeof docContent === 'object' && docContent.document) {
            displayContent = `Document: ${docContent.document.title || 'Untitled'} - ${(docContent.document.content || '').substring(0, 100)}...`;
            artifactContent = docContent;
          } else if (typeof docContent === 'string') {
            displayContent = `Document: ${docContent.substring(0, 150)}...`;
            artifactContent = docContent;
          } else {
            displayContent = 'Document operation completed';
            artifactContent = docContent;
          }
        } else {
          displayContent = typeof pluginResult.output.content === 'string'
            ? pluginResult.output.content
            : JSON.stringify(pluginResult.output.content);
          artifactContent = displayContent;
        }

        const artifactMessage = {
          id: `assistant-widget-${requestId}`,
          type: 'artifact' as const,
          role: 'assistant' as const,
          content: displayContent,
          timestamp: new Date().toISOString(),
          sessionId: activeSessionId,
          userPrompt: params.prompt || `${widgetType} request`,
          artifact: {
            id: pluginResult.output.id || `${widgetType}_${Date.now()}`,
            widgetType: widgetType,
            widgetName: widgetType.charAt(0).toUpperCase() + widgetType.slice(1),
            version: 1,
            contentType: deps.mapPluginTypeToContentType(pluginResult.output.type || 'text'),
            content: artifactContent,
            thumbnail: (pluginResult.output as any).thumbnail,
            metadata: {
              processingTime: pluginResult.executionTime,
              createdBy: 'plugin',
              pluginResult: pluginResult.output
            }
          }
        };

        useChatStore.getState().addMessage(artifactMessage);

        useChatStore.getState().setChatLoading(false);

        log.info('Emitting widget:result event:', {
          widgetType,
          requestId,
          result: pluginResult.output,
          success: true
        });

        eventEmitterRef.current!.emit('widget:result', {
          widgetType,
          requestId,
          result: pluginResult.output,
          success: true
        });

        log.info('Widget request processed successfully via Plugin system, artifact created');

      } else {
        log.error('Widget plugin execution failed:', pluginResult.error);

        useChatStore.getState().setChatLoading(false);

        eventEmitterRef.current!.emit('widget:result', {
          widgetType,
          requestId,
          error: pluginResult.error,
          success: false
        });
      }

    } catch (error) {
      log.error('Widget request processing failed:', error);

      useChatStore.getState().setChatLoading(false);

      eventEmitterRef.current!.emit('widget:result', {
        widgetType,
        requestId,
        error: error instanceof Error ? error.message : String(error),
        success: false
      });
    }
  };

  const handleWidgetSelect = (widgetId: string, mode: 'half' | 'full') => {
    log.info('Widget selected:', { widgetId, mode });

    if (typeof window !== 'undefined') {
      (window as any).__CHAT_MODULE_PLUGIN_MODE__ = true;
    }

    setCurrentApp(widgetId as AppId);
    setShowRightSidebar(true);

    if (onCloseWidgetSelector) {
      onCloseWidgetSelector();
    }
  };

  const handleCloseWidget = () => {
    setCurrentWidgetMode(null);

    setCurrentApp(null);
    setShowRightSidebar(false);

    if (typeof window !== 'undefined') {
      (window as any).__CHAT_MODULE_PLUGIN_MODE__ = false;
    }
  };

  const handleToggleWidgetMode = () => {
    if (!currentWidgetMode) return;

    const newMode = currentWidgetMode === 'half' ? 'full' : 'half';
    setCurrentWidgetMode(newMode);

    log.info('Widget mode toggled:', { from: currentWidgetMode, to: newMode });
  };

  return {
    handleWidgetRequest,
    handleWidgetSelect,
    handleCloseWidget,
    handleToggleWidgetMode,
  };
}
