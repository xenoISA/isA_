/**
 * GlassMessageBubble Component - Ultra-modern glassmorphism message bubbles
 * Perfect for chat interfaces with advanced glass effects
 */
import React, { useState } from 'react';
import { Avatar } from './Avatar';
import { ContentRenderer } from '../content/ContentRenderer';
import { ParsedContent } from '../../../api/parsing/ContentParser';
import { UrlDisplayComponent } from '../../ui/chat/UrlDisplayComponent';

export interface GlassMessageBubbleProps {
  content: string;
  parsedContent?: ParsedContent; // 可选的解析后内容
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  isStreaming?: boolean;
  streamingStatus?: string;
  avatar?: {
    src?: string;
    alt?: string;
  };
  showAvatar?: boolean;
  showTimestamp?: boolean;
  showActions?: boolean;
  variant?: 'default' | 'elevated' | 'minimal';
  className?: string;
  style?: React.CSSProperties;
  onCopy?: () => void;
  onLike?: () => void;
  onDislike?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  hasTasks?: boolean;
}

export const GlassMessageBubble: React.FC<GlassMessageBubbleProps> = ({
  content,
  parsedContent,
  role,
  timestamp,
  isStreaming = false,
  streamingStatus,
  avatar,
  showAvatar = true,
  showTimestamp = true,
  showActions = true,
  variant = 'default',
  className = '',
  style,
  onCopy,
  onLike,
  onDislike,
  onRegenerate,
  onEdit,
  hasTasks = false
}) => {
  const [showActionButtons, setShowActionButtons] = useState(false);

  // 根据用户要求确定头像状态：showing different event states (starting, processing), but processing only when tasks exist
  const getAvatarStatus = () => {
    if (!isStreaming) return 'online';
    
    // 解析streamingStatus来确定event类型
    if (streamingStatus) {
      const status = streamingStatus.toLowerCase();
      
      // starting events - 所有starting状态
      if (status.includes('starting') || status.includes('start')) {
        return 'thinking';
      }
      
      // processing events - 但只有在有tasks时才显示
      if ((status.includes('processing') || status.includes('process')) && hasTasks) {
        return 'typing';
      }
      
      // 其他streaming状态默认为thinking
      return 'thinking';
    }
    
    return 'thinking';
  };

  // 确定是否应该显示消息气泡内的streaming状态
  const shouldShowBubbleStreamingStatus = () => {
    if (!isStreaming || !streamingStatus) return false;
    
    // 只显示LLM token的streaming状态，过滤掉其他event状态
    const status = streamingStatus.toLowerCase();
    
    // 过滤掉这些非LLM状态
    if (status.includes('starting') || 
        status.includes('processing') || 
        status.includes('interrupt') ||
        status.includes('checkpoint') ||
        status.includes('execution') ||
        status.includes('approved') ||
        status.includes('rejected') ||
        status.includes('resume')) {
      return false;
    }
    
    // 只显示纯粹的streaming状态
    return true;
  };

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

  const getBubbleStyles = () => {
    const isDark = document.documentElement.classList.contains('dark');
    
    switch (role) {
      case 'user':
        return `
          bg-gradient-to-br from-blue-500/80 via-purple-500/70 to-blue-600/80
          backdrop-blur-md border border-white/30
          text-white rounded-3xl rounded-br-xl
          shadow-xl shadow-blue-500/30
          hover:shadow-2xl hover:shadow-blue-500/40
          hover:from-blue-500/90 hover:via-purple-500/80 hover:to-blue-600/90
        `;
      case 'assistant':
        return `
          bg-[var(--mate-surface)] border border-[var(--mate-border)]
          text-gray-900 dark:text-gray-100
          rounded-3xl rounded-bl-xl
          shadow-xl shadow-black/10
          hover:shadow-2xl hover:border-[var(--mate-accent)]/20
        `;
      case 'system':
        return `
          bg-gradient-to-br from-emerald-500/70 to-green-500/70
          backdrop-blur-md border border-white/30
          text-white rounded-2xl
          shadow-xl shadow-emerald-500/30
          hover:shadow-2xl hover:shadow-emerald-500/40
        `;
      default:
        return `
          ${isDark ? 'bg-white/10' : 'bg-white/30'}
          backdrop-blur-md border border-white/20 dark:border-white/10
          text-gray-900 dark:text-gray-100 rounded-2xl
        `;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return 'transform hover:scale-[1.02] hover:-translate-y-1';
      case 'minimal':
        return 'shadow-lg';
      default:
        return 'hover:scale-[1.01]';
    }
  };

  return (
    <div 
      className={`
        glass-message-container group flex items-start mb-6
        ${role === 'user' ? 'flex-row-reverse gap-3' : 'flex-row gap-4'}
        ${className}
      `}
      style={style}
      onMouseEnter={() => setShowActionButtons(true)}
      onMouseLeave={() => setShowActionButtons(false)}
    >
      {/* Glass Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0 mt-0.5">
          <div className="relative">
            <Avatar
              src={avatar?.src}
              alt={avatar?.alt}
              variant={role}
              status={role === 'assistant' ? getAvatarStatus() : 'online'}
              showStatus={role === 'assistant'}
              size="md"
            />
            {/* Glass Avatar Ring */}
            <div className="absolute inset-0 rounded-2xl ring-1 ring-white/20 dark:ring-white/10" />
          </div>
        </div>
      )}

      {/* Glass Message Content */}
      <div 
        className={`
          message-content flex flex-col max-w-[80%] min-w-0
          ${role === 'user' ? 'items-end' : 'items-start'}
        `}
      >
        {/* Glass Message Bubble */}
        <div
          className={`
            glass-message-bubble relative group/bubble
            ${role === 'assistant' ? 'px-7 py-5' : 'px-6 py-4'} max-w-fit
            transition-all duration-300 ease-out
            ${getBubbleStyles()}
            ${getVariantStyles()}
          `}
        >
          {/* Advanced Glass Overlay — suppressed for assistant (companion surface) */}
          {role !== 'assistant' && (
            <div className={`
              absolute inset-0 rounded-3xl pointer-events-none
              bg-gradient-to-br from-white/20 via-transparent to-white/5
              ${role === 'user' ? 'rounded-br-xl' : 'rounded-bl-xl'}
            `} />
          )}

          {/* Shimmer Effect — suppressed for assistant */}
          {role !== 'assistant' && (
            <div className={`
              absolute inset-0 rounded-3xl pointer-events-none opacity-0 group-hover/bubble:opacity-100 transition-opacity
              bg-gradient-to-r from-transparent via-white/10 to-transparent
              ${role === 'user' ? 'rounded-br-xl' : 'rounded-bl-xl'}
              animate-pulse
            `} />
          )}
          
          <div className="relative text-[15px] leading-relaxed break-words font-medium">
            {parsedContent ? (
              // Render parsed content elements
              parsedContent.elements.map((element: any, index: number) => (
                <div key={index} className={element.type === 'image' ? 'mb-3' : ''}>
                  <ContentRenderer
                    content={element.content}
                    type={element.type}
                    variant="chat"
                    size="md"
                    features={{
                      markdown: element.type === 'markdown' || element.type === 'text',
                      imagePreview: element.type === 'image',
                      saveButton: element.type === 'image',
                      copyButton: element.type === 'code' || element.type === 'json',
                      wordBreak: true
                    }}
                    className={element.type === 'image' ? 'max-w-sm rounded-lg overflow-hidden' : ''}
                  />
                </div>
              ))
            ) : (
              // Fallback to simple text rendering
              <div className="whitespace-pre-wrap">
                {content}
              </div>
            )}
            
            {/* Enhanced Streaming indicator */}
            {isStreaming && (
              <span className="inline-flex items-center ml-3 px-2 py-1 rounded-full bg-blue-500/20 border border-blue-400/30">
                <span className="flex gap-1">
                  <span className="w-2 h-2 bg-blue-300 rounded-full animate-bounce shadow-sm shadow-blue-400/50" />
                  <span className="w-2 h-2 bg-blue-300 rounded-full animate-bounce shadow-sm shadow-blue-300/30" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 bg-blue-300 rounded-full animate-bounce shadow-sm shadow-blue-200/20" style={{ animationDelay: '0.2s' }} />
                </span>
                <span className="ml-2 text-xs font-semibold text-blue-200">Streaming...</span>
              </span>
            )}
          </div>
          
          {/* URL Display - only for assistant messages */}
          {role === 'assistant' && !isStreaming && (
            <div className="relative mt-4">
              <UrlDisplayComponent content={content} className="text-sm" />
            </div>
          )}
          
          {/* Enhanced Streaming status - 只显示LLM token状态 */}
          {shouldShowBubbleStreamingStatus() && (
            <div className="text-sm mt-3 px-4 py-2 rounded-full backdrop-blur-sm bg-blue-500/20 border border-blue-400/40 shadow-lg">
              <span className="inline-block w-2 h-2 bg-blue-300 rounded-full animate-pulse mr-2 shadow-sm shadow-blue-400/50"></span>
              <span className="font-semibold text-blue-200">{streamingStatus}</span>
            </div>
          )}
          
          {/* Enhanced Glass Actions */}
          {showActions && showActionButtons && role !== 'system' && (
            <div className="absolute -top-3 right-3 opacity-0 group-hover/bubble:opacity-100 transition-all duration-300">
              <div className="flex items-center gap-1 bg-white/20 dark:bg-black/20 backdrop-blur-md shadow-xl border border-white/20 dark:border-white/10 rounded-full px-2 py-1.5">
                {onCopy && (
                  <button 
                    onClick={onCopy}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white hover:bg-white/20 dark:hover:bg-white/10 rounded-full transition-all duration-200"
                    title="Copy"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}
                {role === 'assistant' && onLike && (
                  <button 
                    onClick={onLike}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-500/10 rounded-full transition-all duration-200"
                    title="Like"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </button>
                )}
                {role === 'assistant' && onDislike && (
                  <button 
                    onClick={onDislike}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all duration-200"
                    title="Dislike"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ transform: 'rotate(180deg)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </button>
                )}
                {role === 'user' && onEdit && (
                  <button
                    onClick={onEdit}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-all duration-200"
                    title="Edit message"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                {role === 'assistant' && onRegenerate && (
                  <button 
                    onClick={onRegenerate}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-all duration-200"
                    title="Regenerate"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Glass Timestamp */}
        {showTimestamp && (
          <div 
            className={`
              text-xs text-gray-500/80 dark:text-gray-400/80 mt-2 px-3
              opacity-0 group-hover:opacity-100 transition-all duration-200
              ${role === 'user' ? 'text-right' : 'text-left'}
            `}
          >
            {formatTime(timestamp)}
          </div>
        )}
      </div>
    </div>
  );
};