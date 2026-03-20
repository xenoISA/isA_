/**
 * ============================================================================
 * Unified Widget Handler (WidgetHandler.tsx) - Unified Widget Request Processing
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Process requests from all widget UI components
 * - Route requests to appropriate widget stores
 * - Transform UI parameters to store format
 * - Maintain separation between UI and business logic
 * 
 * Architecture Flow:
 * Widget UI → WidgetHandler → useWidgetStores → chatService → API
 * API Response → chatService → stores → hooks → modules → UI
 */

import { useDreamWidgetStore, useHuntWidgetStore, useOmniWidgetStore, useDataScientistWidgetStore, useKnowledgeWidgetStore, useCustomAutomationWidgetStore, useDigitalHubWidgetStore, useDocWidgetStore } from '../../stores/useWidgetStores';
import { logger, LogCategory, createLogger } from '../../utils/logger';
const log = createLogger('WidgetHandler');
import { OutputHistoryItem, EditAction, ManagementAction } from '../ui/widgets/BaseWidget';
import { WidgetType } from '../../types/widgetTypes';

// Generic widget request interface
export interface WidgetRequest {
  type: WidgetType;
  params: any;
  sessionId?: string;
  userId?: string;
}

// UI action request interface
export interface WidgetUIActionRequest {
  type: WidgetType;
  action: 'edit' | 'manage' | 'history' | 'clear';
  actionId: string;
  params?: any;
  content?: any;
}

// History request interface
export interface WidgetHistoryRequest {
  type: WidgetType;
  limit?: number;
  offset?: number;
}

// Widget运行模式检测
type WidgetMode = 'independent' | 'plugin';

// Plugin模式事件发射器
interface PluginEventEmitter {
  emit: (event: string, data: any) => void;
  on: (event: string, handler: (data: any) => void) => void;
  off: (event: string, handler: (data: any) => void) => void;
}

/**
 * Unified Widget Handler Class
 * Routes widget requests to appropriate stores or emits events for Plugin mode
 */
export class WidgetHandler {
  private eventEmitter: PluginEventEmitter | null = null;
  private mode: WidgetMode = 'independent'; // 默认独立模式

  /**
   * 设置Plugin模式和事件发射器
   */
  setPluginMode(eventEmitter: PluginEventEmitter) {
    this.mode = 'plugin';
    this.eventEmitter = eventEmitter;
    log.info('Switched to Plugin mode');
  }

  /**
   * 设置Independent模式
   */
  setIndependentMode() {
    this.mode = 'independent';
    this.eventEmitter = null;
    log.info('Switched to Independent mode');
  }

