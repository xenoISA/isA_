/**
 * ============================================================================
 * Dream Widget Plugin (DreamWidgetPlugin.ts) - Dream Widget 插件适配器
 * ============================================================================
 * 
 * 核心职责：
 * - 将现有的 Dream Widget Store 适配为插件接口
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

const log = createLogger('DreamWidgetPlugin', LogCategory.ARTIFACT_CREATION);

/**
 * Dream Widget 插件实现
 */
export class DreamWidgetPlugin implements WidgetPlugin {
  // 插件基础信息
  id: AppId = 'dream';
  name = 'Dream Image Generator';
  icon = '🎨';
  description = 'Generate beautiful images from text descriptions using AI';
  version = '1.0.0';
  triggers = [
    'generate image',
    'create image',
    'draw',
    'paint',
    'dream',
    'imagine',
    'visualize'
  ];

  // 插件配置
  config = {
    maxPromptLength: 500,
    timeout: 30000, // 30 seconds
    retryAttempts: 2
  };

  constructor() {
    logger.debug(LogCategory.SYSTEM, '🎨 DreamWidgetPlugin initialized');
  }

  // ============================================================================
  // 插件生命周期
  // ============================================================================

  async onInit(): Promise<void> {
    logger.debug(LogCategory.SYSTEM, 'DreamWidgetPlugin: Initializing...');
    // 这里可以添加初始化逻辑，比如检查依赖、预加载资源等
    // 目前保持简单，因为 Dream Widget Store 已经处理了初始化
  }

  onDestroy(): void {
    logger.info(LogCategory.SYSTEM, '🎨 DreamWidgetPlugin: Destroying...');
    // 清理资源
  }

  // ============================================================================
  // 核心执行方法
  // ============================================================================

  /**
   * 执行图片生成
   */
  async execute(input: PluginInput): Promise<PluginOutput> {
    const startTime = Date.now();
    
    try {
      // 验证输入
      this.validateInput(input);

      logger.info(LogCategory.ARTIFACT_CREATION, '🎨 Dream Plugin: Starting image generation', {
        prompt: input.prompt?.substring(0, 100) + '...',
        context: input.context
      });

      // 调用现有的图片生成逻辑 - 传递context信息
      const imageUrl = await this.generateImage(input.prompt, {
        ...input.options,
        sessionId: input.context?.sessionId,
        userId: input.context?.userId,
        authToken: input.context?.authToken
      });

      // 构造插件输出
      const output: PluginOutput = {
        id: `dream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'image',
        content: imageUrl,
        metadata: {
          processingTime: Date.now() - startTime,
          version: 1,
          prompt: input.prompt,
          generatedAt: new Date().toISOString(),
          pluginVersion: this.version
        }
      };

      logger.info(LogCategory.ARTIFACT_CREATION, '🎨 Dream Plugin: Image generation completed', {
        outputId: output.id,
        processingTime: output.metadata?.processingTime,
        imageUrl: imageUrl?.substring(0, 80) + '...'
      });

      return output;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      logger.error(LogCategory.ARTIFACT_CREATION, '🎨 Dream Plugin: Image generation failed', {
        error: errorMessage,
        prompt: input.prompt,
        processingTime: Date.now() - startTime
      });

      throw new Error(`Dream image generation failed: ${errorMessage}`);
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
   * 生成图片 - 复用现有逻辑
   */
  private async generateImage(prompt: string, options: any = {}): Promise<string> {
    // 这里复用现有的图片生成逻辑
    // 为了最小侵入性，我们直接调用现有的 chatService 逻辑
    
    try {
      // 导入现有的 chatService（动态导入避免循环依赖）
      const { chatService } = await import('../api/chatService');
      
      // 模拟现有的 Widget Store 调用流程
      const sessionId = options.sessionId || `dream_plugin_${Date.now()}`;
      const userId = options.userId || (() => { throw new Error('User ID is required for image generation') })();
      
      // 根据mode选择正确的prompt模板
      const promptNameMap: Record<string, string> = {
        'text_to_image': 'text_to_image_prompt',
        'image_to_image': 'image_to_image_prompt',
        'style_transfer': 'style_transfer_prompt',
        'face_swap': 'face_swap_prompt',
        'professional_headshot': 'professional_headshot_prompt',
        'emoji_generation': 'emoji_generation_prompt',
        'photo_inpainting': 'photo_inpainting_prompt',
        'photo_outpainting': 'photo_outpainting_prompt',
        'sticker_generation': 'sticker_generation_prompt'
      };
      
      const promptName = promptNameMap[options.mode] || 'text_to_image_prompt';
      
      // 构造与现有系统兼容的请求
      const chatOptions = {
        session_id: sessionId,
        user_id: userId,
        prompt_name: promptName,
        prompt_args: {
          prompt: prompt,
          style_preset: options.style_preset || options.style || 'photorealistic',
          quality: options.quality || 'high'
        }
      };

      // 使用 Promise 包装现有的回调式 API
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Image generation timeout'));
        }, this.config.timeout);

        let messageCount = 0;
        let lastMessage = '';
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
            if (finalContent === '[DONE]' || accumulatedContent.length > 50) {
              clearTimeout(timeout);
              
              // Use accumulated streaming content as the real result
              const completeMessage = accumulatedContent.trim();
              log.debug(`Processing final result with accumulated content (${completeMessage.length} chars)`, { preview: completeMessage.substring(0, 100) });
            
              if (completeMessage) {
                // Extract image URL from the message
                const imageUrlMatch = completeMessage.match(/https:\/\/[^\s\)]+\.jpg|https:\/\/[^\s\)]+\.png|https:\/\/[^\s\)]+\.webp/);
                if (imageUrlMatch) {
                  resolve(imageUrlMatch[0]);
                } else {
                  // Fallback: create a result from the message
                  const fallbackResult = {
                    content: completeMessage,
                    type: 'image_description',
                    timestamp: new Date().toISOString()
                  };
                  resolve(JSON.stringify(fallbackResult));
                }
              } else {
                // No substantial content accumulated
                reject(new Error('No image content generated'));
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
            if (artifact.content && artifact.type === 'image') {
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
      logger.error(LogCategory.ARTIFACT_CREATION, '🎨 Dream Plugin: Failed to generate image', {
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
export const dreamWidgetPlugin = new DreamWidgetPlugin();

export default dreamWidgetPlugin;