/**
 * ============================================================================
 * Toast - 通用消息通知组件系统
 * ============================================================================
 * 
 * 【核心功能】
 * - 统一的消息通知样式和行为
 * - 支持多种通知类型和位置
 * - 与现有 glassmorphism 设计风格一致
 * - 自动消失、手动关闭、批量管理
 * 
 * 【设计原则】
 * - 非阻塞性：不影响用户操作
 * - 可定制：支持自定义内容和样式
 * - 高性能：使用Portal和虚拟化
 * - 用户友好：清晰的视觉层次和交互
 */

import React, { memo, useEffect, useState, useCallback, createContext, useContext, useMemo } from 'react';
import { createPortal } from 'react-dom';

// ================================================================================
// 类型定义
// ================================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export type ToastPosition = 
  | 'top-left' | 'top-center' | 'top-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ToastProps {
  id: string;
  type: ToastType;
  title?: string;
  message: React.ReactNode;
  duration?: number;
  position?: ToastPosition;
  closable?: boolean;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
  className?: string;
  // Accessibility props
  'aria-label'?: string;
  'aria-describedby'?: string;
  role?: string;
  announceOnShow?: boolean; // Announce to screen readers
}

export interface ToastContextValue {
  toasts: ToastProps[];
  addToast: (toast: Omit<ToastProps, 'id'>) => string;
  addToasts: (toasts: Array<Omit<ToastProps, 'id'>>) => string[];
  removeToast: (id: string) => void;
  removeToasts: (ids: string[]) => void;
  removeAllToasts: () => void;
  removeByType: (type: ToastType) => void;
  updateToast: (id: string, updates: Partial<ToastProps>) => void;
}

export interface ToastContainerProps {
  position?: ToastPosition;
  maxToasts?: number;
  className?: string;
  virtualized?: boolean;
  maxHeight?: number;
}

// ================================================================================
// 样式配置
// ================================================================================

// Optimized type configuration using design system
const TYPE_CONFIGS = {
  success: {
    icon: '✅',
    bgColor: 'glass-primary',
    borderColor: 'border-glass-border',
    iconColor: 'text-green-400',
    progressColor: 'bg-green-400',
    glowColor: '#10b981'
  },
  error: {
    icon: '❌',
    bgColor: 'glass-primary',
    borderColor: 'border-glass-border',
    iconColor: 'text-red-400',
    progressColor: 'bg-red-400',
    glowColor: '#ef4444'
  },
  warning: {
    icon: '⚠️',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    iconColor: 'text-orange-400',
    progressColor: 'bg-orange-400',
    glowColor: '#f59e0b'
  },
  info: {
    icon: 'ℹ️',
    bgColor: 'glass-primary',
    borderColor: 'border-glass-border',
    iconColor: 'text-primary',
    progressColor: 'bg-primary',
    glowColor: 'var(--color-primary)'
  },
  loading: {
    icon: '⏳',
    bgColor: 'glass-primary',
    borderColor: 'border-glass-border',
    iconColor: 'text-secondary',
    progressColor: 'bg-secondary',
    glowColor: 'var(--color-secondary)'
  }
} as const;

const getTypeConfig = (type: ToastType) => TYPE_CONFIGS[type];

// Optimized position classes using design system
const POSITION_CLASSES = {
  'top-left': 'top-xl left-xl',
  'top-center': 'top-xl left-1/2 transform -translate-x-1/2',
  'top-right': 'top-xl right-xl',
  'bottom-left': 'bottom-xl left-xl',
  'bottom-center': 'bottom-xl left-1/2 transform -translate-x-1/2',
  'bottom-right': 'bottom-xl right-xl'
} as const;

const getPositionClasses = (position: ToastPosition): string => POSITION_CLASSES[position];

const getAnimationClasses = (position: ToastPosition): string => {
  const isTop = position.startsWith('top');
  const isLeft = position.includes('left');
  const isRight = position.includes('right');
  
  if (isTop) {
    if (isLeft) return 'animate-slide-in-top-left';
    if (isRight) return 'animate-slide-in-top-right';
    return 'animate-slide-in-top';
  } else {
    if (isLeft) return 'animate-slide-in-bottom-left';
    if (isRight) return 'animate-slide-in-bottom-right';
    return 'animate-slide-in-bottom';
  }
};

