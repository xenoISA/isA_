/**
 * Mobile Input Area Component
 * Touch-optimized input area with keyboard handling
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createLogger } from '../../../utils/logger';

const log = createLogger('MobileInputArea');

// Simple SVG icon components
const Send = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const Paperclip = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
);

const Mic = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const Plus = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export interface MobileInputAreaProps {
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>;
  onSendMultimodalMessage?: (content: string, files: File[], metadata?: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
  keyboardHeight?: number;
  isNativeApp?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export const MobileInputArea: React.FC<MobileInputAreaProps> = ({
  onSendMessage,
  onSendMultimodalMessage,
  isLoading = false,
  keyboardHeight = 0,
  isNativeApp = false,
  placeholder = 'Type a message...',
  maxLength = 2000
}) => {
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 120; // Max 5 lines approximately
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, adjustTextareaHeight]);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;
    if (isLoading) return;

    try {
      if (attachedFiles.length > 0) {
        await onSendMultimodalMessage?.(inputValue, attachedFiles);
      } else {
        await onSendMessage?.(inputValue);
      }
      
      setInputValue('');
      setAttachedFiles([]);
      setShowActions(false);
    } catch (error) {
      log.error('Failed to send message:', error);
    }
  }, [inputValue, attachedFiles, isLoading, onSendMessage, onSendMultimodalMessage]);

  // Handle file attachment
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    setShowActions(false);
  }, []);

  // Remove attached file
  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Handle recording (placeholder)
  const toggleRecording = useCallback(() => {
    setIsRecording(!isRecording);
    setShowActions(false);
    // Implement audio recording logic here
  }, [isRecording]);

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setInputValue(value);
    }
  }, [maxLength]);

  // Handle key down (replaces deprecated onKeyPress)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const canSend = inputValue.trim() || attachedFiles.length > 0;

  return (
    <div 
      className="mobile-input-area bg-black/20 backdrop-blur-lg border-t border-white/10 p-4"
      style={{ 
        paddingBottom: isNativeApp ? Math.max(16, keyboardHeight) : 16,
        marginBottom: isNativeApp ? 'env(safe-area-inset-bottom)' : 0
      }}
    >
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="
                flex items-center gap-2 px-3 py-2
                bg-white/10 rounded-lg border border-white/20
              "
            >
              <Paperclip className="w-4 h-4 text-white/70" />
              <span className="text-sm text-white/90 truncate max-w-32">
                {file.name}
              </span>
              <button
                onClick={() => removeFile(index)}
                className="text-white/70 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="flex items-end gap-3">
        {/* Action button */}
        <button
          onClick={() => setShowActions(!showActions)}
          className={`
            w-11 h-11 rounded-xl flex items-center justify-center
            transition-all duration-200 flex-shrink-0
            ${showActions 
              ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70'
            }
            border
          `}
          aria-label="Show actions"
        >
          <Plus className={`w-5 h-5 transition-transform ${showActions ? 'rotate-45' : ''}`} />
        </button>

        {/* Input field */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="
              w-full min-h-11 max-h-30 resize-none
              px-4 py-3 pr-12
              bg-white/5 border border-white/10
              rounded-xl text-white placeholder-white/50
              focus:outline-none focus:border-blue-500/50 focus:bg-white/10
              transition-all duration-200
              text-base leading-relaxed
            "
            style={{ fontSize: 16 }} // Prevent zoom on iOS
          />
          
          {/* Character count */}
          {inputValue.length > maxLength * 0.8 && (
            <div className="absolute bottom-1 right-12 text-xs text-white/50">
              {inputValue.length}/{maxLength}
            </div>
          )}
        </div>

        {/* Send/Record button */}
        <button
          onClick={canSend ? handleSend : toggleRecording}
          disabled={isLoading}
          className={`
            w-11 h-11 rounded-xl flex items-center justify-center
            transition-all duration-200 flex-shrink-0
            ${canSend 
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25' 
              : isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 border'
            }
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={canSend ? 'Send message' : 'Record voice message'}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : canSend ? (
            <Send className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Actions menu */}
      {showActions && (
        <div className="mt-3 flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="
              flex items-center gap-2 px-4 py-2
              bg-white/5 hover:bg-white/10 border border-white/10
              rounded-lg text-white/90 text-sm
              transition-all duration-200
            "
          >
            <Paperclip className="w-4 h-4" />
            Attach File
          </button>
          
          <button
            onClick={toggleRecording}
            className={`
              flex items-center gap-2 px-4 py-2
              border rounded-lg text-sm
              transition-all duration-200
              ${isRecording
                ? 'bg-red-500/20 border-red-500/30 text-red-400'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/90'
              }
            `}
          >
            <Mic className="w-4 h-4" />
            {isRecording ? 'Stop Recording' : 'Voice Message'}
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  );
};