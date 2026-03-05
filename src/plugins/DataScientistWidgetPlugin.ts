/**
 * ============================================================================
 * DataScientist Widget Plugin (DataScientistWidgetPlugin.ts) - DataScientist Widget 插件适配器
 * ============================================================================
 * 
 * 核心职责：
 * - 将现有的 DataScientist Widget Store 适配为插件接口
 * - 提供统一的插件执行入口
 * - 保持与现有代码的兼容性
 * 
 * 设计原则：
 * - 最小侵入性，复用现有逻辑
 * - 标准化插件接口实现
 * - 保持错误处理一致性
 */

import { WidgetPlugin, PluginInput, PluginOutput } from '../types/pluginTypes';
import { AppId } from '../types/appTypes';
import { logger, LogCategory, createLogger } from '../utils/logger';

const log = createLogger('DataScientistWidgetPlugin', LogCategory.ARTIFACT_CREATION);

/**
 * DataScientist Widget 插件实现
 */
export class DataScientistWidgetPlugin implements WidgetPlugin {
  // 插件基础信息
  id: AppId = 'data-scientist';
  name = 'DataWise Analytics';
  icon = '📊';
  description = 'Advanced data analysis and insights generation';
  version = '1.0.0';
  triggers = [
    'analyze data',
    'data analysis',
    'statistics',
    'data science',
    'csv analysis',
    'data insights',
    'analytics'
  ];

  // 插件配置
  config = {
    maxPromptLength: 1000,
    timeout: 90000, // 90 seconds for complex analysis
    retryAttempts: 2
  };

  constructor() {
    logger.debug(LogCategory.SYSTEM, '📊 DataScientistWidgetPlugin initialized');
  }

  // ============================================================================
  // 插件生命周期
  // ============================================================================

  async onInit(): Promise<void> {
    logger.debug(LogCategory.SYSTEM, 'DataScientistWidgetPlugin: Initializing...');
  }

  onDestroy(): void {
    logger.info(LogCategory.SYSTEM, '📊 DataScientistWidgetPlugin: Destroying...');
  }

  // ============================================================================
  // 核心执行方法
  // ============================================================================

