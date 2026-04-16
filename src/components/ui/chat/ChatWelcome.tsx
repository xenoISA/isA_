/**
 * ============================================================================
 * ChatWelcome Component (ChatWelcome.tsx) - Dynamic Widget-Driven Welcome
 * ============================================================================
 * 
 * 【核心功能】
 * - 动态加载widget配置，支持运行时修改
 * - 点击widget卡片直接触发对应widget并发送预设消息
 * - 动态示例提示词，支持配置化管理
 * - 利用现有的handler、module、store架构
 * 
 * 【Widget映射】
 * - Creative Projects → OmniWidget (⚡ 多功能内容生成)
 * - Product Search → HuntWidget (🔍 产品搜索)
 * - Image Generation → DreamWidget (🎨 图像生成)
 * - Knowledge Analysis → KnowledgeWidget (🧠 文档分析)
 */

import React, { useEffect, useCallback } from 'react';
import { createLogger } from '../../../utils/logger';
import { useAppStore } from '../../../stores/useAppStore';
const log = createLogger('ChatWelcome');
import { WidgetType } from '../../../types/widgetTypes';
import {
  useOmniActions,
  useHuntActions,
  useDreamActions,
  useKnowledgeActions
} from '../../../stores/useWidgetStores';
import { createWelcomeConfig, validateWelcomeConfig } from '../../../config/welcomeConfig';
import { useLanguageStore } from '../../../stores/useLanguageStore';
import { useOnboardingState } from '../../../hooks/useOnboardingState';
import { CompanionOnboarding } from './CompanionOnboarding';

interface ChatWelcomeProps {
  onSendMessage?: (message: string) => void;
  className?: string;
}

// Dynamic configuration is now loaded from welcomeConfig

export const ChatWelcome: React.FC<ChatWelcomeProps> = ({
  onSendMessage,
  className = ''
}) => {
  const { setCurrentApp, setShowRightSidebar } = useAppStore();
  const { triggerOmniGeneration } = useOmniActions();
  const { triggerHuntSearch } = useHuntActions();
  const { triggerDreamGeneration } = useDreamActions();
  const { triggerKnowledgeAnalysis } = useKnowledgeActions();
  const { currentLanguage } = useLanguageStore();
  const { isNewUser, completeOnboarding } = useOnboardingState();

  // Generate dynamic welcome config based on current language
  const welcomeConfig = React.useMemo(() => createWelcomeConfig(currentLanguage), [currentLanguage]);

  // Handle onboarding completion — store user preferences then dismiss
  const handleOnboardingComplete = useCallback(
    (data?: { name: string; interests: string; preference: string }) => {
      if (data) {
        try {
          localStorage.setItem('mate_user_preferences', JSON.stringify(data));
          log.info('Onboarding completed with user data', { name: data.name });
        } catch (err) {
          log.error('Failed to persist onboarding data', err);
        }
      } else {
        log.info('Onboarding skipped');
      }
      completeOnboarding();
    },
    [completeOnboarding],
  );

  // Validate configuration on component mount and language change
  useEffect(() => {
    const isValid = validateWelcomeConfig();
    if (!isValid) {
      log.error('Invalid welcome configuration detected');
    } else {
      log.info('Welcome configuration loaded successfully', { language: currentLanguage });
    }
  }, [currentLanguage]);

  // 处理widget卡片点击
  const handleWidgetClick = async (widget: typeof welcomeConfig.widgets[0]) => {
    log.info(`Widget clicked - ${widget.title} (${widget.id})`);
    
    try {
      // 1. 打开对应widget的侧边栏
      setCurrentApp(widget.id as any); // Cast to AppId type
      setShowRightSidebar(true);
      // 移除setTriggeredAppInput，避免重复发送消息
      
      // 2. 根据widget类型触发对应的处理逻辑
      const params = {
        prompt: widget.defaultPrompt,
        query: widget.defaultPrompt
      };
      
      switch (widget.id) {
        case 'omni':
          await triggerOmniGeneration(params);
          break;
        case 'hunt':
          await triggerHuntSearch(params);
          break;
        case 'dream':
          await triggerDreamGeneration(params);
          break;
        case 'knowledge':
          await triggerKnowledgeAnalysis(params);
          break;
        default:
          log.warn(`Unknown widget type - ${widget.id}`);
      }
      
      log.info(`Widget ${widget.title} activated successfully`);
    } catch (error) {
      log.error(`Failed to activate widget ${widget.title}`, error);
    }
  };

  // 处理示例提示词点击
  const handlePromptClick = (prompt: string) => {
    log.info(`Example prompt clicked - ${prompt}`);
    if (onSendMessage) {
      onSendMessage(prompt);
    }
  };

  // New users see the conversational onboarding flow instead of the welcome screen
  if (isNewUser) {
    return (
      <CompanionOnboarding
        onComplete={handleOnboardingComplete}
        className={className}
      />
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-[60vh] px-4 sm:px-6 lg:px-8 py-8 md:py-16 ${className}`}>
      <div className="w-full max-w-2xl mx-auto">
        {/* Mate avatar — clean circle, no gradient */}
        <div className="mb-6 flex justify-center md:justify-start">
          <div className="w-12 h-12 rounded-full bg-[#111111] dark:bg-gray-100 flex items-center justify-center text-white dark:text-[#111111] text-lg font-bold shadow-sm">
            M
          </div>
        </div>

        {/* Heading — warm, personal greeting */}
        <div className="mb-8 md:mb-12 text-center md:text-left">
          <h1
            className="text-2xl sm:text-3xl md:text-[2.25rem] font-semibold mb-3 text-balance"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: '1.2' }}
          >
            What can I help with?
          </h1>
          <p
            className="text-sm sm:text-base leading-relaxed max-w-[50ch] text-pretty font-display"
            style={{ color: 'var(--text-muted)' }}
          >
            {welcomeConfig.subtitle}
          </p>
        </div>

        {/* Widget Cards — 2-col grid, no glass, clean borders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {welcomeConfig.widgets.map((widget) => (
            <button
              key={widget.id}
              className="flex items-start gap-3 p-4 rounded-xl text-left cursor-pointer group transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              style={{
                background: 'var(--glass-secondary)',
                border: '1px solid var(--glass-border)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
              }}
              onClick={() => handleWidgetClick(widget)}
            >
              <div
                className="size-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(255,255,255,0.06)', color: widget.accentColor }}
              >
                {widget.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="font-medium text-sm mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {widget.title}
                </h3>
                <p
                  className="text-xs leading-relaxed line-clamp-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {widget.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Quick start — horizontal chips */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Try asking
          </p>
          <div className="flex flex-wrap gap-2">
            {welcomeConfig.examplePrompts.map((prompt, index) => (
              <button
                key={index}
                className="px-3 py-1.5 rounded-full text-xs cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
                onClick={() => handlePromptClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};