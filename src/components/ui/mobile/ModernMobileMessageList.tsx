/**
 * Modern Mobile Message List Component - Glassmorphism Pro
 * Ultra-modern glass effects with ChatGPT, Claude, Gemini design patterns
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { createLogger } from '../../../utils/logger';
import { ChatMessage } from '../chat/ChatLayout';

const log = createLogger('ModernMobileMessageList');
import { GlassMessageBubble, EmptyState, TypingIndicator, GlassCard } from '../../shared';

export interface ModernMobileMessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  isTyping?: boolean;
  userAvatarUrl?: string;
  botAvatarUrl?: string;
}

export const ModernMobileMessageList: React.FC<ModernMobileMessageListProps> = ({
  messages,
  isLoading = false,
  isTyping = false,
  userAvatarUrl,
  botAvatarUrl
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Ensure message uniqueness by ID
  const uniqueMessages = React.useMemo(() => {
    const seen = new Set();
    return messages.filter(msg => {
      if (seen.has(msg.id)) {
        return false;
      }
      seen.add(msg.id);
      return true;
    });
  }, [messages]);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Format timestamp for mobile display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div 
      ref={containerRef}
      className="
        glass-mobile-message-list
        flex-1 overflow-y-auto
        px-4 py-6
        space-y-6
        scroll-smooth
      "
      style={{
        scrollBehavior: 'smooth',
        WebkitOverflowScrolling: 'touch',
        background: 'transparent'
      }}
    >
      {/* Glassmorphism Welcome State */}
      {messages.length === 0 && !isLoading && (
        <div className="flex-1 min-h-[60vh]">
          <EmptyState
            variant="welcome"
            suggestions={[
              '🚀 Help me code something',
              '📝 Write and analyze text', 
              '🎨 Creative brainstorming',
              '📊 Analyze some data'
            ]}
          />
        </div>
      )}

      {/* Glassmorphism Messages */}
      {uniqueMessages.map((message, index) => (
        <GlassMessageBubble
          key={message.id}
          content={message.content}
          role={message.role as 'user' | 'assistant' | 'system'}
          timestamp={message.timestamp}
          isStreaming={message.isStreaming}
          streamingStatus={message.streamingStatus}
          avatar={{
            src: message.role === 'user' ? userAvatarUrl : botAvatarUrl,
            alt: message.role === 'user' ? 'User' : 'AI Assistant'
          }}
          variant="elevated"
          className="animate-fadeIn"
          style={{ animationDelay: `${index * 50}ms` }}
          onCopy={() => {
            navigator.clipboard?.writeText(message.content);
          }}
          onLike={() => {
            log.debug('Message liked:', message.id);
          }}
          onDislike={() => {
            log.debug('Message disliked:', message.id);
          }}
          onRegenerate={() => {
            log.debug('Message regenerate:', message.id);
          }}
        />
      ))}

      {/* Glassmorphism Typing Indicator */}
      {isTyping && (
        <TypingIndicator
          variant="modern"
          message="AI is crafting response"
          avatarSrc={botAvatarUrl}
          size="md"
          className="animate-fadeIn"
        />
      )}

      {/* Glassmorphism Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <GlassCard variant="subtle" className="p-4 flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
            <span className="text-white/80 font-medium">Loading messages...</span>
          </GlassCard>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};