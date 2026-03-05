/**
 * ============================================================================
 * useChatService Hook - ChatService Context Integration
 * ============================================================================
 * 
 * 提供对 AIProvider 中 ChatService 实例的访问
 * 解决 store 直接导入全局实例的架构问题
 */

import { useChatService as useAIChatService } from '../providers/AIProvider';
import { createLogger } from '../utils/logger';
import { ChatService } from '../api/chatService';

const log = createLogger('useChatService');

// 创建一个全局变量来存储当前的 ChatService 实例
let globalChatServiceInstance: ChatService | null = null;

/**
 * 设置全局 ChatService 实例
 * 由 AIProvider 调用
 */
export const setChatServiceInstance = (instance: ChatService | null) => {
  log.debug('setChatServiceInstance called:', {
    hasInstance: !!instance,
    instanceType: instance?.constructor?.name
  });
  globalChatServiceInstance = instance;
};

/**
 * 获取当前的 ChatService 实例
 * 优先使用 Context 中的实例，如果不可用则使用全局实例
 */
export const getChatServiceInstance = (): ChatService | null => {
  // Getting ChatService instance
  return globalChatServiceInstance;
};

/**
 * Hook 形式的 ChatService 访问
 * 在 React 组件中使用
 */
export const useChatService = () => {
  return useAIChatService();
}; 