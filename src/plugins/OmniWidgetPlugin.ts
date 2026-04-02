/**
 * ============================================================================
 * Omni Widget Plugin (OmniWidgetPlugin.ts) - Omni Widget 插件适配器
 * ============================================================================
 * 
 * 核心职责：
 * - 将现有的 Omni Widget Store 适配为插件接口
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

const log = createLogger('OmniWidgetPlugin', LogCategory.ARTIFACT_CREATION);

/**
 * Omni Widget 插件实现
 */
export class OmniWidgetPlugin implements WidgetPlugin {
  // 插件基础信息
  id: AppId = 'omni';
  name = 'Omni Content Generator';
  icon = '⚡';
  description = 'Multi-purpose content creation with customizable tone and length';
  version = '1.0.0';
  skillLabel = 'Content Generation';
  conversationalTriggerPrefix = 'Let me create that content...';
  triggers = [
    'generate content',
    'create content',
    'write',
    'compose',
    'omni',
    'general content',
    'article',
    'blog post',
    'story'
  ];

  // 插件配置
  config = {
    maxPromptLength: 1000,
    timeout: 60000, // 60 seconds for longer content
    retryAttempts: 2
  };

  constructor() {
    logger.debug(LogCategory.SYSTEM, '⚡ OmniWidgetPlugin initialized');
  }

  // ============================================================================
  // 插件生命周期
  // ============================================================================

  async onInit(): Promise<void> {
    logger.debug(LogCategory.SYSTEM, 'OmniWidgetPlugin: Initializing...');
  }

  onDestroy(): void {
    logger.info(LogCategory.SYSTEM, '⚡ OmniWidgetPlugin: Destroying...');
  }

  // ============================================================================
  // 核心执行方法
  // ============================================================================

  /**
   * 执行内容生成
   */
  async execute(input: PluginInput): Promise<PluginOutput> {
    const startTime = Date.now();
    
    try {
      // 验证输入
      this.validateInput(input);

      logger.info(LogCategory.ARTIFACT_CREATION, '⚡ Omni Plugin: Starting content generation', {
        prompt: input.prompt?.substring(0, 100) + '...',
        context: input.context
      });

      // 调用现有的内容生成逻辑 - 传递context信息
      const content = await this.generateContent(input.prompt, {
        ...input.options,
        sessionId: input.context?.sessionId,
        userId: input.context?.userId,
        authToken: input.context?.authToken
      });

      // 构造插件输出
      const output: PluginOutput = {
        id: `omni_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'text',
        content: content,
        metadata: {
          processingTime: Date.now() - startTime,
          version: 1,
          prompt: input.prompt,
          generatedAt: new Date().toISOString(),
          pluginVersion: this.version
        }
      };

      logger.info(LogCategory.ARTIFACT_CREATION, '⚡ Omni Plugin: Content generation completed', {
        outputId: output.id,
        processingTime: output.metadata?.processingTime,
        contentLength: content?.length
      });

      return output;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(LogCategory.ARTIFACT_CREATION, '⚡ Omni Plugin: Content generation failed', {
        error: errorMessage,
        prompt: input.prompt,
        processingTime: Date.now() - startTime
      });

      throw new Error(`Omni content generation failed: ${errorMessage}`);
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
      throw new Error('Prompt is required and must be a string');
    }

    if (input.prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    if (input.prompt.length > this.config.maxPromptLength) {
      throw new Error(`Prompt too long. Max length: ${this.config.maxPromptLength} characters`);
    }
  }

  /**
   * 生成内容 - 复用现有逻辑
   */
  private async generateContent(prompt: string, options: any = {}): Promise<string> {
    try {
      // 导入现有的 chatService（动态导入避免循环依赖）
      const { chatService } = await import('../api/chatService');
      
      // 模拟现有的 Widget Store 调用流程
      const sessionId = options.sessionId || `omni_plugin_${Date.now()}`;
      const userId = options.userId || (() => { throw new Error('User ID is required for content generation') })();
      
      // 构造与现有系统兼容的请求
      const chatOptions = {
        session_id: sessionId,
        user_id: userId,
        prompt_name: 'general_content_prompt',
        prompt_args: {
          subject: prompt,
          depth: options.depth || 'deep',
          reference_urls: Array.isArray(options.referenceUrls) ? options.referenceUrls.join('\n') : (options.referenceUrls || ''),
          reference_text: options.referenceText || ''
        }
      };

      // 使用 Promise 包装现有的回调式 API
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Content generation timeout'));
        }, this.config.timeout);

        let completeContent = '';
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
                resolve(completeMessage);
              } else {
                // No substantial content accumulated
                reject(new Error('No content generated'));
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
            if (artifact.type === 'text' && artifact.content && !completeContent) {
              clearTimeout(timeout);
              resolve(artifact.content);
            }
          },
          
          onError: (error: any) => {
            clearTimeout(timeout);
            reject(error);
          }
        };

        // ChatService.sendMessage expects (message, metadata, token, callbacks)
        chatService.sendMessage(prompt, { user_id: chatOptions.user_id, session_id: chatOptions.session_id, prompt_name: chatOptions.prompt_name, prompt_args: chatOptions.prompt_args }, '', callbacks)
          .catch(error => {
            clearTimeout(timeout);
            reject(error);
          });
      });

    } catch (error) {
      logger.error(LogCategory.ARTIFACT_CREATION, '⚡ Omni Plugin: Failed to generate content', {
        error,
        prompt
      });
      throw error;
    }
  }
}

// ============================================================================
// 默认导出
// ============================================================================

// 创建插件实例
export const omniWidgetPlugin = new OmniWidgetPlugin();

export default omniWidgetPlugin;