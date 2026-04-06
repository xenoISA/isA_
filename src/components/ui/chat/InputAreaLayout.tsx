import React, { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { createLogger } from '../../../utils/logger';
import { GlassChatInput, IntelligentModeSettings } from '../../shared';
import { useTranslation } from '../../../hooks/useTranslation';
import { useMatePresence } from '../../../hooks/useMatePresence';
import { useMessageStore } from '../../../stores/useMessageStore';
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
  onShowWidgetSelector?: () => void;
  showWidgetSelector?: boolean;
  onShowChatConfig?: () => void;
}

export const InputAreaLayout: React.FC<InputAreaLayoutProps> = ({
  placeholder,
  disabled,
  onBeforeSend,
  onAfterSend,
  onError,
  onSend,
  onSendMultimodal,
  suggestionsContent,
  className = '',
  children,
  onShowWidgetSelector,
}) => {
  const { t } = useTranslation();
  const { isOnline, isWorking, channels } = useMatePresence();
  const activeDelegationCount = useMessageStore(
    (s) => s.activeDelegations.filter((d) => d.status === 'delegating' || d.status === 'working').length
  );
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [intelligentMode, setIntelligentMode] = useState<IntelligentModeSettings>({
    mode: 'reactive',
    confidence_threshold: 0.7,
    enable_predictions: false
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.wav`, { type: 'audio/wav' });
        setAttachedFiles(prev => [...prev, audioFile]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      log.error('Recording failed', error);
      onError?.(new Error('Microphone access denied'));
    }
  };

  const toggleRecording = () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      startRecording();
    }
  };

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

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || isLoading) return;

    const hasAudioFiles = attachedFiles.some(file => file.type.startsWith('audio/'));
    let messageToSend = inputValue.trim();

    if (!messageToSend && hasAudioFiles) {
      messageToSend = 'Please transcribe and process this voice message';
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

    setIsLoading(true);

    try {
      if (attachedFiles.length > 0 && onSendMultimodal) {
        await onSendMultimodal(messageToSend, attachedFiles, {
          intelligentMode,
          isVoiceMessage: hasAudioFiles,
          multimodal: true,
        });
      } else if (onSend) {
        await onSend(messageToSend, { intelligentMode, multimodal: false });
      }

      setInputValue('');
      setAttachedFiles([]);
      onAfterSend?.(messageToSend);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Send failed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Status text
  const getStatusText = () => {
    if (isLoading) return 'Mate is thinking...';
    if (!isOnline) return 'Mate is offline';
    if (isWorking) return `Mate is working on ${activeDelegationCount} task${activeDelegationCount !== 1 ? 's' : ''}`;
    return 'Mate is here';
  };

  return (
    <div className={`${className}`}>
      {/* Suggestions */}
      {suggestionsContent && (
        <div className="px-4 pb-2">
          {suggestionsContent}
        </div>
      )}

      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.06] border border-white/[0.08] text-xs text-white/70"
              >
                <span className="truncate max-w-[120px]">{file.name}</span>
                <span className="text-white/30 tabular-nums">({Math.round(file.size / 1024)}KB)</span>
                <button
                  onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                  className="size-4 flex items-center justify-center rounded text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <svg className="size-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status line */}
      <div className="px-5 pb-1.5 flex items-center gap-2">
        <div className={`size-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-white/20'}`} />
        <span className="text-[11px] text-white/30 leading-none">
          {getStatusText()}
        </span>
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <GlassChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          placeholder={placeholder || t('placeholders.typeMessage')}
          disabled={disabled || isLoading}
          isLoading={isLoading}
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
          className="w-full"
        />
      </div>

      {children && (
        <div className="px-4 pb-3">
          {children}
        </div>
      )}
    </div>
  );
};
