/**
 * ============================================================================
 * ScrollFollowUpActions - 滚动触发的AI快捷操作栏
 * ============================================================================
 * 
 * 功能特性：
 * - 内容滚动时从底部弹出
 * - 水平布局的快捷AI操作
 * - 自动隐藏机制
 * - 美观的glassmorphism设计
 * - 可配置的操作按钮
 */

import React, { useEffect, useState } from 'react';
import { createLogger } from '../../../utils/logger';

const log = createLogger('ScrollFollowUpActions');

// ================================================================================
// 类型定义
// ================================================================================

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  onClick: () => void;
  disabled?: boolean;
}

export interface ScrollFollowUpActionsProps {
  isVisible: boolean;
  actions?: QuickAction[];
  className?: string;
  position?: 'bottom' | 'top';
  autoHideDelay?: number;
  showAIBranding?: boolean;
  onQuickEdit?: () => void;
  onAskQuestion?: () => void;
  onSummarize?: () => void;
  onTranslate?: () => void;
  onCopyContent?: () => void;
  onShareContent?: () => void;
}

// ================================================================================
// 默认快捷操作
// ================================================================================

const getDefaultActions = (props: ScrollFollowUpActionsProps): QuickAction[] => [
  ...(props.onQuickEdit ? [{
    id: 'quick-edit',
    label: 'Quick Edit',
    icon: '✏️',
    description: 'Fast AI-powered editing',
    variant: 'primary' as const,
    onClick: props.onQuickEdit,
  }] : []),
  ...(props.onAskQuestion ? [{
    id: 'ask-question',
    label: 'Ask',
    icon: '❓',
    description: 'Ask AI about this content',
    variant: 'success' as const,
    onClick: props.onAskQuestion,
  }] : []),
  ...(props.onSummarize ? [{
    id: 'summarize',
    label: 'Summarize',
    icon: '📝',
    description: 'Create summary',
    variant: 'secondary' as const,
    onClick: props.onSummarize,
  }] : []),
  ...(props.onTranslate ? [{
    id: 'translate',
    label: 'Translate',
    icon: '🌐',
    description: 'Translate content',
    variant: 'warning' as const,
    onClick: props.onTranslate,
  }] : []),
  ...(props.onCopyContent ? [{
    id: 'copy',
    label: 'Copy',
    icon: '📋',
    description: 'Copy to clipboard',
    variant: 'secondary' as const,
    onClick: props.onCopyContent,
  }] : []),
  ...(props.onShareContent ? [{
    id: 'share',
    label: 'Share',
    icon: '🔗',
    description: 'Share content',
    variant: 'secondary' as const,
    onClick: props.onShareContent,
  }] : []),
];

// ================================================================================
// 样式配置
// ================================================================================

const getPositionClasses = (position: string, isVisible: boolean) => {
  const baseClasses = 'fixed left-1/2 transform -translate-x-1/2 transition-all duration-300 z-40';
  
  const positions = {
    bottom: {
      base: 'bottom-6',
      visible: 'opacity-100 translate-y-0',
      hidden: 'opacity-0 translate-y-full pointer-events-none'
    },
    top: {
      base: 'top-6',
      visible: 'opacity-100 translate-y-0',
      hidden: 'opacity-0 -translate-y-full pointer-events-none'
    }
  };

  const config = positions[position as keyof typeof positions] || positions.bottom;
  const visibilityClass = isVisible ? config.visible : config.hidden;
  
  return `${baseClasses} ${config.base} ${visibilityClass}`;
};

const getActionButtonClasses = (variant: string) => {
  const variants = {
    primary: 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/30',
    success: 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-500/30',
    warning: 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border-orange-500/30',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30',
    secondary: 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/30'
  };
  
  return variants[variant as keyof typeof variants] || variants.primary;
};

// ================================================================================
// 主组件
// ================================================================================

