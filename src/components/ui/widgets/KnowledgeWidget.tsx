/**
 * ============================================================================
 * Knowledge Widget UI (KnowledgeWidget.tsx) - Refactored to use BaseWidget
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Knowledge management interface using standardized BaseWidget layout
 * - Three tabs: Add documents, Ask questions, Browse knowledge
 * - Document upload and intelligent Q&A functionality
 * - Pure UI component with business logic handled by module
 * 
 * Benefits of BaseWidget integration:
 * - Standardized three-area layout (Output, Input, Management)
 * - Built-in knowledge interaction history management
 * - Consistent edit and management actions for documents
 * - Streaming status display for processing
 * - Knowledge-specific actions (export, summarize, share)
 */
import React, { useState } from 'react';
import { createLogger } from '../../../utils/logger';
import { KnowledgeWidgetParams } from '../../../types/widgetTypes';
import { BaseWidget, OutputHistoryItem, EditAction, ManagementAction, EmptyStateConfig } from './BaseWidget';
const log = createLogger('KnowledgeWidget');

// Knowledge processing modes
interface KnowledgeMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  estimatedTime: string;
  useCase: string;
  keywords: string[];
  isActive: boolean;
}

const knowledgeModes: KnowledgeMode[] = [
  {
    id: 'document',
    name: 'Document',
    description: 'Process and analyze text documents',
    icon: '📄',
    estimatedTime: '2-5 seconds',
    useCase: 'Perfect for: PDFs, Word docs, text analysis',
    keywords: ['document', 'text', 'pdf', 'word', 'analyze', 'read'],
    isActive: true
  },
  {
    id: 'graph',
    name: 'Graph',
    description: 'Create knowledge graphs and connections',
    icon: '🕸️',
    estimatedTime: '5-10 seconds',
    useCase: 'Perfect for: Relationships, connections, mapping',
    keywords: ['graph', 'network', 'connection', 'relationship', 'map'],
    isActive: false
  },
  {
    id: 'image',
    name: 'Image',
    description: 'Extract knowledge from images and diagrams',
    icon: '🖼️',
    estimatedTime: '3-8 seconds',
    useCase: 'Perfect for: Charts, diagrams, visual content',
    keywords: ['image', 'visual', 'chart', 'diagram', 'ocr', 'extract'],
    isActive: false
  }
];

// Smart mode detection based on user input
const detectBestMode = (input: string): KnowledgeMode => {
  const lowerInput = input.toLowerCase();
  
  // Find active modes that match keywords
  const possibleModes = knowledgeModes.filter(mode => {
    const keywordMatch = mode.keywords.some(keyword => lowerInput.includes(keyword));
    return keywordMatch && mode.isActive;
  });
  
  // Return best match or default to document
  return possibleModes[0] || knowledgeModes[0];
};

interface KnowledgeWidgetProps {
  // Props provided by KnowledgeWidgetModule via React.cloneElement (optional for typing)
  isProcessing?: boolean;
  result?: any;
  onProcess?: (params: any) => Promise<void>;
  onClearResults?: () => void;
  
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

/**
 * Knowledge Widget Input Area - Content that goes inside BaseWidget
 */
const KnowledgeInputArea: React.FC<KnowledgeWidgetProps> = ({
  isProcessing,
  result,
  triggeredInput,
  onProcess,
  onClearResults
}) => {
  // Modern state management
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<KnowledgeMode>(knowledgeModes[0]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processingDepth, setProcessingDepth] = useState('standard');

  // Real-time mode recommendations
  React.useEffect(() => {
    if (query.trim()) {
      const bestMode = detectBestMode(query);
      if (bestMode.id !== selectedMode.id) {
        setSelectedMode(bestMode);
        log.debug('Mode recommendation updated', bestMode.id);
      }
    }
  }, [query, selectedMode.id]);

  // Auto-fill input when triggered
  React.useEffect(() => {
    if (triggeredInput && triggeredInput !== query) {
      setQuery(triggeredInput);
    }
  }, [triggeredInput, query]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      log.info('Files uploaded', fileArray.length);
      setUploadedFiles(fileArray);
    }
  };