  /**
   * Process widget request based on type
   * In Plugin mode: emits events for ChatModule to handle and waits for result
   * In Independent mode: routes to appropriate store directly
   */
  async processRequest(request: WidgetRequest): Promise<any> {
    logger.debug(LogCategory.ARTIFACT_CREATION, 'Processing widget request', { 
      type: request.type, 
      params: request.params,
      mode: this.mode
    });

    try {
      if (this.mode === 'plugin' && this.eventEmitter) {
        // 🔌 Plugin模式：发出事件给ChatModule处理并等待结果
        log.info('Emitting plugin event for ChatModule', request);
        
        const requestId = `${request.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        // 创建Promise来等待ChatModule的结果
        return new Promise((resolve, reject) => {
          // 监听结果事件
          const resultHandler = (eventData: any) => {
            log.info('Received widget:result event', eventData);
            if (eventData.requestId === requestId) {
              clearTimeout(timeout);
              // Clean up listener after use
              this.eventEmitter!.off('widget:result', resultHandler);
              
              if (eventData.success) {
                log.info('Widget request succeeded, resolving promise');
                resolve(eventData.result);
              } else {
                log.error('Widget request failed', eventData.error);
                reject(new Error(eventData.error || 'Plugin execution failed'));
              }
            }
          };
          
          const timeout = setTimeout(() => {
            // Clean up listener on timeout
            this.eventEmitter!.off('widget:result', resultHandler);
            reject(new Error('Plugin request timeout'));
          }, 60000); // 60秒超时
          
          this.eventEmitter!.on('widget:result', resultHandler);
          
          // 发出请求事件
          log.info('Emitting widget:request with requestId', requestId);
          this.eventEmitter!.emit('widget:request', {
            widgetType: request.type,
            action: 'process',
            params: request.params,
            requestId: requestId,
            sessionId: request.sessionId,
            userId: request.userId,
            timestamp: new Date()
          });
        });
      }

      // 🔧 Independent模式：直接路由到store
      log.info('Processing in Independent mode');
      
      switch (request.type) {
        case 'dream':
          await this.processDreamRequest(request.params, request.sessionId, request.userId);
          break;
        case 'hunt':
          await this.processHuntRequest(request.params, request.sessionId, request.userId);
          break;
        case 'omni':
          await this.processOmniRequest(request.params, request.sessionId, request.userId);
          break;
        case 'knowledge':
          await this.processKnowledgeRequest(request.params, request.sessionId, request.userId);
          break;
        case 'data_scientist':
          await this.processDataScientistRequest(request.params, request.sessionId, request.userId);
          break;
        case 'custom_automation':
          await this.processCustomAutomationRequest(request.params, request.sessionId, request.userId);
          break;
        case 'digitalhub':
          await this.processDigitalHubRequest(request.params, request.sessionId, request.userId);
          break;
        case 'doc':
          await this.processDocRequest(request.params, request.sessionId, request.userId);
          break;
        default:
          throw new Error(`Unsupported widget type: ${request.type}`);
      }
    } catch (error) {
      logger.error(LogCategory.ARTIFACT_CREATION, 'Widget request failed', { 
        type: request.type, 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Process Dream widget request - Route to Dream store
   */
  private async processDreamRequest(params: any, sessionId?: string, userId?: string): Promise<void> {
    const dreamStore = useDreamWidgetStore.getState();
    
    logger.debug(LogCategory.ARTIFACT_CREATION, 'Dream request routed to store', { 
      params, 
      sessionId, 
      userId 
    });
    
    // Trigger dream generation via store's chatService integration
    await dreamStore.triggerAction(params);
  }

  /**
   * Process Hunt widget request - Route to Hunt store
   */
  private async processHuntRequest(params: any, sessionId?: string, userId?: string): Promise<void> {
    const huntStore = useHuntWidgetStore.getState();
    
    logger.debug(LogCategory.ARTIFACT_CREATION, 'Hunt request routed to store', { 
      params, 
      sessionId, 
      userId 
    });
    
    // Trigger hunt search via store's chatService integration
    await huntStore.triggerAction(params);
  }

  /**
   * Process Omni widget request - Route to Omni store
   */
  private async processOmniRequest(params: any, sessionId?: string, userId?: string): Promise<void> {
    const omniStore = useOmniWidgetStore.getState();
    
    logger.debug(LogCategory.ARTIFACT_CREATION, 'Omni request routed to store', { 
      params, 
      sessionId, 
      userId 
    });
    
    // Trigger omni generation via store's chatService integration
    await omniStore.triggerAction(params);
  }

  /**
   * Process Knowledge widget request - Route to Knowledge store
   */
  private async processKnowledgeRequest(params: any, sessionId?: string, userId?: string): Promise<void> {
    const knowledgeStore = useKnowledgeWidgetStore.getState();
    
    logger.debug(LogCategory.ARTIFACT_CREATION, 'Knowledge request routed to store', { 
      params, 
      sessionId, 
      userId 
    });
    
    // Trigger knowledge analysis via store's chatService integration
    await knowledgeStore.triggerAction(params);
  }

  /**
   * Process Data Scientist widget request - Route to DataScientist store
   */
  private async processDataScientistRequest(params: any, sessionId?: string, userId?: string): Promise<void> {
    const dataScientistStore = useDataScientistWidgetStore.getState();
    
    logger.debug(LogCategory.ARTIFACT_CREATION, 'DataScientist request routed to store', { 
      params, 
      sessionId, 
      userId 
    });
    
    // Trigger data scientist analysis via store's chatService integration
    await dataScientistStore.triggerAction(params);
  }

  /**
   * Process Custom Automation widget request - Route to Custom Automation store
   */
  private async processCustomAutomationRequest(params: any, sessionId?: string, userId?: string): Promise<void> {
    const customAutomationStore = useCustomAutomationWidgetStore.getState();
    
    logger.debug(LogCategory.ARTIFACT_CREATION, 'Custom Automation request routed to store', { 
      params, 
      sessionId, 
      userId 
    });
    
    // Trigger custom automation via store's chatService integration
    await customAutomationStore.triggerAction(params);
  }

  /**
   * Process DigitalHub widget request - Route to DigitalHub store
   */
  private async processDigitalHubRequest(params: any, sessionId?: string, userId?: string): Promise<void> {
    const digitalHubStore = useDigitalHubWidgetStore.getState();

    logger.debug(LogCategory.ARTIFACT_CREATION, 'DigitalHub request routed to store', {
      params,
      sessionId,
      userId
    });

    // Trigger digitalhub action via store's chatService integration
    await digitalHubStore.triggerAction(params);
  }

  /**
   * Process Doc widget request - Route to Doc store
   */
  private async processDocRequest(params: any, sessionId?: string, userId?: string): Promise<void> {
    const docStore = useDocWidgetStore.getState();

    logger.debug(LogCategory.ARTIFACT_CREATION, 'Doc request routed to store', {
      params,
      sessionId,
      userId
    });

    // Trigger doc action via store's chatService integration
    await docStore.triggerAction(params);
  }

  /**
   * Process UI actions (edit, manage, history operations)
   */
  async processUIAction(request: WidgetUIActionRequest): Promise<any> {
    logger.debug(LogCategory.ARTIFACT_CREATION, 'Processing widget UI action', { 
      type: request.type, 
      action: request.action,
      actionId: request.actionId
    });

    try {
      switch (request.action) {
        case 'edit':
          return await this.processEditAction(request);
        case 'manage':
          return await this.processManagementAction(request);
        case 'history':
          return await this.getWidgetHistory({ type: request.type });
        case 'clear':
          return await this.clearWidgetData(request.type);
        default:
          throw new Error(`Unsupported UI action: ${request.action}`);
      }
    } catch (error) {
      logger.error(LogCategory.ARTIFACT_CREATION, 'Widget UI action failed', { 
        type: request.type, 
        action: request.action,
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Process edit actions (copy, download, share, etc.)
   */
  private async processEditAction(request: WidgetUIActionRequest): Promise<void> {
    log.info(`${request.type.toUpperCase()}: Processing edit action '${request.actionId}'`, request.content);
    
    // Default edit actions that work across all widgets
    switch (request.actionId) {
      case 'copy':
        const textContent = typeof request.content === 'string' ? request.content : JSON.stringify(request.content);
        await navigator.clipboard.writeText(textContent);
        break;
      case 'download':
        this.downloadContent(request.content, request.type);
        break;
      case 'share':
        await this.shareContent(request.content, request.type);
        break;
      default:
        // Widget-specific edit actions would be handled here
        log.info(`${request.type.toUpperCase()}: Custom edit action '${request.actionId}' - implement in widget-specific handler`);
    }
  }

  /**
   * Process management actions (refresh, clear, custom actions)
   */
  private async processManagementAction(request: WidgetUIActionRequest): Promise<void> {
    log.info(`${request.type.toUpperCase()}: Processing management action '${request.actionId}'`);
    
    switch (request.actionId) {
      case 'refresh':
        // Re-trigger the last request for this widget
        if (request.params) {
          await this.processRequest({
            type: request.type,
            params: request.params
          });
        }
        break;
      case 'clear':
        await this.clearWidgetData(request.type);
        break;
      default:
        // Widget-specific management actions would be handled here
        log.info(`${request.type.toUpperCase()}: Custom management action '${request.actionId}' - implement in widget-specific handler`);
    }
  }

  /**
   * Get widget output history
   */
  async getWidgetHistory(request: WidgetHistoryRequest): Promise<OutputHistoryItem[]> {
    // This would typically fetch from a persistent store or database
    // For now, return empty array as a placeholder
    logger.debug(LogCategory.ARTIFACT_CREATION, 'Getting widget history', { type: request.type });
    
    // In a real implementation, this would:
    // 1. Query the widget's history store
    // 2. Apply pagination (limit/offset)
    // 3. Return formatted history items
    
    return [];
  }

  /**
   * Clear widget data and history
   */
  private async clearWidgetData(type: WidgetType): Promise<void> {
    logger.debug(LogCategory.ARTIFACT_CREATION, 'Clearing widget data', { type });
    
    try {
      switch (type) {
        case 'dream':
          const dreamStore = useDreamWidgetStore.getState();
          dreamStore.clearData?.();
          break;
        case 'hunt':
          const huntStore = useHuntWidgetStore.getState();
          huntStore.clearData?.();
          break;
        case 'omni':
          const omniStore = useOmniWidgetStore.getState();
          omniStore.clearData?.();
          break;
        case 'knowledge':
          const knowledgeStore = useKnowledgeWidgetStore.getState();
          knowledgeStore.clearData?.();
          break;
        case 'data_scientist':
          const dataScientistStore = useDataScientistWidgetStore.getState();
          dataScientistStore.clearData?.();
          break;
        case 'custom_automation':
          const customAutomationStore = useCustomAutomationWidgetStore.getState();
          customAutomationStore.clearData?.();
          break;
        case 'digitalhub':
          const digitalHubStore = useDigitalHubWidgetStore.getState();
          digitalHubStore.clearData?.();
          break;
        case 'doc':
          const docStore = useDocWidgetStore.getState();
          docStore.clearData?.();
          break;
        default:
          log.warn(`Clear operation not implemented for widget type: ${type}`);
      }
    } catch (error) {
      logger.error(LogCategory.ARTIFACT_CREATION, 'Failed to clear widget data', { type, error });
      throw error;
    }
  }

  /**
   * Helper: Download content as file
   */
  private downloadContent(content: any, widgetType: string): void {
    const textContent = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${widgetType}_output_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Helper: Share content via Web Share API or clipboard
   */
  private async shareContent(content: any, widgetType: string): Promise<void> {
    const textContent = typeof content === 'string' ? content : JSON.stringify(content);
    const shareData = {
      title: `${widgetType.charAt(0).toUpperCase() + widgetType.slice(1)} Output`,
      text: textContent
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
    } else {
      await navigator.clipboard.writeText(textContent);
      log.info('Content copied to clipboard (Web Share API not available)');
    }
  }
}

// ================================================================================
// Export singleton instance and helper functions
// ================================================================================

export const widgetHandler = new WidgetHandler();

// Convenience functions for direct widget calls
export const processDreamWidget = (params: any, sessionId?: string, userId?: string) => 
  widgetHandler.processRequest({ type: 'dream', params, sessionId, userId });

export const processHuntWidget = (params: any, sessionId?: string, userId?: string) => 
  widgetHandler.processRequest({ type: 'hunt', params, sessionId, userId });

export const processOmniWidget = (params: any, sessionId?: string, userId?: string) => 
  widgetHandler.processRequest({ type: 'omni', params, sessionId, userId });

// export const processAssistantWidget - removed (Assistant widget no longer exists)

export const processDataScientistWidget = (params: any, sessionId?: string, userId?: string) => 
  widgetHandler.processRequest({ type: 'data_scientist', params, sessionId, userId });

export const processKnowledgeWidget = (params: any, sessionId?: string, userId?: string) =>
  widgetHandler.processRequest({ type: 'knowledge', params, sessionId, userId });

export const processDigitalHubWidget = (params: any, sessionId?: string, userId?: string) =>
  widgetHandler.processRequest({ type: 'digitalhub', params, sessionId, userId });

export const processDocWidget = (params: any, sessionId?: string, userId?: string) =>
  widgetHandler.processRequest({ type: 'doc', params, sessionId, userId });

// Convenience functions for UI actions
export const processWidgetUIAction = (request: WidgetUIActionRequest) => 
  widgetHandler.processUIAction(request);

export const getWidgetHistory = (request: WidgetHistoryRequest) => 
  widgetHandler.getWidgetHistory(request);

export const clearWidgetData = (type: WidgetType) => 
  widgetHandler.processUIAction({ type, action: 'clear', actionId: 'clear' });

export default widgetHandler;