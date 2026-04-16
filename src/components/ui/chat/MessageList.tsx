/**
 * ============================================================================
 * 聊天消息列表组件 (MessageList.tsx)
 * ============================================================================
 * 
 * 【核心功能】
 * - 纯UI组件，负责渲染聊天消息列表
 * - 支持用户和AI消息的显示
 * - 支持流式消息显示，实时更新内容
 * - 处理消息状态显示和时间戳
 * - 支持消息复制等交互功能
 * 
 * 【消息渲染逻辑】
 * - 如果有content内容 → 显示消息内容 + 流式光标
 * - 如果没有content但有streamingStatus → 显示状态文本(如"Processing...")
 * - 如果都没有 → 显示null
 * 
 * 【架构定位】
 * - 纯UI组件，只接收props，不使用hooks
 * - 在新架构中被ChatContentLayout使用
 * - 不处理业务逻辑，只负责消息的视觉呈现
 */
import React, { memo, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { createLogger } from '../../../utils/logger';
import { ChatMessage, ArtifactMessage, RegularMessage } from '../../../types/chatTypes';
const log = createLogger('MessageList');
import { ArtifactComponent } from './ArtifactComponent';
import { ArtifactMessageComponent } from './ArtifactMessageComponent';
import { ContentType } from '../../../types/appTypes';
import { ContentRenderer, StatusRenderer, GlassMessageBubble } from '../../shared';
import { ChatWelcome } from './ChatWelcome';
import { TaskProgressMessage } from './TaskProgressMessage';
import { TaskHandler } from '../../core/TaskHandler';
import { ChatEmbeddedTaskPanel } from './ChatEmbeddedTaskPanel';
import { MemoryCard } from './MemoryCard';
import type { MemoryRecallData } from '../../../types/memoryTypes';

import { ScheduleConfirmationCard } from './ScheduleConfirmationCard';
import { ScheduleResultCard } from './ScheduleResultCard';
import { AutonomousActivityCard } from './AutonomousActivityCard';
import { AwayActivityGroup } from './AwayActivityGroup';

import { ChannelOriginBadge } from './ChannelOriginBadge';
import { DelegationCard } from './DelegationCard';
import { DeepThinking as DeepThinkingOriginal } from '@isa/ui-web';
import type { ThinkingStep, DeepThinkingProps } from '@isa/ui-web';
// Cast to work around React types version mismatch between packages
const DeepThinking = DeepThinkingOriginal as React.FC<DeepThinkingProps>;
import { GentleNotification } from './GentleNotification';
import type { GentleNotificationType } from './GentleNotification';
import { EditableMessage } from './EditableMessage';
import { BranchNavigator } from './BranchNavigator';
import { SkillActivationCard } from './SkillActivationCard';
import type { SkillActivationStatus } from './SkillActivationCard';
import { ResearchModePanel } from './ResearchModePanel';
import { useMessageStore } from '../../../stores/useMessageStore';

// MessageActions will be implemented later

// --- Helper: detect if a message should render as a gentle notification (#122) ---
function detectGentleNotification(message: ChatMessage): { type: GentleNotificationType; content: string; source?: string } | null {
  if (message.type !== 'regular') return null;
  const reg = message as RegularMessage;
  // System messages
  if ((reg.role as string) === 'system') {
    return { type: 'info', content: reg.content || '' };
  }
  // Cross-channel forwarded messages
  if (reg.channelOrigin && reg.role === 'assistant') {
    return { type: 'channel-message', content: reg.content || '', source: reg.channelOrigin.channel };
  }
  // Autonomous trigger messages (non-scheduler — scheduler has its own card)
  if (reg.isAutonomous && reg.autonomousSource === 'trigger') {
    return { type: 'update', content: reg.content || '', source: 'trigger' };
  }
  return null;
}

// --- Helper: detect if a message is a skill activation (#123) ---
function detectSkillActivation(message: ChatMessage): { skillId: string; skillLabel: string; icon: string; status: SkillActivationStatus; errorMessage?: string } | null {
  if (message.type !== 'regular') return null;
  const reg = message as RegularMessage;
  const meta = (reg as any).skillActivation;
  if (!meta) return null;
  return {
    skillId: meta.skillId || '',
    skillLabel: meta.skillLabel || 'Skill',
    icon: meta.icon || '⚡',
    status: meta.status || 'activating',
    errorMessage: meta.errorMessage,
  };
}

// Smart time formatting function
const formatMessageTime = (timestamp: string | number | Date): string => {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Just now (less than 1 minute)
  if (diffMinutes < 1) {
    return 'Just now';
  }
  
  // Minutes ago (1-59 minutes)
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  
  // Hours ago (1-23 hours)
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  
  // Days ago (1-6 days) 
  if (diffDays < 7) {
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }
  
  // This week (show day name)
  if (diffDays < 30) {
    return messageDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  }
  
  // Older messages (show full date)
  return messageDate.toLocaleDateString([], { 
    year: messageDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    month: 'short', 
    day: 'numeric' 
  });
};

export interface MessageListProps {
  showTimestamps?: boolean;
  showAvatars?: boolean;
  autoScroll?: boolean;
  welcomeMessage?: string;
  enableMessageGrouping?: boolean;
  messageGroupingTimeGap?: number;
  onMessageClick?: (message: any) => void;
  customMessageRenderer?: (message: any, index: number) => React.ReactNode;
  className?: string;
  messages?: ChatMessage[];
  isLoading?: boolean;
  isTyping?: boolean;
  onSendMessage?: (message: string) => void;
  // Virtual scrolling properties
  virtualized?: boolean;
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  // Task information for status display
  currentTasks?: any[];
  /** Callback to regenerate a response — receives the user message content to re-send (#188) */
  onRegenerateMessage?: (userContent: string, assistantMessageId: string) => void;
  /** Callback to edit a user message and re-send (#187) */
  onEditMessage?: (editedContent: string, originalMessageId: string) => void;
}

// Virtual scrolling hook for performance optimization
const useVirtualScrolling = (
  items: any[],
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, itemHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1).map((item, index) => ({
      ...item,
      virtualIndex: visibleRange.startIndex + index,
      style: {
        position: 'absolute' as const,
        top: (visibleRange.startIndex + index) * itemHeight,
        height: itemHeight,
        width: '100%'
      }
    }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    handleScroll,
    visibleRange
  };
};

/**
* MemoryRecallSection — Shows up to 3 MemoryCards with "Show N more" expansion.
 */
const MAX_VISIBLE_RECALLS = 3;

const MemoryRecallSection = memo<{ recalls: MemoryRecallData[] }>(({ recalls }) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? recalls : recalls.slice(0, MAX_VISIBLE_RECALLS);
  const hiddenCount = recalls.length - MAX_VISIBLE_RECALLS;

  return (
    <div className="ml-12 mb-2 flex flex-col gap-1.5 max-w-[80%]">
      {visible.map((recall, idx) => (
        <MemoryCard
          key={recall.memoryId || `recall-${idx}`}
          {...recall}
          onDismiss={() => { /* dismiss handled upstream */ }}
          onCorrect={() => { /* correct handled upstream */ }}
        />
      ))}
      {!expanded && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-white/50 hover:text-white/80 transition-colors self-start px-2 py-0.5"
        >
          Show {hiddenCount} more
        </button>
      )}
    </div>
  );
});

