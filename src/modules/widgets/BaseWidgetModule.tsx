/**
 * ============================================================================
 * Base Widget Module (BaseWidgetModule.tsx) - Standardized Widget Module Base Class
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Provides standardized business logic patterns for all widget modules
 * - Manages common widget state operations and lifecycle
 * - Integrates with BaseWidget UI component seamlessly
 * - Simplifies individual widget module implementations
 * 
 * Features:
 * - Output history management
 * - Streaming status handling
 * - Standard processing patterns
 * - Triggered input processing
 * - Error handling and logging
 */
import React, { useCallback, useEffect, useState, useRef, ReactNode } from 'react';
import { useWidget, useWidgetActions } from '../../hooks/useWidget';
import { logger, LogCategory, createLogger } from '../../utils/logger';
const log = createLogger('BaseWidget');
import { WidgetType } from '../../types/widgetTypes';
import { getChatServiceInstance } from '../../hooks/useChatService';
import widgetHandler from '../../components/core/WidgetHandler';
import { 
  BaseWidget, 
  OutputHistoryItem, 
  EditAction, 
  ManagementAction 
} from '../../components/ui/widgets/BaseWidget';
import {
  DreamWidgetParams,
  DreamWidgetResult,
  HuntWidgetParams,
  HuntWidgetResult,
  OmniWidgetParams,
  OmniWidgetResult,
  DataScientistWidgetParams,
  DataScientistWidgetResult,
  KnowledgeWidgetParams,
  KnowledgeWidgetResult
} from '../../types/widgetTypes';

// Generic widget params interface
interface BaseWidgetParams {
  [key: string]: any;
}

// Generic widget result interface
interface BaseWidgetResult {
  [key: string]: any;
}

// Result extraction configuration for different widget types
interface ResultExtractorConfig {
  outputType: 'text' | 'image' | 'data' | 'analysis' | 'search' | 'knowledge';
  extractResult?: (widgetData: any) => {
    finalResult: any;
    outputContent: string;
    title?: string;
  } | null;
}

// Widget module configuration
interface WidgetModuleConfig<TParams = BaseWidgetParams, TResult = BaseWidgetResult> {
  // Widget identification
  type: WidgetType;
  title: string;
  icon: string;
  
  // Processing configuration
  sessionIdPrefix: string;
  
  // Output management
  maxHistoryItems?: number;
  
  // Result processing configuration
  resultExtractor?: ResultExtractorConfig;
  
  // Callbacks
  onProcessStart?: (params: TParams) => void;
  onProcessComplete?: (result: TResult) => void;
  onProcessError?: (error: Error) => void;
  
  // Input processing
  extractParamsFromInput?: (input: string) => TParams | null;
  
  // UI customization
  editActions?: EditAction[];
  managementActions?: ManagementAction[];
}

// Base widget module props
interface BaseWidgetModuleProps<TParams = BaseWidgetParams, TResult = BaseWidgetResult> {
  config: WidgetModuleConfig<TParams, TResult>;
  triggeredInput?: string;
  onResultGenerated?: (result: TResult) => void;
  children: ReactNode | ((moduleProps: {
    isProcessing: boolean;
    outputHistory: OutputHistoryItem[];
    currentOutput: OutputHistoryItem | null;
    isStreaming: boolean;
    streamingContent: string;
    startProcessing: (params: TParams) => Promise<void>;
    onSelectOutput: (item: OutputHistoryItem) => void;
    onClearHistory: () => void;
  }) => ReactNode);
}

/**
 * BaseWidgetModule - Standardized business logic base for all widget modules
 */
