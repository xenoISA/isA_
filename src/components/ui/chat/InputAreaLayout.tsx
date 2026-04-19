import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { createLogger } from '../../../utils/logger';
import { FileUpload } from './FileUpload';
import { GlassChatInput, GlassCard, GlassButton, IntelligentModeSettings } from '../../shared';
import { useTranslation } from '../../../hooks/useTranslation';
import { useMatePresence } from '../../../hooks/useMatePresence';
import { useMessageStore } from '../../../stores/useMessageStore';
import { useStreamingStore } from '../../../stores/useStreamingStore';
import { ModelSelectorDropdown } from './ModelSelectorDropdown';
const log = createLogger('InputAreaLayout');

export interface InputAreaLayoutProps {
  placeholder?: string;
  multiline?: boolean;
  maxRows?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  onBeforeSend?: (message: string) => string;
  onAfterSend?: (message: string) => void;
  onError?: (error: Error) => void;
  onFileSelect?: (files: FileList) => void;
  onSend?: (message: string, metadata?: Record<string, any>) => Promise<void>;
  onSendMultimodal?: (message: string, files: File[], metadata?: Record<string, any>) => Promise<void>;
  suggestionsContent?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  config?: any;
  // Widget system integration
  onShowWidgetSelector?: () => void;
  showWidgetSelector?: boolean;
  // Chat configuration
  onShowChatConfig?: () => void;
}

/**
 * Clean InputAreaLayout - CSS Classes
 */