  /**
   * 执行数据分析
   */
  async execute(input: PluginInput): Promise<PluginOutput> {
    const startTime = Date.now();
    
    try {
      // 验证输入
      this.validateInput(input);

      logger.info(LogCategory.ARTIFACT_CREATION, '📊 DataScientist Plugin: Starting data analysis', {
        prompt: input.prompt?.substring(0, 100) + '...',
        context: input.context
      });

      // 调用现有的数据分析逻辑 - 传递context信息
      const analysisResult = await this.performAnalysis(input.prompt, {
        ...input.options,
        sessionId: input.context?.sessionId,
        userId: input.context?.userId,
        authToken: input.context?.authToken
      });

      // 构造插件输出
      const output: PluginOutput = {
        id: `datascientist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'analysis',
        content: analysisResult,
        metadata: {
          processingTime: Date.now() - startTime,
          version: 1,
          prompt: input.prompt,
          generatedAt: new Date().toISOString(),
          pluginVersion: this.version
        }
      };

      logger.info(LogCategory.ARTIFACT_CREATION, '📊 DataScientist Plugin: Analysis completed', {
        outputId: output.id,
        processingTime: output.metadata?.processingTime,
        analysisType: typeof analysisResult
      });

      return output;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(LogCategory.ARTIFACT_CREATION, '📊 DataScientist Plugin: Analysis failed', {
        error: errorMessage,
        prompt: input.prompt,
        processingTime: Date.now() - startTime
      });

      throw new Error(`DataScientist analysis failed: ${errorMessage}`);
    }
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 验证输入参数
   */
  private validateInput(input: PluginInput): void {
    if (!input.prompt || typeof input.prompt !== 'string') {
      throw new Error('Analysis request is required and must be a string');
    }

    if (input.prompt.trim().length === 0) {
      throw new Error('Analysis request cannot be empty');
    }

    if (input.prompt.length > this.config.maxPromptLength) {
      throw new Error(`Analysis request too long. Max length: ${this.config.maxPromptLength} characters`);
    }
  }

  /**
   * 执行数据分析 - 复用现有逻辑
   */
  private async performAnalysis(request: string, options: any = {}): Promise<any> {
    try {
      // 导入现有的 chatService（动态导入避免循环依赖）
      const { chatService } = await import('../api/chatService');
      
      // 模拟现有的 Widget Store 调用流程
      const sessionId = options.sessionId || `datascientist_plugin_${Date.now()}`;
      const userId = options.userId || (() => { throw new Error('User ID is required for data analysis') })();
      
      // 构造与现有系统兼容的请求
      const chatOptions = {
        session_id: sessionId,
        user_id: userId,
        prompt_name: 'csv_analyze_prompt',
        prompt_args: {
          prompt: request,
          csv_url: options.csv_url || options.dataUrl || '',
          depth: options.depth || 'comprehensive'
        }
      };

      // 使用 Promise 包装现有的回调式 API
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Analysis timeout'));
        }, this.config.timeout);

        let analysisResult: any = null;
        let messageCount = 0;
        let accumulatedContent = '';

        const callbacks = {
          onStreamContent: (contentChunk: string) => {
            log.debug('onStreamContent chunk', { preview: contentChunk?.substring(0, 50) });
            accumulatedContent += contentChunk;
          },
          
          onStreamComplete: (finalContent?: string) => {
            messageCount++;
            log.debug(`onStreamComplete - Final message (${messageCount} total)`, { preview: finalContent?.substring(0, 100) });
            
            // Only process on [DONE] or when we have substantial accumulated content
            if (finalContent === '[DONE]' || accumulatedContent.length > 100) {
              clearTimeout(timeout);
              
              // Use accumulated streaming content as the real result
              const completeMessage = accumulatedContent.trim();
              log.debug(`Processing final result with accumulated content (${completeMessage.length} chars)`, { preview: completeMessage.substring(0, 100) });
            
              if (completeMessage) {
                try {
                  // Try to parse JSON analysis result
                  const result = JSON.parse(completeMessage);
                  analysisResult = result;
                  resolve(result);
                } catch (parseError) {
                  // If parsing fails, create structured analysis from text
                  const structuredResult = {
                    analysis: {
                      summary: completeMessage,
                      insights: [],
                      recommendations: []
                    },
                    visualizations: [],
                    statistics: {
                      dataPoints: 0,
                      columns: []
                    }
                  };
                  resolve(structuredResult);
                }
              } else {
                // No substantial content accumulated
                reject(new Error('No analysis result generated'));
              }
            } else {
              // Skip this onStreamComplete call - waiting for the final one
              log.debug(`Skipping intermediate completion (${finalContent}), waiting for [DONE] or substantial content`);
            }
          },
          
          onStreamStart: (messageId: string, status?: string) => {
            log.debug('onStreamStart', { messageId, status });
          },
          
          onStreamStatus: (status: string) => {
            log.debug('onStreamStatus', { status });
          },
          
          onArtifactCreated: (artifact: any) => {
            // Handle artifacts if they're created
            if (artifact.content && !analysisResult) {
              clearTimeout(timeout);
              try {
                const result = JSON.parse(artifact.content);
                resolve(result);
              } catch (parseError) {
                resolve({
                  analysis: {
                    summary: artifact.content,
                    insights: [],
                    recommendations: []
                  },
                  visualizations: [],
                  statistics: {
                    dataPoints: 0,
                    columns: []
                  }
                });
              }
            }
          },
          
          onError: (error: any) => {
            clearTimeout(timeout);
            reject(error);
          }
        };

        // 调用现有的 chatService - 修正参数顺序
        // Note: ChatService.sendMessage expects (message, sessionId, callbacks, userId)
        chatService.sendMessage(request, chatOptions.session_id, callbacks, chatOptions.user_id)
          .catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
      });

    } catch (error) {
      logger.error(LogCategory.ARTIFACT_CREATION, '📊 DataScientist Plugin: Failed to perform analysis', {
        error,
        request
      });
      throw error;
    }
  }
}

// ============================================================================
// 默认导出
// ============================================================================

// 创建插件实例
export const dataScientistWidgetPlugin = new DataScientistWidgetPlugin();

export default dataScientistWidgetPlugin;