  // Handle knowledge processing
  const handleKnowledgeProcessing = async () => {
    if (!query.trim() || !onProcess || isProcessing) return;
    
    // Check if mode requires files but none are uploaded
    if (selectedMode.id !== 'document' && uploadedFiles.length === 0) {
      alert(`${selectedMode.name} mode requires uploaded files. Please upload files first.`);
      return;
    }

    // Check if mode is active
    if (!selectedMode.isActive) {
      alert(`${selectedMode.name} is coming soon! Please try the Document mode.`);
      return;
    }

    log.info('Starting knowledge processing with mode', selectedMode.name);
    
    try {
      const params: KnowledgeWidgetParams = {
        task: selectedMode.id,
        query: query,
        files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
        // Add mode-specific parameters if supported
        ...(processingDepth && { processingDepth })
      };
      
      await onProcess(params);
      
      log.info('Knowledge processing request sent with mode', selectedMode.name);
    } catch (error) {
      log.error('Knowledge processing failed', error);
    }
  };


  return (
    <div className="space-y-4 p-3">
      {/* Compact Mode Header - like other widgets */}
      <div className="flex items-center gap-3 p-2 bg-green-500/10 rounded border border-green-500/20">
        <span className="text-lg">{selectedMode.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{selectedMode.name}</div>
          <div className="flex gap-3 text-xs text-white/50">
            <span>{selectedMode.estimatedTime}</span>
            <span>Knowledge Management</span>
          </div>
        </div>
      </div>

      {/* Compact Input Area with Upload Button */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <textarea
            value={query}
            onChange={(e) => {
              const newValue = e.target.value;
              if (newValue !== query) {
                log.debug('Query changed');
              }
              setQuery(newValue);
            }}
            placeholder={`Describe your ${selectedMode.name.toLowerCase()} request...`}
            className="flex-1 p-2 bg-white/5 border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-blue-500 resize-none text-sm"
            rows={2}
          />
          <button
            onClick={() => document.getElementById('knowledge-upload')?.click()}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white/80 hover:bg-white/10 transition-all text-xs flex items-center gap-1"
          >
            📁 Upload
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          id="knowledge-upload"
        />
        
        {/* Show uploaded files info */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            <div className="text-xs text-white/60">{uploadedFiles.length} file(s) selected:</div>
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-white/5 border border-white/10 rounded">
                <span className="text-sm">📁</span>
                <span className="text-xs text-white/60">{file.name}</span>
                <button 
                  onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                  className="ml-auto text-xs text-white/60 hover:text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compact Mode Selector */}
      <div>
        <div className="text-xs text-white/60 mb-2">🎯 Select Mode</div>
        <div className="grid grid-cols-3 gap-1">
          {knowledgeModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                if (mode.isActive) {
                  setSelectedMode(mode);
                  log.debug('Mode selected', mode.name);
                } else {
                  log.debug('Mode disabled', mode.name);
                }
              }}
              disabled={!mode.isActive}
              className={`p-1.5 rounded border transition-all text-center ${
                selectedMode.id === mode.id
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : mode.isActive 
                    ? 'bg-white/5 border-white/10 hover:bg-white/10 text-white cursor-pointer'
                    : 'bg-white/5 border-white/10 text-white/60 cursor-not-allowed'
              }`}
              title={`${mode.name} - ${mode.description}${!mode.isActive ? ' (Coming Soon)' : ''}`}
            >
              <div className="text-xs mb-0.5">{mode.icon}</div>
              <div className="text-xs font-medium truncate leading-tight">{mode.name}</div>
              {!mode.isActive && <div className="text-xs text-white/60">Soon</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options - Only Processing Depth */}
      {selectedMode && (
        <div className="space-y-2">
          <div className="text-xs text-white/60">⚙️ Advanced Options</div>
          
          <div>
            <label className="block text-xs text-white/60 mb-1">Processing Depth</label>
            <select 
              className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs"
              value={processingDepth} 
              onChange={(e) => setProcessingDepth(e.target.value)}
            >
              <option value="standard">Standard</option>
              <option value="comprehensive">Comprehensive</option>
              <option value="deep">Deep Analysis</option>
            </select>
          </div>
        </div>
      )}

      {/* Enhanced Process Button */}
      <button
        onClick={handleKnowledgeProcessing}
        disabled={isProcessing || !query.trim()}
        className={`w-full p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded text-white font-medium transition-all hover:from-green-600 hover:to-blue-600 flex items-center justify-center gap-2 text-sm ${
          isProcessing ? 'animate-pulse' : ''
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isProcessing ? (
          <>
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Processing...
          </>
        ) : (
          <>
            <span>{selectedMode.icon}</span>
            Process with {selectedMode.name}
          </>
        )}
      </button>
    </div>
  );
};

/**
 * Knowledge Widget with BaseWidget - New standardized layout
 */
export const KnowledgeWidget: React.FC<KnowledgeWidgetProps> = ({
  isProcessing = false,
  result = null,
  triggeredInput,
  outputHistory = [],
  currentOutput = null,
  isStreaming = false,
  streamingContent = '',
  onProcess = async () => {},
  onClearResults = () => {},
  onSelectOutput,
  onClearHistory,
  onBack
}) => {
  
  // Custom edit actions for knowledge results
  const editActions: EditAction[] = [
    {
      id: 'summarize',
      label: 'Summarize',
      icon: '📄',
      onClick: (content) => {
        // Generate summary of the knowledge content
        log.info('Generating summary for', content);
      }
    },
    {
      id: 'export_pdf',
      label: 'Export PDF',
      icon: '📑',
      onClick: (content) => {
        // Export knowledge content as PDF
        if (typeof content === 'object' && content !== null) {
          const pdfContent = JSON.stringify(content, null, 2);
          const blob = new Blob([pdfContent], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `knowledge_export_${Date.now()}.pdf`;
          link.click();
          URL.revokeObjectURL(url);
        }
      }
    },
    {
      id: 'cite',
      label: 'Cite',
      icon: '📚',
      onClick: (content) => {
        // Generate citation for the knowledge content
        const citation = `Knowledge extracted on ${new Date().toLocaleDateString()}`;
        navigator.clipboard.writeText(citation);
      }
    }
  ];

  // Custom management actions for knowledge - only analyze mode active
  const managementActions: ManagementAction[] = [
    {
      id: 'analyze',
      label: 'Analyze',
      icon: '🔍',
      onClick: () => onProcess({ 
        task: 'analyze',
        query: 'Analyze documents for insights and patterns'
      }),
      variant: 'primary' as const,
      disabled: false
    },
    {
      id: 'search',
      label: 'Search',
      icon: '🔎',
      onClick: () => log.info('Search mode - coming soon'),
      disabled: true
    },
    {
      id: 'manage',
      label: 'Manage',
      icon: '📚',
      onClick: () => log.info('Manage mode - coming soon'),
      disabled: true
    },
    {
      id: 'other',
      label: 'Other',
      icon: '📄',
      onClick: () => log.info('Other mode - coming soon'),
      disabled: true
    }
  ];

  // Custom empty state for Knowledge Widget
  const knowledgeEmptyState: EmptyStateConfig = {
    icon: '🧠',
    title: 'Ready to Build Knowledge',
    description: 'Upload documents, ask questions, and build your AI-powered knowledge base. Analyze documents, extract insights, and get instant answers.',
    actionText: 'Upload Document',
    onAction: () => {
      document.getElementById('file-upload')?.click();
    }
  };

  return (
    <BaseWidget
      title="Knowledge Hub"
      icon="🧠"
      isProcessing={isProcessing}
      outputHistory={outputHistory}
      currentOutput={currentOutput}
      isStreaming={isStreaming}
      streamingContent={streamingContent}
      editActions={editActions}
      managementActions={managementActions}
      onSelectOutput={onSelectOutput}
      onClearHistory={onClearHistory}
      onBack={onBack}
      showBackButton={true}
      emptyStateConfig={knowledgeEmptyState}
    >
      <KnowledgeInputArea
        isProcessing={isProcessing}
        result={result}
        triggeredInput={triggeredInput}
        onProcess={onProcess}
        onClearResults={onClearResults}
      />
    </BaseWidget>
  );
};