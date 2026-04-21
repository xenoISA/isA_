/**
 * ============================================================================
 * 聊天内容布局组件 (ChatContentLayout.tsx)
 * ============================================================================
 * 
 * 【核心功能】
 * - 聊天消息显示的容器组件
 * - 管理自动滚动和消息渲染
 * - 桥接ChatLayout和ConversationStreamModule
 * 
 * 【消息传递】
 * 直接将messages属性传递给ConversationStreamModule进行渲染
 * 不处理消息创建或修改，只负责显示
 * 
 * 【重要】这是纯显示组件，不会创建或修改消息
 */
import React, { useEffect, useRef } from 'react';
import { MessageList } from './MessageList';
import { ChatMessage } from '../../../types/chatTypes';

export interface ChatContentLayoutProps {
  showTimestamps?: boolean;
  showAvatars?: boolean;
  autoScroll?: boolean;
  welcomeMessage?: string;
  enableMessageGrouping?: boolean;
  messageGroupingTimeGap?: number;
  onMessageClick?: (message: any) => void;
  customMessageRenderer?: (message: any, index: number) => React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  messages?: ChatMessage[];  // Accept messages as prop
  isLoading?: boolean;       // Accept loading state as prop
  isTyping?: boolean;        // Accept typing state as prop
  onSendMessage?: (message: string) => void;
  currentTasks?: any[];      // Accept current tasks for status display
  onEditMessage?: (editedContent: string, originalMessageId: string) => void;
  onRegenerateMessage?: (userContent: string, assistantMessageId: string) => void;
}

/**
 * Standalone ChatContentLayout for main_app
 * Uses centralized useAppStore for messages
 */
export const ChatContentLayout: React.FC<ChatContentLayoutProps> = ({
  showTimestamps = true,
  showAvatars = true,
  autoScroll = true,
  welcomeMessage = "Hello! I'm your AI assistant. How can I help you today?",
  enableMessageGrouping = true,
  messageGroupingTimeGap = 60000,
  onMessageClick,
  customMessageRenderer,
  className = '',
  children,
  messages = [],  // Use prop instead of context
  isLoading = false,
  isTyping = false,
  onSendMessage,
  currentTasks = [],
  onEditMessage,
  onRegenerateMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get current streaming status from the last message
  const streamingMessage = messages.find(m => m.isStreaming);
  const streamingStatus = streamingMessage?.streamingStatus;
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);

  return (
    <div 
      className={`isa-chat-content-layout overflow-y-auto p-4 space-y-4 ${className}`}
      style={{
        flex: '1 !important',
        overflow: 'auto !important',
        background: 'transparent !important',
        padding: '1rem !important',
        display: 'flex !important',
        flexDirection: 'column',
        alignItems: 'stretch',
        height: '100%',
        width: '100%'
      }}
    >

      <MessageList
        showTimestamps={showTimestamps}
        showAvatars={showAvatars}
        autoScroll={false} // Handled by this component
        welcomeMessage={welcomeMessage}
        enableMessageGrouping={enableMessageGrouping}
        messageGroupingTimeGap={messageGroupingTimeGap}
        onMessageClick={onMessageClick}
        customMessageRenderer={customMessageRenderer}
        className="isa-conversation-stream"
        messages={messages}
        currentTasks={currentTasks}
        isLoading={isLoading}
        isTyping={isTyping}
        onSendMessage={onSendMessage}
        onEditMessage={onEditMessage}
        onRegenerateMessage={onRegenerateMessage}
      />

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />

      {/* Optional extra content */}
      {children && (
        <div className="isa-chat-content-extra">
          {children}
        </div>
      )}
    </div>
  );
};