MemoryRecallSection.displayName = 'MemoryRecallSection';

/** DelegationCards — renders active delegations from the message store.

// ---------------------------------------------------------------------------
// Gentle Notification detection helper (#122)
// ---------------------------------------------------------------------------
// Returns a GentleNotificationType if the message should render as a
// GentleNotification instead of a regular bubble. Returns null otherwise.

function detectGentleNotification(message: ChatMessage): {
  type: GentleNotificationType;
  content: string;
  source?: string;
} | null {
  if (message.type !== 'regular') return null;
  const reg = message as RegularMessage;

  // Cross-channel forwarded messages
  if (reg.autonomousSource === 'channel') {
    return {
      type: 'channel-message',
      content: reg.content,
      source: reg.metadata?.sender as string | undefined,
    };
  }

  // System info messages (metadata.type === 'system' or sender === 'system')
  if (reg.metadata?.sender === 'system' || reg.metadata?.type === 'system') {
    return {
      type: 'info',
      content: reg.content,
    };
  }

  // Mate autonomous updates (non-scheduler, non-channel)
  if (reg.isAutonomous && reg.autonomousSource === 'trigger') {
    return {
      type: 'update',
      content: reg.content,
    };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Skill Activation detection helper (#123)
// ---------------------------------------------------------------------------
// Returns props for SkillActivationCard if the message represents a widget
// execution in progress or a completed widget result that should render
// inline as a skill card.

function detectSkillActivation(message: ChatMessage): {
  skillId: string;
  skillLabel: string;
  icon: string;
  status: SkillActivationStatus;
  errorMessage?: string;
} | null {
  if (message.type !== 'regular') return null;
  const reg = message as RegularMessage;
  // Only match skill-activation placeholder messages (not regular widget user messages)
  if (!reg.metadata?.skillActivation) return null;

  const widgetType = reg.metadata.widgetType as string | undefined;
  if (!widgetType) return null;

  // Skill label lookup — matches the plugin skillLabel fields
  const SKILL_LABELS: Record<string, { label: string; icon: string }> = {
    dream: { label: 'Image Generation', icon: '\uD83C\uDFA8' },
    hunt: { label: 'Product Search', icon: '\uD83D\uDD0D' },
    omni: { label: 'Content Generation', icon: '\u26A1' },
    data_scientist: { label: 'Data Analysis', icon: '\uD83D\uDCCA' },
    knowledge: { label: 'Knowledge Analysis', icon: '\uD83E\uDDE0' },
    custom_automation: { label: 'Smart Automation', icon: '\uD83E\uDD16' },
    digitalhub: { label: 'File Management', icon: '\uD83D\uDCC2' },
    doc: { label: 'Document Studio', icon: '\uD83D\uDCDD' },
  };

  const meta = SKILL_LABELS[widgetType] || { label: widgetType, icon: '\uD83D\uDD27' };

  // Determine status based on streaming / completion flags
  const isCompleted = !!reg.metadata.skillCompleted;
  const isStreaming = !!reg.isStreaming;

  return {
    skillId: widgetType,
    skillLabel: meta.label,
    icon: meta.icon,
    status: isCompleted ? 'completed' : (isStreaming ? 'running' : 'activating'),
  };
}

/**
 * DelegationCards — renders active delegations from the message store.
 * Only displayed after the last assistant message in the stream.
 */