export const ScrollFollowUpActions: React.FC<ScrollFollowUpActionsProps> = ({
  isVisible,
  actions,
  className = '',
  position = 'bottom',
  autoHideDelay = 0,
  showAIBranding = true,
  ...actionProps
}) => {
  const [shouldShow, setShouldShow] = useState(isVisible);
  
  const finalActions = actions || getDefaultActions({ 
    isVisible, 
    actions, 
    className, 
    position, 
    autoHideDelay,
    showAIBranding,
    ...actionProps 
  });

  // 自动隐藏逻辑
  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      
      if (autoHideDelay > 0) {
        const timer = setTimeout(() => {
          setShouldShow(false);
        }, autoHideDelay);
        
        return () => clearTimeout(timer);
      }
    } else {
      setShouldShow(false);
    }
  }, [isVisible, autoHideDelay]);

  if (finalActions.length === 0) {
    return null;
  }

  return (
    <div className={`${getPositionClasses(position, shouldShow)} ${className}`}>
      <div className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl px-6 py-3 shadow-2xl">
        <div className="flex items-center gap-4">
          {/* AI 品牌标识 */}
          {showAIBranding && (
            <div className="flex items-center gap-2 border-r border-white/20 pr-4">
              <span className="text-lg">🤖</span>
              <span className="text-sm text-white/80 font-medium whitespace-nowrap">Quick AI Actions</span>
            </div>
          )}
          
          {/* 操作按钮 */}
          <div className="flex gap-2">
            {finalActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all text-sm border disabled:opacity-50 disabled:cursor-not-allowed ${getActionButtonClasses(action.variant || 'primary')}`}
                title={action.description}
              >
                <span>{action.icon}</span>
                <span className="whitespace-nowrap">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================================================================
// 预设变体组件
// ================================================================================

// 文档编辑专用的快捷操作栏
export const DocumentEditingActions: React.FC<Omit<ScrollFollowUpActionsProps, 'actions'> & {
  onQuickEdit: () => void;
  onSummarize: () => void;
  onCopyContent: () => void;
}> = (props) => (
  <ScrollFollowUpActions {...props} />
);

// 内容阅读专用的快捷操作栏
export const ContentReadingActions: React.FC<Omit<ScrollFollowUpActionsProps, 'actions'> & {
  onAskQuestion: () => void;
  onSummarize: () => void;
  onTranslate: () => void;
  onShareContent: () => void;
}> = (props) => (
  <ScrollFollowUpActions {...props} />
);

// 极简版快捷操作栏
export const MinimalScrollActions: React.FC<ScrollFollowUpActionsProps> = (props) => {
  const minimalActions: QuickAction[] = [
    {
      id: 'edit',
      label: 'Edit',
      icon: '✏️',
      variant: 'primary',
      onClick: props.onQuickEdit || (() => {}),
    },
    {
      id: 'ask',
      label: 'Ask',
      icon: '❓',
      variant: 'success',
      onClick: props.onAskQuestion || (() => {}),
    },
    {
      id: 'more',
      label: 'More',
      icon: '⋯',
      variant: 'secondary',
      onClick: () => {
        // 可以触发更多选项的显示
        log.debug('Show more options');
      },
    }
  ];

  return (
    <div className={`${getPositionClasses(props.position || 'bottom', props.isVisible)} ${props.className || ''}`}>
      <div className="bg-black/30 backdrop-blur-xl border border-white/20 rounded-2xl px-4 py-2 shadow-2xl">
        <div className="flex gap-1">
          {minimalActions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all border ${getActionButtonClasses(action.variant || 'primary')}`}
              title={action.label}
            >
              <span className="text-sm">{action.icon}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ================================================================================
// Hook for scroll detection
// ================================================================================

export const useScrollTrigger = (
  threshold: number = 100,
  hideDelay: number = 1000
) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    let hideTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (scrollTop > threshold) {
        setIsScrolling(true);
        setShowActions(true);
        
        // 清除之前的隐藏定时器
        clearTimeout(hideTimeout);
        
        // 清除滚动检测定时器
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          setIsScrolling(false);
          
          // 设置新的隐藏定时器
          hideTimeout = setTimeout(() => {
            setShowActions(false);
          }, hideDelay);
        }, 150);
      } else {
        setIsScrolling(false);
        setShowActions(false);
        clearTimeout(hideTimeout);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
      clearTimeout(hideTimeout);
    };
  }, [threshold, hideDelay]);

  return { isScrolling, showActions };
};