export const BaseWidgetModule = <TParams extends BaseWidgetParams, TResult extends BaseWidgetResult>({
  config,
  triggeredInput,
  onResultGenerated,
  children
}: BaseWidgetModuleProps<TParams, TResult>) => {
  
  // Local state for output history and current processing
  const [outputHistory, setOutputHistory] = useState<OutputHistoryItem[]>([]);
  const [currentOutput, setCurrentOutput] = useState<OutputHistoryItem | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use refs to access current state without triggering dependencies
  const isProcessingRef = useRef(isProcessing);
  const currentOutputRef = useRef(currentOutput);
  
  // Update refs when state changes
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
  useEffect(() => { currentOutputRef.current = currentOutput; }, [currentOutput]);
  
  log.debug(`${config.type} initializing with config`, {
    type: config.type,
    title: config.title,
    maxHistory: config.maxHistoryItems,
    hasTriggeredInput: !!triggeredInput
  });
  
  // Add item to output history
  const addToHistory = useCallback((item: Omit<OutputHistoryItem, 'id' | 'timestamp'>) => {
    const historyItem: OutputHistoryItem = {
      ...item,
      id: `${config.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date()
    };
    
    setOutputHistory(prev => {
      const newHistory = [historyItem, ...prev];
      const maxItems = config.maxHistoryItems || 50;
      return newHistory.slice(0, maxItems);
    });
    
    setCurrentOutput(historyItem);
    
    log.debug(`${config.type} added to history`, { title: historyItem.title });
    return historyItem;
  }, [config.type, config.maxHistoryItems]);
  
  // Update current output item
  const updateCurrentOutput = useCallback((updates: Partial<OutputHistoryItem>) => {
    log.debug(`${config.type} updateCurrentOutput called`, {
      hasCurrentOutput: !!currentOutput,
      updates
    });
    
    if (!currentOutput) {
      log.warn(`${config.type} no currentOutput to update, creating new one`);
      // 创建新的output如果不存在
      const newOutput = {
        id: `output_${Date.now()}`,
        timestamp: new Date(),
        type: 'text' as const,
        title: 'Processing...',
        content: '',
        ...updates
      };
      setCurrentOutput(newOutput);
      log.debug(`${config.type} created new currentOutput`);
      return;
    }
    
    const updatedOutput = { ...currentOutput, ...updates };
    setCurrentOutput(updatedOutput);
    
    log.debug(`${config.type} updated currentOutput`);
    
    // Update in history as well
    setOutputHistory(prev =>
      prev.map(item => item.id === currentOutput.id ? updatedOutput : item)
    );
  }, [currentOutput, config.type]);
  
  // Start processing with streaming support
  const startProcessing = useCallback(async (params: TParams): Promise<void> => {
    log.info(`${config.type} starting processing`, { params });
    
    // 🆕 检查是否在Plugin模式中运行
    const isPluginMode = typeof window !== 'undefined' && (window as any).__CHAT_MODULE_PLUGIN_MODE__;
    
    if (isPluginMode) {
      log.info(`${config.type} plugin mode detected - delegating to ChatModule`);
      
      setIsProcessing(true);
      setIsStreaming(true);
      setStreamingContent('Processing request...');
      
      // Add initial output item
      const outputItem = addToHistory({
        type: 'text',
        title: `Processing ${config.type} request...`,
        content: 'Starting processing...',
        params,
        isStreaming: true
      });
      
      // Call start callback
      config.onProcessStart?.(params);
      
      // In Plugin mode, directly emit event to ChatModule - skip WidgetHandler to avoid double processing
      try {
        log.info('Emitting widget:request directly to ChatModule');
        
        // Get ChatModule's event emitter
        const eventEmitter = (window as any).__CHAT_MODULE_EVENT_EMITTER__;
        if (!eventEmitter) {
          throw new Error('ChatModule event emitter not found');
        }
        
        const requestId = `${config.type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        
        // Listen for result from ChatModule
        const resultPromise = new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => {
            eventEmitter.off('widget:result', resultHandler);
            reject(new Error('Widget request timeout'));
          }, 60000);
          
          const resultHandler = (eventData: any) => {
            if (eventData.requestId === requestId) {
              clearTimeout(timeout);
              eventEmitter.off('widget:result', resultHandler);
              
              if (eventData.success) {
                resolve(eventData.result);
              } else {
                reject(new Error(eventData.error || 'Plugin execution failed'));
              }
            }
          };
          
          eventEmitter.on('widget:result', resultHandler);
          
          // Emit request directly to ChatModule
          eventEmitter.emit('widget:request', {
            widgetType: config.type,
            action: 'process',
            params,
            requestId,
            sessionId: `${config.sessionIdPrefix}_${Date.now()}`,
            userId: 'widget_user'
          });
        });
        
        // Wait for result
        const result = await resultPromise;
        log.info('Received result from ChatModule');
        
        // Update UI state after receiving result
        setIsProcessing(false);
        setIsStreaming(false);
        setStreamingContent('');
        
        // Update current output with the result - use proper formatting for different widget types
        if (result && result.content) {
          let formattedContent: string;
          let displayTitle: string;
          
          // Handle Hunt widget search results properly
          if (config.type === 'hunt' && Array.isArray(result.content)) {
            // For Hunt widget, format search results properly
            const searchResults = result.content as any[];
            if (searchResults.length > 0) {
              const firstResult = searchResults[0];
              formattedContent = firstResult?.content || firstResult?.description || 'Search result';
              displayTitle = firstResult?.title || `Search Results (${searchResults.length} found)`;
              
              // Add all results to history
              searchResults.forEach((searchResult: any, index: number) => {
                addToHistory({
                  type: 'text',
                  title: searchResult?.title || `Search Result ${index + 1}`,
                  content: searchResult?.content || searchResult?.description || 'Search result',
                  params: {
                    query: searchResult?.query,
                    originalType: searchResult?.type || 'search_response',
                    url: searchResult?.url
                  }
                });
              });
            } else {
              formattedContent = 'No search results found';
              displayTitle = 'Search completed';
            }
          } else if (config.type === 'dream' && result.type === 'image') {
            // Handle Dream widget image results
            if (typeof result.content === 'string' && result.content.startsWith('http')) {
              formattedContent = result.content; // Keep the image URL
              displayTitle = `Generated Image`;
              
              // Add to history with image type
              addToHistory({
                type: 'image',
                title: `Generated Image`,
                content: result.content,
                params: {
                  prompt: result.metadata?.prompt,
                  originalType: 'dream_image',
                  imageUrl: result.content
                }
              });
            } else {
              formattedContent = 'Image generation completed';
              displayTitle = 'Dream completed';
            }
          } else if (config.type === 'omni' && result.type === 'text') {
            // Handle Omni widget text results
            if (typeof result.content === 'string' && result.content.length > 0) {
              formattedContent = result.content;
              displayTitle = `Generated Content`;
              
              // Add to history with text type
              addToHistory({
                type: 'text',
                title: `Generated Content`,
                content: result.content,
                params: {
                  prompt: result.metadata?.prompt,
                  originalType: 'omni_content'
                }
              });
            } else {
              formattedContent = 'Content generation completed';
              displayTitle = 'Omni completed';
            }
          } else if (config.type === 'data_scientist' && result.type === 'analysis') {
            // Handle Data Scientist widget analysis results
            const analysisContent = result.content;
            if (typeof analysisContent === 'object' && analysisContent.analysis) {
              formattedContent = analysisContent.analysis.summary || 'Analysis completed';
              displayTitle = `Data Analysis Results`;
              
              // Add to history with analysis type
              addToHistory({
                type: 'analysis',
                title: `Data Analysis Results`,
                content: JSON.stringify(analysisContent, null, 2),
                params: {
                  prompt: result.metadata?.prompt,
                  originalType: 'data_analysis',
                  analysisType: analysisContent.analysis?.type || 'general'
                }
              });
            } else if (typeof analysisContent === 'string') {
              formattedContent = analysisContent;
              displayTitle = `Data Analysis Results`;
              
              // Add to history with analysis type
              addToHistory({
                type: 'analysis',
                title: `Data Analysis Results`,
                content: analysisContent,
                params: {
                  prompt: result.metadata?.prompt,
                  originalType: 'data_analysis'
                }
              });
            } else {
              formattedContent = 'Data analysis completed';
              displayTitle = 'Data Scientist completed';
            }
          } else if (config.type === 'knowledge' && result.type === 'knowledge') {
            // Handle Knowledge widget results
            if (typeof result.content === 'string' && result.content.length > 0) {
              formattedContent = result.content;
              displayTitle = `Knowledge Analysis Results`;
              
              // Add to history with knowledge type
              addToHistory({
                type: 'text',
                title: `Knowledge Analysis Results`,
                content: result.content,
                params: {
                  prompt: result.metadata?.prompt,
                  originalType: 'knowledge_analysis'
                }
              });
            } else {
              formattedContent = 'Knowledge analysis completed';
              displayTitle = 'Knowledge completed';
            }
          } else if (config.type === 'custom_automation' && result.type === 'analysis') {
            // Handle Custom Automation widget results
            const automationContent = result.content;
            if (typeof automationContent === 'object' && automationContent.summary) {
              formattedContent = automationContent.summary;
              displayTitle = `Automation Results`;
              
              // Add to history with automation type
              addToHistory({
                type: 'analysis',
                title: `Automation Results`,
                content: JSON.stringify(automationContent, null, 2),
                params: {
                  prompt: result.metadata?.prompt,
                  originalType: 'automation_result',
                  templateUsed: automationContent.templateUsed || 'generic'
                }
              });
            } else if (typeof automationContent === 'string') {
              formattedContent = automationContent;
              displayTitle = `Automation Results`;
              
              // Add to history with automation type
              addToHistory({
                type: 'analysis',
                title: `Automation Results`,
                content: automationContent,
                params: {
                  prompt: result.metadata?.prompt,
                  originalType: 'automation_result'
                }
              });
            } else {
              formattedContent = 'Automation process completed';
              displayTitle = 'Custom Automation completed';
            }
          } else {
            // Default handling for other widget types
            formattedContent = Array.isArray(result.content) ? JSON.stringify(result.content, null, 2) : String(result.content);
            displayTitle = `${config.type} completed`;
          }
          
          updateCurrentOutput({
            content: formattedContent,
            title: displayTitle,
            type: config.type === 'dream' && result.type === 'image' ? 'image' as const : 'text' as const,
            isStreaming: false
          });
        }
        
        // Call completion callback
        config.onProcessComplete?.(result);
        
        log.info('Plugin mode processing completed, UI updated');
        return;
        
      } catch (error) {
        log.error('Failed to communicate with ChatModule', error);
        setIsProcessing(false);
        setIsStreaming(false);
        throw error;
      }
    }
    
    // Independent mode - process directly  
    log.info(`${config.type} independent mode - processing directly`);
    
    setIsProcessing(true);
    setIsStreaming(true);
    setStreamingContent('');
    
    // Add initial output item
    const outputItem = addToHistory({
      type: 'text',
      title: `Processing ${config.type} request...`,
      content: 'Starting processing...',
      params,
      isStreaming: true
    });
    
    // Call start callback
    config.onProcessStart?.(params);
    
    try {
      // Use WidgetHandler to route request with streaming callbacks
      log.debug(`${config.type} forwarding data to WidgetHandler (Independent mode)`, {
        type: config.type,
        params
      });
      logger.info(LogCategory.ARTIFACT_CREATION, `${config.type} module routing request via WidgetHandler (Independent mode)`, { params });
      
      // 🆕 等待Plugin结果时显示loading状态
      setIsStreaming(true);
      setStreamingContent('Processing request...');
      
      const pluginResult = await widgetHandler.processRequest({
        type: config.type,
        params,
        sessionId: `${config.sessionIdPrefix}_${Date.now()}`,
        userId: 'widget_user'
      });
      
      log.debug(`${config.type} WidgetHandler returned`, { pluginResult });
      
      // 🆕 如果是Plugin模式，处理返回的结果
      if (pluginResult && pluginResult.content) {
        log.debug(`${config.type} received Plugin result`);
        
        // 处理不同类型的Plugin返回格式
        let processedContent = pluginResult.content;
        let title = `${config.type} completed`;
        
        // 对于Hunt Plugin，content是搜索结果数组
        if (config.type === 'hunt' && Array.isArray(pluginResult.content)) {
          const results = pluginResult.content;
          if (results.length > 0) {
            // 使用第一个结果的内容作为显示内容
            processedContent = results[0].content || results[0].description || JSON.stringify(results[0]);
            title = `Search Results (${results.length} found)`;
            
            log.debug(`${config.type} processed Hunt results`, { resultCount: results.length });
          } else {
            processedContent = 'No search results found';
            title = 'Search completed - No results';
          }
        }
        
        // 更新Widget的output显示
        const outputUpdate = {
          type: pluginResult.type === 'data' ? 'search' : (pluginResult.type || 'text'),
          title: title,
          content: processedContent,
          timestamp: new Date(),
          metadata: pluginResult.metadata
        };
        
        log.debug(`${config.type} updating currentOutput`, { title: outputUpdate.title });
        updateCurrentOutput(outputUpdate);
        
        // 🆕 清除所有loading状态
        setIsStreaming(false);
        setStreamingContent('');
        setIsProcessing(false); // 🚀 设置处理完成
        
        // 调用完成回调
        config.onProcessComplete?.(pluginResult);
        
      } else {
        log.info(`${config.type} request successfully routed to store (Independent mode)`);
      }
      
    } catch (error) {
      log.error(`${config.type} WidgetHandler request failed`, error);
      logger.error(LogCategory.ARTIFACT_CREATION, `${config.type} WidgetHandler request failed`, { error, params });
      
      // Update output with error
      updateCurrentOutput({
        type: 'error',
        title: `${config.type} processing failed`,
        content: error instanceof Error ? error.message : 'Unknown error occurred',
        isStreaming: false
      });
      
      // 🆕 清除loading状态 
      setIsStreaming(false);
      setStreamingContent('');
      
      config.onProcessError?.(error instanceof Error ? error : new Error('Unknown error'));
      
      setIsProcessing(false);
    }
  }, [config, addToHistory, updateCurrentOutput, onResultGenerated]);
  
  // Handle triggered input processing
  useEffect(() => {
    if (triggeredInput && !isProcessing && config.extractParamsFromInput) {
      log.info(`${config.type} processing triggered input`, { triggeredInput });
      
      const params = config.extractParamsFromInput(triggeredInput);
      if (params) {
        startProcessing(params);
      } else {
        log.warn(`${config.type} could not extract params from input`, { triggeredInput });
      }
    }
  }, [triggeredInput, isProcessing, config, startProcessing]);
  
  // Real-time monitoring of widget store states (replace placeholder timer with actual state monitoring)
  const widget = useWidget();
  const widgetState = widget.currentWidgetState;
  const widgetData = widget.currentWidgetData;
  
  // Widget data management - no debug logging needed
  
  useEffect(() => {
    // Monitor actual widget state changes instead of using placeholder timer
    if (config.type === widget.currentApp) {
      const wasProcessing = isProcessingRef.current;
      const isCurrentlyProcessing = widgetState !== 'idle';
      const currentOutputValue = currentOutputRef.current;
      
      // State monitoring - no debug logging needed
      
      // If processing just completed OR if we have new data that needs to be displayed
      const hasNewData = widgetData && (
        (widgetData.generatedImage && (!currentOutputValue || currentOutputValue.content !== widgetData.generatedImage)) ||
        (widgetData.generatedContent && (!currentOutputValue || currentOutputValue.content !== widgetData.generatedContent)) ||
        (widgetData.searchResults && widgetData.searchResults.length > 0 && (!currentOutputValue || currentOutputValue.type !== 'data')) ||
        (widgetData.analysisResult && (!currentOutputValue || currentOutputValue.type !== 'analysis'))
      );
      
      if ((wasProcessing && !isCurrentlyProcessing) || hasNewData) {
        // Processing completed or new data available - no debug logging needed
        
        // Get actual result from widget data using configurable extractor
        let finalResult = null;
        let outputType = config.resultExtractor?.outputType || 'text';
        let outputContent = 'Processing completed successfully';
        let outputTitle = `${config.type} processing completed`;
        
        if (config.resultExtractor?.extractResult) {
          const extractedResult = config.resultExtractor.extractResult(widgetData);
          if (extractedResult) {
            finalResult = extractedResult.finalResult;
            outputContent = extractedResult.outputContent;
            outputTitle = extractedResult.title || outputTitle;
            log.debug(`${config.type} extracted result using custom extractor`, {
              hasResult: !!finalResult,
              contentLength: outputContent?.length
            });
          }
        } else {
          // Fallback: use generic extraction based on widget data structure
          if (widgetData?.generatedImage) {
            finalResult = { imageUrl: widgetData.generatedImage, prompt: widgetData.params?.prompt };
            outputType = 'image';
            outputContent = widgetData.generatedImage;
          } else if (widgetData?.searchResults?.length > 0) {
            finalResult = { searchResults: widgetData?.searchResults || [], query: widgetData?.lastQuery || '' };
            outputType = 'data';
            outputContent = widgetData?.searchResults?.[0]?.content || JSON.stringify(widgetData?.searchResults || []);
          } else if (widgetData?.generatedContent) {
            finalResult = { content: widgetData.generatedContent, params: widgetData?.params };
            outputType = 'text';
            outputContent = widgetData.generatedContent;
          } else if (widgetData?.analysisResult) {
            finalResult = { analysis: widgetData.analysisResult };
            outputType = 'analysis';
            outputContent = typeof widgetData.analysisResult === 'string' ? widgetData.analysisResult : JSON.stringify(widgetData.analysisResult);
          }
        }
        
        // ❌ REMOVED: Chat message updates moved to ChatModule
        // Widget modules should only manage their internal state
        // All chat message updates are now handled by ChatModule via PluginManager callbacks
        
        // Update output with actual results (create new output if none exists)
        const updatedOutput = {
          ...(currentOutputValue || {}),
          type: outputType as any,
          title: outputTitle,
          content: outputContent,
          isStreaming: false,
          id: currentOutputValue?.id || `output_${Date.now()}`,
          timestamp: currentOutputValue?.timestamp || new Date()
        };
        
        setCurrentOutput(updatedOutput);
        
        // Update in history as well
        setOutputHistory(prev => {
          if (currentOutputValue && prev.some(item => item.id === currentOutputValue.id)) {
            // Update existing item in history
            return prev.map(item => item.id === currentOutputValue.id ? updatedOutput : item);
          } else {
            // Add new item to history
            return [updatedOutput, ...prev].slice(0, config.maxHistoryItems || 10);
          }
        });
        
        setIsProcessing(false);
        setIsStreaming(false);
        setStreamingContent('');
        
        // Notify parent with real results
        if (finalResult) {
          // Safe type conversion - we've validated the structure above
          const typedResult = finalResult as unknown as TResult;
          config.onProcessComplete?.(typedResult);
          onResultGenerated?.(typedResult);
        }
        
        logger.info(LogCategory.ARTIFACT_CREATION, `${config.type} real processing completed, parent notified`);
      }
    }
  }, [widgetState, widgetData?.generatedImage, widgetData?.searchResults, widgetData?.generatedContent, widgetData?.analysisResult, config.type, widget.currentApp]);
  
  // Clear output history
  const handleClearHistory = useCallback(() => {
    log.info(`${config.type} clearing output history`);
    setOutputHistory([]);
    setCurrentOutput(null);
    setIsStreaming(false);
    setStreamingContent('');
    logger.info(LogCategory.ARTIFACT_CREATION, `${config.type} output history cleared`);
  }, [config.type]);
  
  // Handle output selection
  const handleSelectOutput = useCallback((item: OutputHistoryItem) => {
    log.debug(`${config.type} selected output`, { title: item.title });
    setCurrentOutput(item);
  }, [config.type]);
  
  // Default edit actions
  const defaultEditActions: EditAction[] = [
    {
      id: 'copy',
      label: 'Copy',
      icon: '📋',
      onClick: (content) => {
        navigator.clipboard.writeText(typeof content === 'string' ? content : JSON.stringify(content));
        log.info(`${config.type} content copied to clipboard`);
      }
    },
    {
      id: 'download',
      label: 'Download',
      icon: '💾',
      onClick: (content) => {
        const blob = new Blob([typeof content === 'string' ? content : JSON.stringify(content, null, 2)], 
          { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${config.type}_output_${Date.now()}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        log.info(`${config.type} content downloaded`);
      }
    }
  ];
  
  // Default management actions
  const defaultManagementActions: ManagementAction[] = [
    {
      id: 'refresh',
      label: 'Refresh',
      icon: '🔄',
      onClick: () => {
        if (currentOutput?.params) {
          startProcessing(currentOutput.params);
        }
      },
      disabled: isProcessing || !currentOutput?.params
    },
    {
      id: 'clear',
      label: 'Clear',
      icon: '🗑️',
      onClick: handleClearHistory,
      variant: 'danger' as const,
      disabled: outputHistory.length === 0
    }
  ];
  
  // Combine with custom actions
  const editActions = [...defaultEditActions, ...(config.editActions || [])];
  // Use only widget-specific management actions to avoid duplication and maintain exactly 4 buttons
  const managementActions = config.managementActions || [];
  
  // Support both render prop pattern and direct children
  if (typeof children === 'function') {
    // Render prop pattern - provide module state to children
    return (
      <>
        {children({
          isProcessing,
          outputHistory,
          currentOutput,
          isStreaming,
          streamingContent,
          startProcessing,
          onSelectOutput: handleSelectOutput,
          onClearHistory: handleClearHistory
        })}
      </>
    );
  }
  
  // Direct children pattern - wrap with BaseWidget
  // 🆕 检测运行模式
  const currentMode = typeof window !== 'undefined' && (window as any).__CHAT_MODULE_PLUGIN_MODE__ 
    ? 'plugin' 
    : 'independent';
    
  return (
    <BaseWidget
      title={config.title}
      icon={config.icon}
      mode={currentMode}
      isProcessing={isProcessing}
      outputHistory={outputHistory}
      currentOutput={currentOutput}
      isStreaming={isStreaming}
      streamingContent={streamingContent}
      editActions={editActions}
      managementActions={managementActions}
      onSelectOutput={handleSelectOutput}
      onClearHistory={handleClearHistory}
      chatIntegration={currentMode === 'plugin' ? { enabled: true } : undefined}
    >
      {children}
    </BaseWidget>
  );
};

// Export utility function to create widget module configs
export const createWidgetConfig = <TParams extends BaseWidgetParams, TResult extends BaseWidgetResult>(
  config: WidgetModuleConfig<TParams, TResult>
): WidgetModuleConfig<TParams, TResult> => config;

// Export types for use by individual widget modules
export type {
  BaseWidgetParams,
  BaseWidgetResult,
  WidgetModuleConfig,
  BaseWidgetModuleProps
};