const DelegationCards = memo(() => {
  const activeDelegations = useMessageStore((s) => s.activeDelegations);
  if (activeDelegations.length === 0) return null;
  return (
    <>
      {activeDelegations.map((d) => (
        <DelegationCard key={d.toolCallId} delegation={d} />
      ))}
    </>
  );
});
DelegationCards.displayName = 'DelegationCards';

/**
 * MessageList - Pure UI component for displaying chat messages
 * Renders messages without any business logic or hooks
 */
export const MessageList = memo<MessageListProps>(({
  showTimestamps = true,
  showAvatars = true,
  welcomeMessage = "Hello! How can I help you today?",
  onMessageClick,
  customMessageRenderer,
  className = '',
  messages = [],
  isLoading = false,
  isTyping = false,
  onSendMessage,
  // Virtual scrolling props
  virtualized = false,
  itemHeight = 120,
  containerHeight = 400,
  overscan = 5,
  // Task information
  currentTasks = [],
  onRegenerateMessage,
  onEditMessage,
}) => {
  // Editing state for message edit + branching (#187)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  // Virtual scrolling setup
  const virtualScroll = useVirtualScrolling(
    messages,
    containerHeight,
    itemHeight,
    overscan
  );
  
  // Determine which messages to render with deduplication
  const baseMessagesToRender = virtualized ? virtualScroll.visibleItems : messages;
  
  // Ensure message uniqueness by ID to prevent duplicate rendering
  const messagesToRender = useMemo(() => {
    const seen = new Set();
    return baseMessagesToRender.filter(msg => {
      if (seen.has(msg.id)) {
        return false;
      }
      seen.add(msg.id);
      return true;
    });
  }, [baseMessagesToRender]);

  // ---------------------------------------------------------------------------
  // Group consecutive autonomous messages for "While you were away" treatment.
  // Produces a Set of message IDs that belong to a group of 2+ consecutive
  // autonomous messages, plus a Map of groupStartId -> RegularMessage[].
  // ---------------------------------------------------------------------------
  const { awayGroups, groupedIds } = useMemo(() => {
    const groups = new Map<string, RegularMessage[]>();
    const ids = new Set<string>();

    let runStart = -1;
    for (let i = 0; i <= messagesToRender.length; i++) {
      const msg = messagesToRender[i];
      const isAuto =
        msg &&
        msg.type === 'regular' &&
        (msg as RegularMessage).isAutonomous;

      if (isAuto) {
        if (runStart === -1) runStart = i;
      } else {
        // End of a run — check if long enough to group
        if (runStart !== -1) {
          const runLen = i - runStart;
          if (runLen >= 2) {
            const groupMsgs = messagesToRender
              .slice(runStart, i)
              .map((m) => m as RegularMessage);
            const startId = groupMsgs[0].id;
            groups.set(startId, groupMsgs);
            for (const m of groupMsgs) ids.add(m.id);
          }
        }
        runStart = -1;
      }
    }

    return { awayGroups: groups, groupedIds: ids };
  }, [messagesToRender]);

  // Default message renderer
  const renderMessage = (message: ChatMessage, index: number) => {
    // Use custom renderer if provided, but fall back to default if it returns null
    if (customMessageRenderer) {
      const customResult = customMessageRenderer(message, index);
      if (customResult !== null) {
        return customResult;
      }
      // If custom renderer returns null, continue to default rendering
    }

    // --- Gentle Notification (#122) ---
    const gentleInfo = detectGentleNotification(message);
    if (gentleInfo) {
      return (
        <div className="mb-4">
          <GentleNotification
            type={gentleInfo.type}
            content={gentleInfo.content}
            timestamp={message.timestamp}
            source={gentleInfo.source}
            onDismiss={() => { /* notification dismissed */ }}
          />
        </div>
      );
    }

    // --- Skill Activation Card for in-progress widget user requests (#123) ---
    const skillInfo = detectSkillActivation(message);
    if (skillInfo) {
      return (
        <div className="mb-4">
          <SkillActivationCard
            skillId={skillInfo.skillId}
            skillLabel={skillInfo.skillLabel}
            icon={skillInfo.icon}
            status={skillInfo.status}
            errorMessage={skillInfo.errorMessage}
            onExpand={() => onMessageClick?.(message)}
          />
        </div>
      );
    }

    // --- Skill Activation Card for completed artifact messages (#123) ---
    if (message.type === 'artifact') {
      const artifactMessage = message as ArtifactMessage;
      const wt = artifactMessage.artifact.widgetType;
      const SKILL_LABELS_ART: Record<string, { label: string; icon: string }> = {
        dream: { label: 'Image Generation', icon: '\uD83C\uDFA8' },
        hunt: { label: 'Product Search', icon: '\uD83D\uDD0D' },
        omni: { label: 'Content Generation', icon: '\u26A1' },
        data_scientist: { label: 'Data Analysis', icon: '\uD83D\uDCCA' },
        knowledge: { label: 'Knowledge Analysis', icon: '\uD83E\uDDE0' },
        custom_automation: { label: 'Smart Automation', icon: '\uD83E\uDD16' },
        digitalhub: { label: 'File Management', icon: '\uD83D\uDCC2' },
        doc: { label: 'Document Studio', icon: '\uD83D\uDCDD' },
      };
      const artMeta = SKILL_LABELS_ART[wt];

      // If we have skill metadata, render as an inline skill card with result
      if (artMeta) {
        const isStreaming = artifactMessage.isStreaming;
        const resultPreview = !isStreaming && artifactMessage.artifact.content && artifactMessage.artifact.content !== 'Loading...'
          ? (
            <div className="ml-12" style={{ width: 'calc(100% - 3rem)' }}>
              <ArtifactMessageComponent
                artifactMessage={artifactMessage}
                onReopen={() => onMessageClick?.(artifactMessage)}
              />
            </div>
          )
          : undefined;

        return (
          <div className="mb-6">
            <SkillActivationCard
              skillId={wt}
              skillLabel={artMeta.label}
              icon={artMeta.icon}
              status={isStreaming ? 'running' : 'completed'}
              result={resultPreview}
              onExpand={() => onMessageClick?.(artifactMessage)}
            />
          </div>
        );
      }
    }

    // Check if this is a new ArtifactMessage type
    if (message.type === 'artifact') {
      const artifactMessage = message as ArtifactMessage;
      return (
        <div 
          className="mb-6"
          style={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}
        >
          <div style={{ width: '100%', maxWidth: '100%' }}>
            {showAvatars && (
              <div className="flex items-center mb-3" style={{ justifyContent: 'flex-start' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 shadow-lg">
                  {artifactMessage.artifact.widgetType === 'dream' ? '🎨' : 
                   artifactMessage.artifact.widgetType === 'hunt' ? '🔍' :
                   artifactMessage.artifact.widgetType === 'omni' ? '⚡' :
                   artifactMessage.artifact.widgetType === 'knowledge' ? '🧠' :
                   artifactMessage.artifact.widgetType === 'data_scientist' ? '📊' : '🤖'}
                </div>
                <span className="ml-2 text-sm font-medium text-white/90">
                  {artifactMessage.artifact.widgetName || artifactMessage.artifact.widgetType}
                </span>
              </div>
            )}
            
            {/* Use new ArtifactMessageComponent for new artifact messages */}
            <div className="ml-12" style={{ width: 'calc(100% - 3rem)' }}>
              <ArtifactMessageComponent
                artifactMessage={artifactMessage}
                onReopen={() => {
                  // Handle artifact reopening - delegate to message click handler
                  if (onMessageClick) {
                    onMessageClick(artifactMessage);
                  }
                }}
              />
            </div>
          </div>
        </div>
      );
    }
    
    // Handle legacy artifact messages (for backward compatibility)
    const isStreaming = message.isStreaming;
    const hasContent = (message as any).content && (message as any).content.trim().length > 0;
    const hasStatus = message.streamingStatus && message.streamingStatus.trim().length > 0;
    const isLegacyArtifact = (message as any).metadata?.type === 'artifact';
    
    // Handle legacy artifact messages specially
    if (isLegacyArtifact) {
      const artifactData = message.metadata?.artifactData;
      const appIcon = (typeof message.metadata?.appIcon === 'string' ? message.metadata.appIcon : null) || '🤖';
      const appName = (typeof message.metadata?.appName === 'string' ? message.metadata.appName : null) || 'AI';
      
      return (
        <div 
          className="mb-6"
          style={{ width: '100%', display: 'flex', justifyContent: 'flex-start' }}
        >
          <div style={{ width: '100%', maxWidth: '100%' }}>
            {showAvatars && (
              <div className="flex items-center mb-3" style={{ justifyContent: 'flex-start' }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm backdrop-blur-sm border border-white/20 text-white/90 ${
                  isStreaming 
                    ? 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30' 
                    : 'bg-white/10 shadow-lg'
                }`}>
                  {appIcon}
                </div>
                <span className="ml-2 text-sm font-medium text-white/90">{appName}</span>
                {isStreaming && (
                  <div className="ml-3 flex items-center space-x-2 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                    <div className="flex space-x-1">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse shadow-sm shadow-blue-400/50"></div>
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full animate-pulse delay-75 shadow-sm shadow-blue-300/30"></div>
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full animate-pulse delay-150 shadow-sm shadow-blue-200/20"></div>
                    </div>
                    <span className="text-xs font-medium text-white/70">
                      {message.streamingStatus || 'Processing...'}
                    </span>
                  </div>
                )}
                
                {/* Compact Task Progress in artifact header - always show for AI messages */}
                <div className="ml-3">
                  <TaskProgressMessage 
                    messageId={message.id}
                    compact={true}
                    showControls={false}
                    inline={true}
                    isStreaming={isStreaming}
                    className="text-xs"
                  />
                </div>
              </div>
            )}
            
            {/* Use ArtifactComponent for artifact content */}
            <div className="ml-12" style={{ width: 'calc(100% - 3rem)' }}>
              <ArtifactComponent
                artifact={{
                  id: message.id,
                  appId: (message.metadata?.appId as any) || 'assistant',
                  appName: appName,
                  appIcon: appIcon,
                  title: (typeof message.metadata?.title === 'string' ? message.metadata.title : null) || 'Generated Content',
                  userInput: (typeof message.metadata?.userInput === 'string' ? message.metadata.userInput : null) || '',
                  createdAt: message.timestamp,
                  isOpen: false,
                  generatedContent: (artifactData && 
                    typeof artifactData === 'object' && 
                    'type' in artifactData && 
                    'content' in artifactData &&
                    typeof artifactData.type === 'string' &&
                    typeof artifactData.content === 'string') 
                    ? (artifactData as { type: ContentType; content: string; thumbnail?: string; metadata?: any })
                    : (hasContent || isStreaming) ? {
                        type: 'text' as ContentType,
                        content: isStreaming ? 'Loading...' : message.content
                      } : undefined
                }}
                onReopen={() => {
                  // Handle artifact reopening - could emit an event or callback
                  log.info('Artifact reopened', message.id);
                }}
              />
            </div>
          </div>
        </div>
      );
    }

    // Autonomous messages — routed through specialized cards.
    // Scheduler messages keep the dedicated ScheduleResultCard; all others
    // use the general-purpose AutonomousActivityCard.
    if (
      message.type === 'regular' &&
      (message as RegularMessage).isAutonomous
    ) {
      if ((message as RegularMessage).autonomousSource === 'scheduler') {
        return (
          <div className="mb-6" onClick={() => onMessageClick?.(message)}>
            <ScheduleResultCard message={message as RegularMessage} />
          </div>
        );
      }
      return (
        <div className="mb-4" onClick={() => onMessageClick?.(message)}>
          <AutonomousActivityCard message={message as RegularMessage} />
        </div>
      );
    }

    // Default message rendering using GlassMessageBubble with TaskProgress
    return (
      <div className="mb-6" onClick={() => onMessageClick?.(message)}>
{/* Memory recall cards — rendered above the assistant bubble */}
        {message.role === 'assistant' && message.type === 'regular' && (message as RegularMessage).memoryRecalls && (message as RegularMessage).memoryRecalls!.length > 0 && (
          <MemoryRecallSection
            recalls={(message as RegularMessage).memoryRecalls!}
          />
        )}

{/* Schedule confirmation card — inline in assistant messages */}
        {message.type === 'regular' && (message as RegularMessage).scheduleData && (
          <ScheduleConfirmationCard data={(message as RegularMessage).scheduleData!} />
        )}

        {/* AI Message with Enhanced Header */}
        {message.role === 'assistant' && (
          <div className="flex items-center mb-3">
            {showAvatars && (
<div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg ${
                  isStreaming
                    ? 'bg-gradient-to-br from-[#7c8cf5] to-[#a78bfa] shadow-[#7c8cf5]/30'
                    : 'bg-gradient-to-br from-[#7c8cf5] to-[#a78bfa]'
                }`}>
                  M
                </div>
                {/* Breathing status dot */}
                {!isStreaming && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[var(--mate-surface)] animate-mate-breathe" />
                )}
              </div>
            )}
            <span className="ml-2 text-sm font-display font-semibold text-[var(--mate-accent)]">Mate</span>
            {/* Streaming Status */}
            {isStreaming && (
              <div className="ml-3 flex items-center space-x-2 bg-blue-500/20 px-3 py-1.5 rounded-full border border-blue-400/40 shadow-lg">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse shadow-sm shadow-blue-400/50"></div>
                  <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse delay-75 shadow-sm shadow-blue-300/30"></div>
                  <div className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse delay-150 shadow-sm shadow-blue-200/20"></div>
                </div>
                <span className="text-sm font-semibold text-blue-200">
                  {message.streamingStatus || 'Processing...'}
                </span>
              </div>
            )}

            {/* Task Progress for ALL AI messages */}
            <div className="ml-3">
              <TaskProgressMessage
                messageId={message.id}
                compact={true}
                showControls={false}
                inline={true}
                isStreaming={isStreaming}
                className="text-sm"
              />
            </div>
          </div>
        )}

        {/* Deep Thinking — collapsible reasoning block above assistant response (#185) */}
        {message.role === 'assistant' && message.type === 'regular' && (message as RegularMessage).thinkingSteps && (message as RegularMessage).thinkingSteps!.length > 0 && (
          <div className="ml-12 mb-3">
            <DeepThinking
              steps={(message as RegularMessage).thinkingSteps!.map((s): ThinkingStep => ({
                ...s,
                timestamp: new Date(s.timestamp),
              }))}
            />
          </div>
        )}

        {/* Research Mode — multi-step research progress inline (#208) */}
        {message.role === 'assistant' && message.type === 'regular' && (message as RegularMessage).researchSteps && (message as RegularMessage).researchSteps!.length > 0 && (
          <div className="ml-12 mb-3">
            <ResearchModePanel
              steps={(message as RegularMessage).researchSteps!}
              isActive={(message as RegularMessage).researchSteps!.some(s => s.status === 'active' || s.status === 'pending')}
            />
          </div>
        )}

        {/* Message Content — editable for user messages (#187) */}
        <div className={message.role === 'assistant' ? 'ml-12' : ''}>
          {editingMessageId === message.id ? (
            <EditableMessage
              initialContent={message.content}
              onSubmit={(newContent) => {
                setEditingMessageId(null);
                onEditMessage?.(newContent, message.id);
              }}
              onCancel={() => setEditingMessageId(null)}
            />
          ) : (
            <GlassMessageBubble
              content={message.content}
              parsedContent={message.type === 'regular' ? message.parsedContent : undefined}
              role={message.role as 'user' | 'assistant' | 'system'}
              timestamp={message.timestamp}
              isStreaming={isStreaming}
              streamingStatus={message.streamingStatus}
              showAvatar={message.role !== 'assistant'}
              showTimestamp={showTimestamps}
              showActions={true}
              variant="default"
              hasTasks={currentTasks.length > 0}
              onCopy={() => navigator.clipboard.writeText(message.content)}
              onEdit={message.role === 'user' && onEditMessage ? () => setEditingMessageId(message.id) : undefined}
              onRegenerate={message.role === 'assistant' && onRegenerateMessage ? () => {
                const msgIndex = messages.findIndex(m => m.id === message.id);
                for (let i = msgIndex - 1; i >= 0; i--) {
                  const prev = messages[i];
                  if (prev.role === 'user' && 'content' in prev) {
                    onRegenerateMessage(prev.content, message.id);
                    break;
                  }
                }
              } : undefined}
            />
          )}
        </div>

        {/* Channel origin badge — shows when message came from another channel */}
        {message.type === 'regular' && (message as RegularMessage).channelOrigin && (
          <div className={`mt-1 ${message.role === 'assistant' ? 'ml-12' : ''}`}>
            <ChannelOriginBadge
              channel={(message as RegularMessage).channelOrigin!.channel}
              channelMessageId={(message as RegularMessage).channelOrigin!.channelMessageId}
              timestamp={(message as RegularMessage).channelOrigin!.timestamp}
            />
          </div>
        )}

        {/* Delegation Cards — show after the last assistant message */}
        {message.role === 'assistant' && <DelegationCards />}
      </div>
    );
  };

  // Render virtual or regular content
  const renderContent = () => {
    if (virtualized) {
      return (
        <div
          ref={virtualScroll.containerRef}
          className={`conversation-stream ${className}`}
          style={{
            height: containerHeight,
            overflow: 'auto',
            position: 'relative'
          }}
          onScroll={virtualScroll.handleScroll}
        >
          <div style={{ height: virtualScroll.totalHeight, position: 'relative' }}>
            {messagesToRender.map((message) => (
              <div key={`${message.id}-virtual-${message.virtualIndex}`} style={message.style}>
                {renderMessage(message, message.virtualIndex)}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className={`conversation-stream ${className}`}>
        {/* Dynamic Widget-Driven Welcome */}
        {messages.length === 0 && (
          <ChatWelcome onSendMessage={onSendMessage} />
        )}

        {/* Messages - Regular rendering with autonomous grouping */}
        {messagesToRender.map((message, index) => {
          // Skip messages that are part of an away group (rendered by group leader)
          if (groupedIds.has(message.id) && !awayGroups.has(message.id)) {
            return null;
          }

          // Render the AwayActivityGroup for the first message in a group
          if (awayGroups.has(message.id)) {
            return (
              <div key={`away-group-${message.id}`}>
                <AwayActivityGroup messages={awayGroups.get(message.id)!} />
              </div>
            );
          }

          return (
            <div key={`${message.id}-${index}`}>
              {renderMessage(message, index)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <TaskHandler>
      <div className={virtualized ? '' : 'relative'}>
        {renderContent()}

        {/* Show additional content only in non-virtualized mode or append to container */}
        {!virtualized && (
          <>

            {/* Typing indicator */}
            {isTyping && !messages.some(m => m.isStreaming) && (
              <div className="flex justify-start mb-4">
                <div className="max-w-[80%]">
                  {showAvatars && (
                    <div className="flex items-center mb-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 shadow-lg">
                        AI
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 rounded-xl bg-white/8 backdrop-blur-md border border-white/10">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-bounce shadow-lg shadow-blue-400/50"></div>
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full animate-bounce delay-100 shadow-md shadow-blue-300/30"></div>
                        <div className="w-2 h-2 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full animate-bounce delay-200 shadow-sm shadow-blue-200/20"></div>
                      </div>
                      <span className="text-sm text-white/70">AI is typing...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && !isTyping && !messages.some(m => m.isStreaming) && (
              <div className="text-center py-8">
                <div className="flex items-center justify-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-bounce shadow-lg shadow-blue-400/50"></div>
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-300 to-purple-300 rounded-full animate-bounce delay-100 shadow-md shadow-blue-300/30"></div>
                    <div className="w-3 h-3 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full animate-bounce delay-200 shadow-sm shadow-blue-200/20"></div>
                  </div>
                  <span className="text-sm font-medium text-white/70">Processing your request...</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </TaskHandler>
  );
});