export const InputAreaLayout: React.FC<InputAreaLayoutProps> = ({
  placeholder,
  multiline,
  maxRows,
  disabled,
  autoFocus,
  onBeforeSend,
  onAfterSend,
  onError,
  onFileSelect,
  onSend,
  onSendMultimodal,
  suggestionsContent,
  className = '',
  children,
  config,
  onShowWidgetSelector,
  showWidgetSelector,
  onShowChatConfig
}) => {
  const { t } = useTranslation();
  const { isOnline, isWorking, channels } = useMatePresence();
  const stopStreaming = useStreamingStore((s) => s.stopStreaming);
  const allMessages = useMessageStore((s) => s.messages);
  const lastMsg = allMessages[allMessages.length - 1];
  const isActivelyStreaming = !!(lastMsg && 'isStreaming' in lastMsg && lastMsg.isStreaming);
  const activeDelegationCount = useMessageStore(
    (s) => s.activeDelegations.filter((d) => d.status === 'delegating' || d.status === 'working').length
  );
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [intelligentMode, setIntelligentMode] = useState<IntelligentModeSettings>({
    mode: 'reactive',
    confidence_threshold: 0.7,
    enable_predictions: false
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize audio context
  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      log.debug('Audio not supported');
    }
  }, []);

  // Audio feedback
  const playAudioFeedback = (type: 'send' | 'click' | 'success' | 'error') => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    switch (type) {
      case 'send':
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        break;
      case 'click':
        oscillator.frequency.setValueAtTime(600, ctx.currentTime);
        break;
      case 'success':
        oscillator.frequency.setValueAtTime(523, ctx.currentTime);
        oscillator.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
        break;
      case 'error':
        oscillator.frequency.setValueAtTime(300, ctx.currentTime);
        break;
    }
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  };

  const suggestions = [
    'Create a blog post',
    'Generate an image', 
    'Analyze some data',
    'Process a document',
    'Research products'
  ];

  const handleSuggestionClick = (suggestion: string) => {
    playAudioFeedback('click');
    setInputValue(suggestion);
    textareaRef.current?.focus();
    setShowSuggestions(false);
  };

  // File handling functions
  const handleFileSelection = (files: FileList) => {
    // Temporarily disabled - return early
    log.info('File upload temporarily disabled');
    return;
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.wav`, { type: 'audio/wav' });
        
        // Add audio file to attachments for multimodal sending
        setAttachedFiles(prev => [...prev, audioFile]);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        playAudioFeedback('success');
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      playAudioFeedback('click');
    } catch (error) {
      log.error('Recording failed', error);
      playAudioFeedback('error');
      if (onError) {
        onError(new Error('无法访问麦克风，请检查权限设置'));
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    playAudioFeedback('click');
  };

  // Handle input change with auto-resize
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Auto-resize textarea - use setTimeout to ensure DOM updates first
    setTimeout(() => {
      const textarea = e.target;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 40), 150); // Min 40px, max 150px
      textarea.style.height = newHeight + 'px';
      log.debug('Textarea resized', { scrollHeight, newHeight });
    }, 0);
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || isLoading) return;

    playAudioFeedback('send');
    
    // Check if we have voice files
    const hasAudioFiles = attachedFiles.some(file => file.type.startsWith('audio/'));
    let messageToSend = inputValue.trim();
    
    // If no text message but has audio files, provide default message
    if (!messageToSend && hasAudioFiles) {
      messageToSend = '请转录和处理这个语音消息';
    } else if (!messageToSend) {
      messageToSend = 'Please analyze the attached files';
    }

    if (onBeforeSend) {
      messageToSend = onBeforeSend(messageToSend);
      if (messageToSend === null) {
        setInputValue('');
        setAttachedFiles([]);
        return;
      }
    }

    // Clear input immediately for responsive UX — don't wait for stream
    setInputValue('');
    setAttachedFiles([]);

    try {
      if (attachedFiles.length > 0 && onSendMultimodal) {
        const metadata = { intelligentMode, isVoiceMessage: hasAudioFiles, multimodal: true };
        // Fire-and-forget: don't await stream completion to unblock input
        onSendMultimodal(messageToSend, attachedFiles, metadata).catch((error) => {
          playAudioFeedback('error');
          onError?.(error instanceof Error ? error : new Error('Send failed'));
        });
      } else if (onSend) {
        const metadata = { intelligentMode, multimodal: false };
        onSend(messageToSend, metadata).catch((error) => {
          playAudioFeedback('error');
          onError?.(error instanceof Error ? error : new Error('Send failed'));
        });
      }

      playAudioFeedback('success');
      onAfterSend?.(messageToSend);
    } catch (error) {
      playAudioFeedback('error');
      onError?.(error instanceof Error ? error : new Error('Send failed'));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };


  // Minimal Button Style Creator
  const createMinimalButtonStyle = (isDisabled: boolean = false) => ({
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    background: isDisabled ? '#f3f4f6' : '#ffffff',
    border: isDisabled ? '1px solid #e5e7eb' : '1px solid #e5e7eb',
    opacity: isDisabled ? 0.6 : 1,
    color: isDisabled ? '#9ca3af' : '#374151'
  });

  const createMinimalHoverHandlers = () => ({
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!e.currentTarget.disabled) {
        e.currentTarget.style.background = '#f9fafb';
        e.currentTarget.style.borderColor = '#d1d5db';
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      if (!e.currentTarget.disabled) {
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.borderColor = '#e5e7eb';
      }
    }
  });

  // Beautiful Loading Spinner Component
  const LoadingSpinner = () => (
    <div 
      style={{
        position: 'relative',
        width: '16px',
        height: '16px'
      }}
    >
      <div 
        style={{
          position: 'absolute',
          inset: '0',
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: 'rgba(255, 255, 255, 0.3)',
          animation: 'spin 1s linear infinite'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          inset: '2px',
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#60a5fa',
          animation: 'spin 0.8s linear infinite reverse'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          inset: '4px',
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#a78bfa',
          animation: 'spin 1.2s linear infinite'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '4px',
          height: '4px',
          background: 'linear-gradient(45deg, #60a5fa, #a78bfa)',
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'pulse 1s ease-in-out infinite'
        }}
      />
    </div>
  );

  // Handle file attachment
  const handleFileAttach = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt';
    input.onchange = (e: any) => {
      const files = Array.from(e.target.files || []) as File[];
      setAttachedFiles(prev => [...prev, ...files]);
    };
    input.click();
  };

  return (
    <div className={`p-4 ${className}`}>
      {/* Suggestions Content */}
      {suggestionsContent && (
        <GlassCard variant="subtle" className="mb-4">
          {suggestionsContent}
        </GlassCard>
      )}
      
      {/* File Attachments Display */}
      {attachedFiles.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <GlassCard key={index} variant="elevated" className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="font-medium">{file.name}</span>
                <span className="text-xs opacity-70">({Math.round(file.size / 1024)}KB)</span>
                <GlassButton
                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                  variant="ghost"
                  size="xs"
                  className="w-5 h-5 !p-0 text-red-400 hover:text-red-300"
                >
                  ×
                </GlassButton>
              </GlassCard>
            ))}
          </div>
        </div>
      )}

      {/* Mate status line */}
      <div className="mb-2 px-1 flex items-center gap-2">
        <span className={`text-xs font-display ${!isOnline ? 'text-white/30' : 'text-[var(--mate-accent)]/60'}`}>
          {isActivelyStreaming
            ? 'Responding...'
            : !isOnline
              ? 'Connecting...'
              : isWorking
                ? `Working on ${activeDelegationCount} task${activeDelegationCount !== 1 ? 's' : ''}...`
                : ''}
        </span>
        {isOnline && channels.length > 0 && !isLoading && (
          <span className="text-xs text-white/30">
            Active on {channels.length} channel{channels.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Model Selector — above input, Claude-style (#194) */}
      <div className="flex items-center mb-1">
        <ModelSelectorDropdown />
      </div>

      {/* Main Glass Chat Input */}
      <GlassChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSendMessage}
        placeholder={placeholder || t('placeholders.typeMessage')}
        disabled={disabled}
        isLoading={false}
        variant="elevated"
        showAttachButton={true}
        showVoiceButton={true}
        showMagicButton={!!onShowWidgetSelector}
        onAttachFile={handleFileAttach}
        onVoiceRecord={toggleRecording}
        isRecording={isRecording}
        onMagicAction={onShowWidgetSelector}
        intelligentMode={intelligentMode}
        onIntelligentModeChange={setIntelligentMode}
        isStreaming={isActivelyStreaming}
        onStop={stopStreaming}
        className="w-full"
      />
      
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
};
