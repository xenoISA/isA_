/**
 * ChatInput Component - Multi-line text input with modern AI chat features
 * Based on modern AI chat interfaces (Claude, ChatGPT, Gemini, Grok)
 */
import React, { useState, useRef, useEffect, KeyboardEvent, useMemo } from 'react';

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (message: string) => void;
  placeholder?: string;
  maxLength?: number;
  minRows?: number;
  maxRows?: number;
  disabled?: boolean;
  isLoading?: boolean;
  showSendButton?: boolean;
  showAttachButton?: boolean;
  showVoiceButton?: boolean;
  allowShiftEnter?: boolean;
  className?: string;
  onAttachFile?: () => void;
  onVoiceRecord?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  placeholder = 'Type your message...',
  maxLength = 4000,
  minRows = 1,
  maxRows = 10,
  disabled = false,
  isLoading = false,
  showSendButton = true,
  showAttachButton = true,
  showVoiceButton = true,
  allowShiftEnter = true,
  className = '',
  onAttachFile,
  onVoiceRecord
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [rows, setRows] = useState(minRows);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24; // Approximate line height
      const newRows = Math.min(Math.max(Math.ceil(scrollHeight / lineHeight), minRows), maxRows);
      setRows(newRows);
    }
  }, [value, minRows, maxRows]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && allowShiftEnter) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (value.trim() && !disabled && !isLoading) {
      onSend(value.trim());
    }
  };

  const canSend = value.trim().length > 0 && !disabled && !isLoading;

  // Detect touch/mobile devices for hint text
  const isTouchDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }, []);

  return (
    <div className={`chat-input-container ${className}`}>
      <div className="relative flex items-end gap-2 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        
        {/* Attach Button */}
        {showAttachButton && onAttachFile && (
          <button
            onClick={onAttachFile}
            disabled={disabled}
            className="
              flex-shrink-0 w-10 h-10 
              flex items-center justify-center
              text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-800
              rounded-lg transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Attach file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
        )}

        {/* Input Container */}
        <div className="flex-1 relative">
          <div className="
            relative flex items-end
            bg-gray-50 dark:bg-gray-800/50
            border border-gray-200 dark:border-gray-700
            rounded-2xl
            focus-within:border-blue-500 dark:focus-within:border-blue-400
            focus-within:ring-2 focus-within:ring-blue-500/10
            transition-all duration-200
          ">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              maxLength={maxLength}
              rows={rows}
              disabled={disabled}
              className="
                w-full px-4 py-3 pr-12
                bg-transparent
                text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400
                resize-none outline-none
                text-[15px] leading-6
              "
              style={{
                minHeight: `${minRows * 24 + 24}px`,
                maxHeight: `${maxRows * 24 + 24}px`
              }}
            />
            
            {/* Send Button (Inline) */}
            {showSendButton && (
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`
                  absolute bottom-2 right-2
                  w-8 h-8 flex items-center justify-center
                  rounded-full transition-all duration-200
                  ${canSend
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }
                `}
                title={canSend ? 'Send message (Enter)' : 'Type a message to send'}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            )}
          </div>

          {/* Character Counter */}
          {maxLength && value.length > maxLength * 0.8 && (
            <div className={`
              absolute -bottom-6 right-2 text-xs
              ${value.length >= maxLength ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}
            `}>
              {value.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Voice Button */}
        {showVoiceButton && onVoiceRecord && (
          <button
            onClick={onVoiceRecord}
            disabled={disabled}
            className="
              flex-shrink-0 w-10 h-10
              flex items-center justify-center
              text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200
              hover:bg-gray-100 dark:hover:bg-gray-800
              rounded-lg transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            title="Voice input"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        )}
      </div>

      {/* Hint Text — adaptive for touch vs keyboard devices */}
      {allowShiftEnter && !disabled && (
        <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-100 dark:border-gray-800">
          {isTouchDevice ? (
            <>Tap the send button to send</>
          ) : (
            <>
              Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Enter</kbd> to send, <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Shift + Enter</kbd> for new line
            </>
          )}
        </div>
      )}
    </div>
  );
};