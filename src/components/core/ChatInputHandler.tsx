/**
 * ============================================================================
 * 聊天输入处理器 (ChatInputHandler.tsx) - 简化版
 * ============================================================================
 * 
 * 【核心功能】
 * - 处理用户输入和文件上传
 * - 创建用户消息并添加到聊天存储
 * - 委托所有路由决策给useChatStore的响应式系统
 * - 监控HIL (Human-in-the-Loop) 用户行为模式
 * 
 * 【架构更新】
 * ✅ 移除了硬编码的触发词逻辑
 * ✅ 使用AI驱动的意图检测 (在useChatStore中)
 * ✅ 统一的响应式消息路由系统
 * ✅ 支持文件上传自动触发Knowledge widget
 * ✅ 集成HIL状态监控和用户行为分析
 * 
 * 【处理流程】
 * 1. onBeforeSend: HIL行为监控 → 创建用户消息 → 添加到store → 返回null
 * 2. onFileSelect: HIL上下文检查 → 创建带文件的消息 → 添加到store
 * 3. useChatStore响应式系统：检测意图 → 路由到widget或chat API
 * 4. HIL监控：检测HIL响应、关键词、状态变化
 * 
 * 【重要】所有消息路由现在由useChatStore的AI系统处理
 */
import React, { useCallback } from 'react';
import { useChatActions, useHILStatus, useCurrentHILInterrupt, useHILActions } from '../../stores/useChatStore';
import { logger, LogCategory, createLogger } from '../../utils/logger';
const log = createLogger('ChatInputHandler');

interface ChatInputHandlerProps {
  children: (handlers: {
    onBeforeSend: (message: string) => string | null;
    onFileSelect: (files: FileList) => void;
  }) => React.ReactNode;
}

export const ChatInputHandler: React.FC<ChatInputHandlerProps> = ({
  children
}) => {
  const { addMessage } = useChatActions();
  
  // HIL状态监控
  const hilStatus = useHILStatus();
  const currentHILInterrupt = useCurrentHILInterrupt();
  const { setHILStatus } = useHILActions();

  const onBeforeSend = useCallback((message: string): string | null => {
    const traceId = logger.startTrace('USER_INPUT_PROCESSING');
    logger.trackUserInput(message, {});
    log.info('Processing user input', message);
    
    // HIL行为监控：检查是否是对HIL中断的响应
    const isHILResponse = hilStatus === 'waiting_for_human' && currentHILInterrupt;
    if (isHILResponse) {
      logger.info(LogCategory.USER_INPUT, 'User responding to HIL interrupt', {
        threadId: currentHILInterrupt?.thread_id,
        interruptType: currentHILInterrupt?.type,
        responseLength: message.length
      });
      log.info('HIL_MONITORING: User providing response to HIL interrupt', {
        threadId: currentHILInterrupt?.thread_id,
        responseLength: message.length
      });
      
      // 更新HIL状态为处理中
      setHILStatus('processing_response');
    }
    
    // HIL行为监控：检测用户输入模式
    const hilKeywords = ['interrupt', 'pause', 'wait', 'confirm', 'approve', 'reject', 'continue'];
    const containsHILKeywords = hilKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    if (containsHILKeywords) {
      logger.info(LogCategory.USER_INPUT, 'User input contains HIL-related keywords', {
        keywords: hilKeywords.filter(k => message.toLowerCase().includes(k)),
        hilStatus,
        hasActiveInterrupt: !!currentHILInterrupt
      });
    }
    
    // Create and add user message to chat store
    // The reactive system in useChatStore will handle widget triggering and API calls
    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'regular' as const,
      role: 'user' as const,
      content: message,
      timestamp: new Date().toISOString(),
      sessionId: 'default',
      metadata: {
        // 添加HIL上下文信息
        hilContext: {
          isHILResponse,
          hilStatus,
          responseToThreadId: isHILResponse ? currentHILInterrupt?.thread_id : null,
          containsHILKeywords,
          timestamp: new Date().toISOString()
        }
      },
      processed: false // Mark as unprocessed for reactive system
    };
    addMessage(userMessage);
    
    logger.info(LogCategory.USER_INPUT, 'User message added with HIL context', { 
      messageLength: message.length,
      isHILResponse,
      hilStatus
    });
    logger.endTrace();
    
    // Always return null - the reactive system in useChatStore handles all routing
    return null;
  }, [addMessage, hilStatus, currentHILInterrupt, setHILStatus]);

  const onFileSelect = useCallback((files: FileList) => {
    logger.info(LogCategory.USER_INPUT, 'Files selected', { 
      fileCount: files.length,
      fileNames: Array.from(files).map(f => f.name)
    });
    log.info('Files selected', Array.from(files).map(f => f.name));
    
    // HIL行为监控：文件上传在HIL上下文中的处理
    const isFileUploadDuringHIL = hilStatus !== 'idle';
    if (isFileUploadDuringHIL) {
      logger.info(LogCategory.USER_INPUT, 'File upload during HIL session', {
        hilStatus,
        hasActiveInterrupt: !!currentHILInterrupt,
        threadId: currentHILInterrupt?.thread_id,
        fileCount: files.length
      });
      log.info('HIL_MONITORING: File upload during HIL session', {
        hilStatus,
        fileCount: files.length
      });
    }
    
    if (files.length > 0) {
      // Create a message with files - the reactive system will handle knowledge widget triggering
      const fileMessage = `Analyze ${files.length} document${files.length > 1 ? 's' : ''}: ${Array.from(files).map(f => f.name).join(', ')}`;
      const userMessage = {
        id: `user-${Date.now()}`,
        type: 'regular' as const,
        role: 'user' as const,
        content: fileMessage,
        timestamp: new Date().toISOString(),
        sessionId: 'default',
        metadata: {
          // 添加HIL上下文信息到文件消息
          hilContext: {
            isFileUploadDuringHIL,
            hilStatus,
            activeThreadId: currentHILInterrupt?.thread_id || null,
            uploadTimestamp: new Date().toISOString()
          }
        },
        processed: false,
        files: Array.from(files) // Add files to trigger knowledge widget
      };
      
      addMessage(userMessage);
      logger.info(LogCategory.USER_INPUT, 'File message added with HIL context', { 
        fileCount: files.length,
        isFileUploadDuringHIL,
        hilStatus
      });
    }
  }, [addMessage, hilStatus, currentHILInterrupt]);

  return <>{children({ onBeforeSend, onFileSelect })}</>;
};