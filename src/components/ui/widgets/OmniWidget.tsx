/**
 * ============================================================================
 * Omni Widget UI (OmniWidget.tsx) - Refactored to use BaseWidget
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Multi-topic content generation system using standardized BaseWidget layout
 * - 10 topic categories with intelligent template selection
 * - Deep configuration and reference material management
 * - Pure UI component with business logic handled by module
 * 
 * Benefits of BaseWidget integration:
 * - Standardized three-area layout (Output, Input, Management)
 * - Built-in content generation history management
 * - Consistent edit and management actions for generated content
 * - Streaming status display for generation progress
 * - Content-specific actions (export, refine, share)
 */
import React, { useState } from 'react';
import { createLogger } from '../../../utils/logger';
import { OmniWidgetParams } from '../../../types/widgetTypes';
import { BaseWidget, OutputHistoryItem, EditAction, ManagementAction, EmptyStateConfig } from './BaseWidget';
const log = createLogger('OmniWidget');

interface OmniWidgetProps {
  // Props provided by OmniWidgetModule via React.cloneElement (optional for typing)
  isGenerating?: boolean;
  generatedContent?: string | null;
  lastParams?: OmniWidgetParams | null;
  onGenerateContent?: (params: OmniWidgetParams) => Promise<void>;
  onClearContent?: () => void;
  
  // 📊 Configuration data (should come from WidgetStore/Module)
  topicConfigs?: Record<string, TopicConfig>;
  topicCategories?: TopicCategory[];
  defaultTopic?: string;
  defaultTemplate?: string;
  
  // Base UI props that can be passed directly
  triggeredInput?: string;
  outputHistory?: OutputHistoryItem[];
  currentOutput?: OutputHistoryItem | null;
  isStreaming?: boolean;
  streamingContent?: string;
  onSelectOutput?: (item: OutputHistoryItem) => void;
  onClearHistory?: () => void;
  onBack?: () => void;
}

// Content Generation Arguments (should come from props/config)
interface ContentGenerationArgs {
  topic: string;
  template: string;
  subject: string;
  referenceUrls: string[];
  referenceFiles: File[];
  referenceText: string;
  depth: 'shallow' | 'deep';
}

// Template configuration (should come from props/config)
interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  default?: boolean;
  promptTemplate: (args: ContentGenerationArgs) => string;
}

// Topic-specific configurations (should come from props/config)
interface TopicConfig {
  name: string;
  description: string;
  templates: TemplateConfig[];
}

// Topic category for UI display (should come from props/config)
interface TopicCategory {
  id: string;
  title: string;
  icon: string;
}

/**
 * Omni Widget Input Area - Content that goes inside BaseWidget
 */
