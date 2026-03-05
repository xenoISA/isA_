/**
 * 聊天服务 - React Native版本
 * 基于isA_项目的ChatService简化实现
 */

import { BaseApiService } from '../../../../src/api/BaseApiService';
import { API_PATHS } from '../../../../src/config/apiConfig';

export interface ChatMessage {
  message: string;
  user_id: string;
  session_id: string;
  prompt_name?: string;
  prompt_args?: any;
}

export interface ChatCallbacks {
  onStreamStart?: (messageId: string) => void;
  onStreamContent?: (content: string) => void;
  onStreamComplete?: (finalContent?: string) => void;
  onError?: (error: Error) => void;
  onToolStart?: (toolName: string) => void;
  onToolCompleted?: (toolName: string, result?: any) => void;
}

export class ChatService {
  private apiService: BaseApiService;

  constructor(apiService?: BaseApiService) {
    this.apiService = apiService || new BaseApiService();
  }

  // 发送消息
  async sendMessage(
    message: ChatMessage,
    callbacks: ChatCallbacks
  ): Promise<void> {
    try {
      // 对于React Native，我们先用简单的POST请求
      // 真实项目中需要实现SSE流式处理
      const response = await this.apiService.post(API_PATHS.CHAT, message);

      if (!response.success) {
        callbacks.onError?.(new Error(response.error || 'Failed to send message'));
        return;
      }

      // 模拟流式响应
      callbacks.onStreamStart?.(response.data?.message_id || 'msg-' + Date.now());
      
      // 如果响应中有内容，直接返回
      if (response.data?.content) {
        callbacks.onStreamContent?.(response.data.content);
        callbacks.onStreamComplete?.(response.data.content);
      }

    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // 创建SSE连接（需要特殊库支持）
  createSSEConnection(
    message: ChatMessage,
    callbacks: ChatCallbacks
  ): any {
    // 这里需要使用react-native-sse或类似库
    // 暂时返回null，表示需要实现
    console.warn('SSE not implemented yet for React Native');
    return null;
  }

  // 设置认证token
  setAuthToken(token: string): void {
    this.apiService.setAuthProvider(async () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }));
  }
}

export const chatService = new ChatService();
