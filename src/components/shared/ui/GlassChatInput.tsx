/**
 * GlassChatInput Component - Ultra-modern glassmorphism chat input
 * Advanced chat input with glass effects and modern interactions
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

// 智能模式设置接口
interface IntelligentModeSettings {
  mode: 'reactive' | 'collaborative' | 'proactive';
  confidence_threshold: number;
  enable_predictions: boolean;
}

// Config Button Component - 配置下拉菜单
interface ConfigButtonProps {
  onAttachFile?: () => void;
  onVoiceRecord?: () => void;
  onMagicAction?: () => void;
  disabled?: boolean;
  showAttachButton?: boolean;
  showVoiceButton?: boolean;
  showMagicButton?: boolean;
  intelligentMode?: IntelligentModeSettings;
  onIntelligentModeChange?: (settings: IntelligentModeSettings) => void;
  isRecording?: boolean;
}

const ConfigButton: React.FC<ConfigButtonProps> = ({
  onAttachFile,
  onVoiceRecord,
  onMagicAction,
  disabled = false,
  showAttachButton = false,
  showVoiceButton = false,
  showMagicButton = false,
  intelligentMode = { mode: 'reactive', confidence_threshold: 0.7, enable_predictions: false },
  onIntelligentModeChange,
  isRecording = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { track } = useAnalytics();

  // 智能模式变更处理
  const handleModeChange = (mode: IntelligentModeSettings['mode']) => {
    const newSettings = { ...intelligentMode, mode };
    onIntelligentModeChange?.(newSettings);
    
    // 追踪智能模式切换 - 这是后端无法获取的重要用户偏好数据
    track('INTELLIGENT_MODE_CHANGED', {
      previous_mode: intelligentMode.mode,
      new_mode: mode,
      confidence_threshold: intelligentMode.confidence_threshold,
      predictions_enabled: intelligentMode.enable_predictions
    });
  };

  // 模式配置 - 简洁版本
  const modeConfigs = {
    reactive: {
      label: 'Standard',
      description: 'Responds to direct instructions',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30'
    },
    collaborative: {
      label: 'Collaborative', 
      description: 'Proactive suggestions and guidance',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30'
    },
    proactive: {
      label: 'Autonomous',
      description: 'Predictive and self-directed',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30'
    }
  };

  return (
    <div className="relative">
      {/* Config Toggle Button */}
      <button
        onClick={() => {
          const newState = !isOpen;
          setIsOpen(newState);
          
          // 追踪配置菜单交互
          if (newState) {
            track('CONFIG_MENU_OPENED', {
              available_features: {
                attachButton: showAttachButton,
                voiceButton: showVoiceButton, 
                magicButton: showMagicButton,
                intelligentMode: !!onIntelligentModeChange
              }
            });
          }
        }}
        disabled={disabled}
        className="
          w-10 h-10 flex items-center justify-center
          text-gray-600 dark:text-gray-400
          hover:text-gray-800 dark:hover:text-gray-200
          hover:bg-white/20 dark:hover:bg-white/10
          rounded-xl backdrop-blur-sm
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
        "
        title="Chat configuration"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu - Claude-style minimal design */}
          <div className="
            absolute bottom-full left-0 mb-2 z-20
            bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
            border border-gray-200/80 dark:border-gray-700/80
            rounded-xl shadow-2xl min-w-[240px]
            py-2 
          ">
            
            {/* Mode Selection - Single Row */}
            {onIntelligentModeChange && (
              <>
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[40px]">Mode</span>
                    <select
                      value={intelligentMode.mode}
                      onChange={(e) => {
                        handleModeChange(e.target.value as IntelligentModeSettings['mode']);
                      }}
                      className="flex-1 bg-gray-50 dark:bg-gray-800 border-0 rounded-md px-2 py-1 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {(Object.entries(modeConfigs) as [keyof typeof modeConfigs, typeof modeConfigs[keyof typeof modeConfigs]][]).map(([mode, config]) => (
                        <option key={mode} value={mode}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 dark:border-gray-800"></div>
              </>
            )}

            {/* Action Items */}
            <div className="py-1">
              {/* Widget Action */}
              {showMagicButton && onMagicAction && (
                <button
                  onClick={() => {
                    onMagicAction();
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Widgets</span>
                </button>
              )}

              {/* File Upload */}
              {showAttachButton && onAttachFile && (
                <button
                  onClick={() => {
                    onAttachFile();
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-3"
                >
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">Attach files</span>
                </button>
              )}

              {/* Voice Input */}
              {showVoiceButton && onVoiceRecord && (
                <button
                  onClick={() => {
                    onVoiceRecord();
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-3 ${
                    isRecording ? 'bg-red-50 dark:bg-red-950/30' : ''
                  }`}
                >
                  <svg className={`w-4 h-4 ${isRecording ? 'text-red-500 animate-pulse' : 'text-green-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {isRecording ? 'Recording... (click to stop)' : 'Voice input'}
                  </span>
                  {isRecording && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-auto" />
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export interface GlassChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  placeholder?: string;
  maxLength?: number;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
  isLoading?: boolean;
  showAttachButton?: boolean;
  showVoiceButton?: boolean;
  showMagicButton?: boolean;
  allowShiftEnter?: boolean;
  variant?: 'default' | 'elevated' | 'compact';
  className?: string;
  onAttachFile?: () => void;
  onVoiceRecord?: () => void;
  onMagicAction?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isRecording?: boolean;
  // 智能模式设置
  intelligentMode?: IntelligentModeSettings;
  onIntelligentModeChange?: (settings: IntelligentModeSettings) => void;
}

// 导出智能模式设置接口供外部使用
export type { IntelligentModeSettings };

export const GlassChatInput: React.FC<GlassChatInputProps> = ({
  value,
  onChange,
  onSend,
  placeholder = 'Type your message...',
  maxLength = 4000,
  minRows = 1,
  maxRows = 8,
  disabled = false,
  isLoading = false,
  showAttachButton = true,
  showVoiceButton = true,
  showMagicButton = true,
  allowShiftEnter = true,
  variant = 'default',
  className = '',
  onAttachFile,
  onVoiceRecord,
  onMagicAction,
  onFocus,
  onBlur,
  isRecording = false,
  intelligentMode = { mode: 'reactive', confidence_threshold: 0.7, enable_predictions: false },
  onIntelligentModeChange
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [rows, setRows] = useState(minRows);
  
  // Analytics 追踪
  const { trackChatMessage, track } = useAnalytics();
  const [focusStartTime, setFocusStartTime] = useState<number | null>(null);
  const [typingStartTime, setTypingStartTime] = useState<number | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24;
      const newRows = Math.min(Math.max(Math.ceil(scrollHeight / lineHeight), minRows), maxRows);
      setRows(newRows);
    }
  }, [value, minRows, maxRows]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && allowShiftEnter) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (value.trim() && !disabled && !isLoading) {
      // 追踪发送消息事件
      trackChatMessage('sent', value.trim(), {
        message_length: value.trim().length,
        session_message_count: 1 // 这里可以从父组件传入实际计数
      } as any);
      
      onSend(value.trim());
    }
  };

  const canSend = value.trim().length > 0 && !disabled && !isLoading;

  // Detect touch/mobile devices for hint text
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  const getVariantStyles = () => {
    return 'bg-[var(--color-neutral-800,#1e293b)]';
  };

  const getInputStyles = () => {
    return `
      w-full bg-transparent
      resize-none outline-none
      text-[15px] leading-6
      transition-all duration-300
    `;
  };

  return (
    <div className={`glass-chat-input-container ${className}`}>
      <div className="relative p-4">
        
        {/* Main Input Container */}
        <div 
          className={`
            relative flex items-center gap-3
            rounded-2xl p-4
            transition-all duration-300 ease-out
            ${getVariantStyles()}
          `}
          style={{ 
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: isFocused ? 'var(--glass-border-focused)' : 'var(--glass-border)',
            ...(isFocused && {
              boxShadow: 'var(--shadow-glow)'
            })
          }}
        >
          
          {/* Left Actions - Config Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Config Button - Always show if any feature is available */}
            {(showAttachButton || showVoiceButton || showMagicButton || onIntelligentModeChange) && (
              <ConfigButton
                onAttachFile={onAttachFile}
                onVoiceRecord={onVoiceRecord}
                onMagicAction={onMagicAction}
                disabled={disabled}
                showAttachButton={showAttachButton}
                showVoiceButton={showVoiceButton}
                showMagicButton={showMagicButton}
                intelligentMode={intelligentMode}
                onIntelligentModeChange={onIntelligentModeChange}
                isRecording={isRecording}
              />
            )}
          </div>

          {/* Text Input Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsFocused(true);
                setFocusStartTime(Date.now());
                onFocus?.();
              }}
              onBlur={() => {
                setIsFocused(false);
                
                // 追踪输入框焦点时长
                if (focusStartTime) {
                  const focusDuration = Date.now() - focusStartTime;
                  track('INPUT_FOCUS_TIME', {
                    focus_duration: focusDuration,
                    text_length: value.length,
                    had_text_input: value.length > 0
                  });
                }
                
                setFocusStartTime(null);
                onBlur?.();
              }}
              placeholder={placeholder}
              maxLength={maxLength}
              rows={rows}
              disabled={disabled}
              className={getInputStyles()}
              style={{
                minHeight: `${minRows * 24 + 8}px`,
                maxHeight: `${maxRows * 24 + 8}px`,
                paddingRight: '12px'
              }}
            />
            
            
            {/* Glass Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none opacity-0 hover:opacity-100 transition-opacity" />
          </div>

          {/* Right Actions - Only Send Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`
                w-10 h-10 flex items-center justify-center
                rounded-xl backdrop-blur-sm
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${canSend 
                  ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-500/10' 
                  : 'text-gray-400 dark:text-gray-500'
                }
              `}
              title={canSend ? 'Send message' : 'Type a message to send'}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Character Counter */}
        {maxLength && value.length > maxLength * 0.8 && (
          <div className={`
            text-xs mt-2 text-right
            ${value.length >= maxLength 
              ? 'text-red-500 dark:text-red-400' 
              : 'text-gray-500/70 dark:text-gray-400/70'
            }
          `}>
            {value.length}/{maxLength}
          </div>
        )}

        {/* Hint Text — adaptive for touch vs keyboard devices */}
        {allowShiftEnter && !disabled && variant !== 'compact' && (
          <div className="mt-3 text-xs text-center text-gray-500/60 dark:text-gray-400/60">
            {isTouchDevice ? (
              <>Tap the send button to send</>
            ) : (
              <>
                Press{' '}
                <kbd className="px-2 py-0.5 bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded text-xs backdrop-blur-sm">
                  Enter
                </kbd>{' '}
                to send, {' '}
                <kbd className="px-2 py-0.5 bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded text-xs backdrop-blur-sm">
                  Shift + Enter
                </kbd>{' '}
                for new line
              </>
            )}
          </div>
        )}

        {/* Ultra Glass Overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />
        
        {/* Focus Enhancement */}
        {isFocused && (
          <div className="absolute inset-0 rounded-2xl ring-1 ring-blue-400/20 dark:ring-purple-400/20 pointer-events-none" />
        )}
      </div>
    </div>
  );
};