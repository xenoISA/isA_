/**
 * Modern Mobile Input Area Component - Glassmorphism Pro
 * Ultra-modern glass effects with ChatGPT, Claude, Gemini design patterns
 */
import React, { useState, useRef, useCallback } from 'react';
import { createLogger } from '../../../utils/logger';
import { GlassChatInput, GlassCard, GlassButton } from '../../shared';

const log = createLogger('ModernMobileInputArea');

export interface ModernMobileInputAreaProps {
  onSendMessage?: (content: string, metadata?: Record<string, any>) => Promise<void>;
  onSendMultimodalMessage?: (content: string, files: File[], metadata?: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
  keyboardHeight?: number;
  isNativeApp?: boolean;
  placeholder?: string;
  maxLength?: number;
}

export const ModernMobileInputArea: React.FC<ModernMobileInputAreaProps> = ({
  onSendMessage,
  onSendMultimodalMessage,
  isLoading = false,
  keyboardHeight = 0,
  isNativeApp = false,
  placeholder = "Message AI Assistant...",
  maxLength = 2000
}) => {
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async (message: string) => {
    if (!message.trim() && attachedFiles.length === 0) return;

    try {
      if (attachedFiles.length > 0 && onSendMultimodalMessage) {
        await onSendMultimodalMessage(message, attachedFiles, {
          timestamp: new Date().toISOString(),
          source: 'mobile'
        });
      } else if (onSendMessage) {
        await onSendMessage(message, {
          timestamp: new Date().toISOString(),
          source: 'mobile'
        });
      }
      
      // Clear after successful send
      setInputValue('');
      setAttachedFiles([]);
    } catch (error) {
      log.error('Failed to send message:', error);
    }
  }, [attachedFiles, onSendMessage, onSendMultimodalMessage]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    e.target.value = '';
  }, []);

  const handleAttachFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleVoiceRecord = useCallback(() => {
    log.info('Voice recording - coming soon in glassmorphism!');
  }, []);

  const handleMagicAction = useCallback(() => {
    log.info('Magic AI actions - enhanced with glass effects!');
  }, []);


  return (
    <div 
      className="glass-mobile-input-area relative"
      style={{ 
        paddingBottom: isNativeApp ? Math.max(8, keyboardHeight) : 8,
        marginBottom: isNativeApp ? 'env(safe-area-inset-bottom)' : 0,
        background: 'transparent'
      }}
    >
      {/* Subtle glassmorphism overlay for input area only */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/5 to-transparent" />
      
      {/* Minimal glass orbs for subtle effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-white/5 rounded-full blur-xl" />
      </div>

      {/* Glassmorphism Attached Files */}
      {attachedFiles.length > 0 && (
        <div className="relative z-10 p-4">
          <div className="flex flex-wrap gap-3">
            {attachedFiles.map((file, index) => (
              <GlassCard 
                key={index} 
                variant="elevated" 
                className="group flex items-center gap-3 px-4 py-3 animate-slideIn"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-white/90 text-sm font-medium truncate max-w-24">
                    {file.name}
                  </span>
                  <span className="text-white/60 text-xs">
                    {(file.size / 1024).toFixed(1)}KB
                  </span>
                </div>
                <GlassButton
                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                  variant="ghost"
                  size="xs"
                  className="w-6 h-6 !p-0 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-300 text-white/60"
                >
                  ×
                </GlassButton>
              </GlassCard>
            ))}
          </div>
        </div>
      )}


      {/* Seamless transition separator */}
      <div className="relative z-5 h-2 bg-gradient-to-b from-transparent via-black/5 to-black/10" />

      {/* Ultra-Modern Glassmorphism Chat Input */}
      <div className="relative z-10 px-4 pb-2">
        <GlassChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={isLoading}
          isLoading={isLoading}
          variant="elevated"
          showAttachButton={true}
          showVoiceButton={false}
          showMagicButton={true}
          onAttachFile={handleAttachFile}
          onMagicAction={handleMagicAction}
        />
      </div>

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