const OmniInputArea: React.FC<OmniWidgetProps> = ({
  isGenerating,
  generatedContent,
  lastParams,
  triggeredInput,
  onGenerateContent,
  onClearContent,
  topicConfigs = {},
  topicCategories = [],
  defaultTopic = 'custom',
  defaultTemplate = 'general'
}) => {
  // Content Generation Arguments (initialized with props)
  const [args, setArgs] = useState<ContentGenerationArgs>({
    topic: defaultTopic,
    template: defaultTemplate,
    subject: '',
    referenceUrls: [],
    referenceFiles: [],
    referenceText: '',
    depth: 'deep'
  });

  // Auto-fill input when triggered and smart topic detection
  React.useEffect(() => {
    if (triggeredInput && triggeredInput !== args.subject) {
      setArgs(prev => ({ ...prev, subject: triggeredInput }));
      
      // Smart topic detection using available topicConfigs
      const input = triggeredInput.toLowerCase();
      const availableTopics = Object.keys(topicConfigs);
      
      // Try to match keywords with available topics
      let detectedTopic = defaultTopic;
      for (const topicId of availableTopics) {
        const keywords = ['business', 'education', 'tech', 'social', 'health', 'lifestyle', 'career', 'news', 'creative', 'science'];
        if (keywords.some(keyword => input.includes(keyword) && topicId.includes(keyword))) {
          detectedTopic = topicId;
          break;
        }
      }
      
      setArgs(prev => ({ 
        ...prev, 
        topic: detectedTopic,
        template: topicConfigs[detectedTopic]?.templates.find(t => t.default)?.id || defaultTemplate
      }));
    }
  }, [triggeredInput, topicConfigs, defaultTopic, defaultTemplate, args.subject]);

  // Configuration validation and fallbacks
  const safeTopicConfigs = topicConfigs || {};
  const safeTopicCategories = topicCategories || [];

  // Update args helper using props configuration
  const updateArgs = (key: keyof ContentGenerationArgs, value: any) => {
    setArgs(prev => {
      const updated = { ...prev, [key]: value };
      
      // When topic changes, reset to default template
      if (key === 'topic' && safeTopicConfigs[value]) {
        const defaultTemplate = safeTopicConfigs[value].templates.find(t => t.default) || safeTopicConfigs[value].templates[0];
        updated.template = typeof defaultTemplate === 'string' ? defaultTemplate : defaultTemplate?.id || '';
      }
      
      return updated;
    });
  };
  
  // File upload handler (exact copy from omni_sidebar.tsx)
  const handleFileUpload = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setArgs(prev => ({
        ...prev,
        referenceFiles: [...prev.referenceFiles, ...newFiles]
      }));
    }
  };
  
  // Add URL to reference list (exact copy from omni_sidebar.tsx)
  const addReferenceUrl = () => {
    const url = prompt('Enter URL:');
    if (url && url.trim()) {
      setArgs(prev => ({
        ...prev,
        referenceUrls: [...prev.referenceUrls, url.trim()]
      }));
    }
  };
  
  // Helper functions moved to business logic layer (WidgetStore/Module)

  const handleGenerate = async () => {
    if (!args.subject.trim() || !onGenerateContent || isGenerating) {
      log.info('Aborting generation - invalid input');
      return;
    }

    try {
      // 简化的参数传递 - 业务逻辑由WidgetHandler/WidgetStore处理
      const params: OmniWidgetParams = {
        prompt: args.subject,
        contentType: args.topic as any,
        tone: 'professional',
        length: args.depth === 'deep' ? 'long' : 'medium',
        // 传递配置数据让业务层处理
        metadata: {
          referenceUrls: args.referenceUrls,
          referenceText: args.referenceText,
          template: args.template,
          depth: args.depth
        }
      };
      
      log.info('Sending request to handler', params);
      await onGenerateContent(params);
    } catch (error) {
      log.error('Generation failed', error);
    }
  };

  return (
    <div className="space-y-4 p-3">
      {/* Compact Mode Header - like DreamWidget and HuntWidget */}
      <div className="flex items-center gap-3 p-2 bg-green-500/10 rounded border border-green-500/20">
        <span className="text-lg">{safeTopicCategories.find(t => t.id === args.topic)?.icon || '⚡'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {safeTopicCategories.find(t => t.id === args.topic)?.title || safeTopicConfigs[args.topic]?.name || 'Content Generation'}
          </div>
          <div className="flex gap-3 text-xs text-white/50">
            <span>{args.depth === 'deep' ? 'Deep Analysis' : 'Quick Overview'}</span>
            <span>Content Generation</span>
          </div>
        </div>
      </div>

      {/* What to Create - Input Area */}
      <div className="space-y-3">
        <textarea
          value={args.subject}
          onChange={(e) => updateArgs('subject', e.target.value)}
          placeholder="Describe what you want to create..."
          className="w-full p-2 bg-white/5 border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-blue-500 resize-none text-sm"
          rows={2}
        />
      </div>

      {/* Topic Selection - Dynamic based on props */}
      <div>
        <div className="text-xs text-white/60 mb-2">🎯 Select Topic ({safeTopicCategories.length} available)</div>
        <div className="grid grid-cols-3 gap-1 max-h-24 overflow-y-auto">
          {safeTopicCategories.map((topic) => (
            <button
              key={topic.id}
              onClick={() => updateArgs('topic', topic.id)}
              className={`p-1.5 rounded border transition-all text-center ${
                args.topic === topic.id
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-white cursor-pointer'
              }`}
              title={`${topic.title} - ${safeTopicConfigs[topic.id]?.description || 'Content generation'}`}
            >
              <div className="text-xs mb-0.5">{topic.icon}</div>
              <div className="text-xs font-medium truncate leading-tight">{topic.title.split(' ')[0]}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="space-y-2">
        <div className="text-xs text-white/60">⚙️ Advanced Options</div>
        
        {/* Depth Selection */}
        <div>
          <label className="block text-xs text-white/60 mb-1">Analysis Depth</label>
          <select
            value={args.depth}
            onChange={(e) => updateArgs('depth', e.target.value as 'shallow' | 'deep')}
            className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs"
          >
            <option value="shallow">Shallow - Quick overview</option>
            <option value="deep">Deep - Comprehensive</option>
          </select>
        </div>
        
        {/* References */}
        <div>
          <label className="block text-xs text-white/60 mb-1">References</label>
          <div className="grid grid-cols-2 gap-1 mb-1">
            <button
              onClick={addReferenceUrl}
              className="p-1.5 bg-white/5 border border-white/10 rounded text-white/80 hover:bg-white/10 transition-all text-xs"
            >
              🔗 URL
            </button>
            <label className="p-1.5 bg-white/5 border border-white/10 rounded text-white/80 hover:bg-white/10 transition-all text-xs cursor-pointer text-center">
              📁 Files
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </label>
          </div>
          <textarea
            value={args.referenceText}
            onChange={(e) => updateArgs('referenceText', e.target.value)}
            placeholder="Additional context..."
            className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-blue-500 resize-none text-xs"
            rows={2}
          />
        </div>
      </div>
      
      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !args.subject.trim()}
        className={`w-full p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded text-white font-medium transition-all hover:from-green-600 hover:to-blue-600 flex items-center justify-center gap-2 text-sm ${
          isGenerating ? 'animate-pulse' : ''
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isGenerating ? (
          <>
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Generating...
          </>
        ) : (
          <>
            <span>{safeTopicCategories.find(t => t.id === args.topic)?.icon || '⚡'}</span>
            Generate {safeTopicConfigs[args.topic]?.name || 'Content'}
          </>
        )}
      </button>
    </div>
  );
};

/**
 * Omni Widget with BaseWidget - New standardized layout
 */
export const OmniWidget: React.FC<OmniWidgetProps> = ({
  isGenerating = false,
  generatedContent = null,
  lastParams = null,
  triggeredInput,
  topicConfigs = {},
  topicCategories = [],
  defaultTopic = 'custom',
  defaultTemplate = 'general',
  outputHistory = [],
  currentOutput = null,
  isStreaming = false,
  streamingContent = '',
  onGenerateContent = async () => {},
  onClearContent = () => {},
  onSelectOutput,
  onClearHistory,
  onBack
}) => {
  
  // Custom edit actions for generated content
  const editActions: EditAction[] = [
    {
      id: 'refine',
      label: 'Refine',
      icon: '✨',
      onClick: (content) => {
        // Trigger content refinement
        log.info('Refining content', content);
      }
    },
    {
      id: 'export_doc',
      label: 'Export Doc',
      icon: '📄',
      onClick: (content) => {
        // Export as document
        if (typeof content === 'string') {
          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `omni_content_${Date.now()}.txt`;
          link.click();
          URL.revokeObjectURL(url);
        }
      }
    },
    {
      id: 'expand',
      label: 'Expand',
      icon: '📈',
      onClick: (content) => {
        // Expand content with more details
        log.info('Expanding content', content);
      }
    }
  ];

  // Custom management actions for content generation - only 4 needed actions
  const managementActions: ManagementAction[] = [
    {
      id: 'doc',
      label: 'Doc',
      icon: '📝',
      onClick: () => onGenerateContent({ 
        prompt: 'Generate document content',
        contentType: 'text',
        tone: 'professional',
        length: 'medium'
      }),
      variant: 'primary' as const,
      disabled: false
    },
    {
      id: 'presentation',
      label: 'Presentation',
      icon: '📊',
      onClick: () => onGenerateContent({ 
        prompt: 'Create presentation content',
        contentType: 'text',
        tone: 'professional',
        length: 'medium'
      }),
      disabled: false
    },
    {
      id: 'infographic',
      label: 'Infographic',
      icon: '📈',
      onClick: () => onGenerateContent({ 
        prompt: 'Create infographic content',
        contentType: 'text',
        tone: 'professional',
        length: 'short'
      }),
      disabled: false
    },
    {
      id: 'other',
      label: 'Other',
      icon: '📄',
      onClick: () => onGenerateContent({ 
        prompt: 'Generate custom content',
        contentType: 'text',
        tone: 'professional',
        length: 'medium'
      }),
      disabled: false
    }
  ];

  // Custom empty state for Omni Widget
  const omniEmptyState: EmptyStateConfig = {
    icon: '⚡',
    title: 'Ready to Create Anything',
    description: 'Generate content across 10 different categories including business, education, technology, marketing, and more. Choose your topic and let AI create exactly what you need.',
    actionText: 'Choose Topic',
    onAction: () => {
      const firstCategory = document.querySelector('.topic-category-button') as HTMLElement;
      firstCategory?.focus();
    }
  };

  return (
    <BaseWidget
      title="Omni Content"
      icon="⚡"
      isProcessing={isGenerating}
      outputHistory={outputHistory}
      currentOutput={currentOutput}
      isStreaming={isStreaming}
      streamingContent={streamingContent}
      editActions={editActions}
      managementActions={managementActions}
      onSelectOutput={onSelectOutput}
      onClearHistory={onClearHistory}
      emptyStateConfig={omniEmptyState}
      onBack={onBack}
      showBackButton={true}
    >
      <OmniInputArea
        isGenerating={isGenerating}
        generatedContent={generatedContent}
        lastParams={lastParams}
        triggeredInput={triggeredInput}
        onGenerateContent={onGenerateContent}
        onClearContent={onClearContent}
        topicConfigs={topicConfigs}
        topicCategories={topicCategories}
        defaultTopic={defaultTopic}
        defaultTemplate={defaultTemplate}
      />
    </BaseWidget>
  );
};