// ================================================================================
// Context
// ================================================================================

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// ================================================================================
// 子组件
// ================================================================================

// 加载动画组件
const LoadingSpinner: React.FC<{ className?: string }> = memo(({ className = '' }) => (
  <div className={`w-4 h-4 ${className}`}>
    <div className="w-full h-full border-2 border-transparent border-t-current rounded-full animate-spin" />
  </div>
));

// 进度条组件
const ProgressBar: React.FC<{ 
  duration: number; 
  paused: boolean; 
  color: string;
  onComplete: () => void;
}> = memo(({ duration, paused, color, onComplete }) => {
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    if (paused || duration <= 0) return;
    
    const interval = 50; // 更新间隔 50ms
    const step = (interval / duration) * 100;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = prev - step;
        if (next <= 0) {
          clearInterval(timer);
          onComplete();
          return 0;
        }
        return next;
      });
    }, interval);
    
    return () => clearInterval(timer);
  }, [duration, paused, onComplete]);
  
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-lg overflow-hidden">
      <div 
        className={`h-full ${color} transition-all duration-100 ease-out`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
});

// ================================================================================
// Toast组件
// ================================================================================

const ToastItem: React.FC<ToastProps & { 
  onRemove: (id: string) => void;
  position: ToastPosition;
}> = memo(({
  id,
  type,
  title,
  message,
  duration = 4000,
  closable = true,
  icon,
  action,
  onClose,
  onRemove,
  position,
  className = '',
  // Accessibility props
  ...accessibilityProps
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [announced, setAnnounced] = useState(false);
  const config = getTypeConfig(type);

  // 入场动画和无障碍公告
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      // Announce to screen readers for important messages
      if (accessibilityProps.announceOnShow !== false && (type === 'error' || type === 'success')) {
        setAnnounced(true);
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [type, accessibilityProps.announceOnShow]);

  // 关闭处理
  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
      onRemove(id);
    }, 300); // 等待退场动画
  }, [id, onClose, onRemove]);

  // 鼠标悬停暂停
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
  }, []);

  const displayIcon = icon || (type === 'loading' ? 
    <LoadingSpinner className={config.iconColor} /> : 
    <span className="text-lg">{config.icon}</span>
  );

  return (
    <div
      className={`
        relative mb-lg p-xl rounded-xl border backdrop-blur-lg
        ${config.bgColor} ${config.borderColor}
        transition-all duration-slow ease-out transform
        ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 
          position.includes('right') ? 'translate-x-full opacity-0 scale-95' :
          position.includes('left') ? '-translate-x-full opacity-0 scale-95' :
          'translate-y-md opacity-0 scale-95'
        }
        max-w-md min-w-[300px] shadow-lg
        ${className}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role={accessibilityProps.role || (type === 'error' ? 'alert' : 'status')}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      aria-label={accessibilityProps['aria-label']}
      aria-describedby={accessibilityProps['aria-describedby']}
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className={`flex-shrink-0 ${config.iconColor}`}>
          {displayIcon}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          {title && (
            <div className="font-medium text-white mb-1">
              {title}
            </div>
          )}
          <div className="text-white/90 text-sm">
            {message}
          </div>
          
          {/* 操作按钮 */}
          {action && (
            <button
              onClick={action.onClick}
              className={`
                mt-2 text-sm font-medium ${config.iconColor} 
                hover:underline transition-colors
              `}
            >
              {action.label}
            </button>
          )}
        </div>

        {/* 关闭按钮 */}
        {closable && (
          <button
            onClick={handleClose}
            className="
              flex-shrink-0 w-6 h-6 
              bg-white/10 hover:bg-white/20 
              rounded text-white/60 hover:text-white
              transition-all duration-200
              flex items-center justify-center
              focus:outline-none focus:ring-2 focus:ring-primary/50
            "
            aria-label={`Close ${type} notification`}
            title={`Close ${type} notification`}
            type="button"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* 进度条 */}
      {duration > 0 && type !== 'loading' && (
        <ProgressBar
          duration={duration}
          paused={isPaused}
          color={config.progressColor}
          onComplete={handleClose}
        />
      )}
    </div>
  );
});

// ================================================================================
// Toast容器
// ================================================================================

// Virtualized Toast Container for better performance
export const ToastContainer: React.FC<ToastContainerProps> = memo(({
  position = 'top-right',
  maxToasts = 5,
  className = '',
  virtualized = false,
  maxHeight = 400
}) => {
  const { toasts, removeToast } = useToast();

  const positionToasts = useMemo(() => 
    toasts
      .filter(toast => (toast.position || 'top-right') === position)
      .slice(0, maxToasts)
  , [toasts, position, maxToasts]);

  if (positionToasts.length === 0) return null;

  const containerContent = (
    <div
      className={`
        fixed z-50 pointer-events-none
        ${getPositionClasses(position)}
        ${className}
      `}
    >
      <div 
        className="pointer-events-auto"
        style={virtualized ? { maxHeight: `${maxHeight}px`, overflowY: 'auto' } : undefined}
      >
        {positionToasts.map(toast => (
          <ToastItem
            key={toast.id}
            {...toast}
            position={position}
            onRemove={removeToast}
          />
        ))}
      </div>
    </div>
  );

  return typeof document !== 'undefined' 
    ? createPortal(containerContent, document.body)
    : null;
});

// ================================================================================
// Toast Provider
// ================================================================================

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = useCallback((toast: Omit<ToastProps, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastProps = {
      id,
      position: 'top-right',
      duration: 4000,
      closable: true,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);
    return id;
  }, []);

  const addToasts = useCallback((toasts: Array<Omit<ToastProps, 'id'>>): string[] => {
    const newToasts = toasts.map(toast => ({
      ...toast,
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: toast.position || 'top-right' as ToastPosition,
      duration: toast.duration || 4000,
      closable: toast.closable !== false
    }));

    setToasts(prev => [...prev, ...newToasts]);
    return newToasts.map(t => t.id);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const removeToasts = useCallback((ids: string[]) => {
    setToasts(prev => prev.filter(toast => !ids.includes(toast.id)));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const removeByType = useCallback((type: ToastType) => {
    setToasts(prev => prev.filter(toast => toast.type !== type));
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<ToastProps>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const contextValue: ToastContextValue = useMemo(() => ({
    toasts,
    addToast,
    addToasts,
    removeToast,
    removeToasts,
    removeAllToasts,
    removeByType,
    updateToast
  }), [toasts, addToast, addToasts, removeToast, removeToasts, removeAllToasts, removeByType, updateToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* 渲染不同位置的Toast容器 */}
      <ToastContainer position="top-left" />
      <ToastContainer position="top-center" />
      <ToastContainer position="top-right" />
      <ToastContainer position="bottom-left" />
      <ToastContainer position="bottom-center" />
      <ToastContainer position="bottom-right" />
    </ToastContext.Provider>
  );
};

// ================================================================================
// 便捷方法
// ================================================================================

export const toast = {
  success: (message: React.ReactNode, options?: Partial<ToastProps>) => {
    // 这需要在ToastProvider内部使用
    return { type: 'success' as const, message, ...options };
  },
  
  error: (message: React.ReactNode, options?: Partial<ToastProps>) => {
    return { type: 'error' as const, message, ...options };
  },
  
  warning: (message: React.ReactNode, options?: Partial<ToastProps>) => {
    return { type: 'warning' as const, message, ...options };
  },
  
  info: (message: React.ReactNode, options?: Partial<ToastProps>) => {
    return { type: 'info' as const, message, ...options };
  },
  
  loading: (message: React.ReactNode, options?: Partial<ToastProps>) => {
    return { type: 'loading' as const, message, duration: 0, ...options };
  }
};

ToastContainer.displayName = 'ToastContainer';
ToastProvider.displayName = 'ToastProvider';