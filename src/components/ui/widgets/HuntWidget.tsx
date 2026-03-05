/**
 * ============================================================================
 * Hunt Widget UI (HuntWidget.tsx) - Refactored to match DreamWidget structure
 * ============================================================================
 * 
 * Core Responsibilities:
 * - AI Search Intelligence Service interface using standardized BaseWidget layout
 * - Multiple search modes with smart mode detection
 * - Advanced search configuration and analysis options
 * - Pure UI component with business logic handled by module
 * 
 * Benefits of BaseWidget integration:
 * - Standardized three-area layout (Output, Input, Management)
 * - Built-in search results history management
 * - Consistent edit and management actions for search results
 * - Streaming status display support for search progress
 * - Search-specific actions (bookmark, share, analyze)
 */
import React, { useState } from 'react';
import { HuntWidgetParams } from '../../../types/widgetTypes';
import { BaseWidget, OutputHistoryItem, EditAction, ManagementAction, EmptyStateConfig } from './BaseWidget';

// AI Search Intelligence Service modes (based on admin categories)
interface SearchMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'search' | 'crawler' | 'automation' | 'other';
  estimatedTime: string;
  useCase: string;
  keywords: string[];
  isActive: boolean; // Only search modes are active for now
}

const searchModes: SearchMode[] = [
  // General should be first (default)
  {
    id: 'general',
    name: 'General',
    description: 'General web search across all content types',
    icon: '🌐',
    category: 'search',
    estimatedTime: '1-3 seconds',
    useCase: 'Perfect for: General information, news, websites, AI topics',
    keywords: ['search', 'find', 'information', 'news', 'website', 'general', 'ai', 'artificial', 'intelligence', 'tech', 'technology'],
    isActive: true
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Search products, prices, reviews across shopping platforms',
    icon: '🛍️',
    category: 'search',
    estimatedTime: '2-5 seconds',
    useCase: 'Perfect for: Product research, price comparison, reviews',
    keywords: ['buy', 'price', 'product', 'shop', 'review', 'compare', 'purchase', 'store'],
    isActive: true
  },
  {
    id: 'academic',
    name: 'Academic',
    description: 'Search scholarly articles, research papers, citations',
    icon: '🎓',
    category: 'search',
    estimatedTime: '3-8 seconds',
    useCase: 'Perfect for: Research, citations, academic sources',
    keywords: ['research', 'paper', 'study', 'academic', 'scholar', 'citation', 'journal', 'publication'],
    isActive: true
  },
  {
    id: 'social',
    name: 'Social',
    description: 'Search social media, forums, community discussions',
    icon: '💬',
    category: 'search',
    estimatedTime: '2-6 seconds',
    useCase: 'Perfect for: Trends, opinions, social sentiment',
    keywords: ['social', 'trend', 'discussion', 'forum', 'community', 'opinion', 'twitter', 'reddit'],
    isActive: true
  }
];

// Smart mode detection based on user input (similar to DreamWidget)
const detectBestMode = (input: string): SearchMode => {
  const lowerInput = input.toLowerCase();
  
  // Find active modes that match keywords
  const possibleModes = searchModes.filter(mode => {
    const keywordMatch = mode.keywords.some(keyword => lowerInput.includes(keyword));
    return keywordMatch && mode.isActive;
  });
  
  // Return best match or default to e-commerce search
  return possibleModes[0] || searchModes[0];
};

interface HuntWidgetProps {
  isSearching?: boolean;
  searchResults?: any[];
  lastQuery?: string;
  triggeredInput?: string;
  outputHistory?: OutputHistoryItem[];
  currentOutput?: OutputHistoryItem | null;
  isStreaming?: boolean;
  streamingContent?: string;
  onSearch?: (params: HuntWidgetParams) => Promise<void>;
  onClearResults?: () => void;
  onSelectOutput?: (item: OutputHistoryItem) => void;
  onClearHistory?: () => void;
  onBack?: () => void;
}

/**
 * Hunt Widget Input Area - Content that goes inside BaseWidget
 */
const HuntInputArea: React.FC<{
  isSearching?: boolean;
  searchResults?: any[];
  lastQuery?: string;
  triggeredInput?: string;
  onSearch?: (params: HuntWidgetParams) => Promise<void>;
  onClearResults?: () => void;
}> = ({
  isSearching = false,
  searchResults = [],
  lastQuery = '',
  triggeredInput,
  onSearch,
  onClearResults
}) => {
  // Modern state management with simplified parameters
  const [query, setQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<SearchMode>(searchModes[0]);
  const [searchDepth, setSearchDepth] = useState('standard');
  const [resultFormat, setResultFormat] = useState('summary');

  // Get recommended mode without auto-switching
  const [recommendedMode, setRecommendedMode] = React.useState<SearchMode | null>(null);
  
  React.useEffect(() => {
    if (query.trim()) {
      const bestMode = detectBestMode(query);
      if (bestMode.id !== selectedMode.id) {
        setRecommendedMode(bestMode);
        console.log('🔍 Mode recommendation available:', bestMode.id);
      } else {
        setRecommendedMode(null);
      }
    } else {
      setRecommendedMode(null);
    }
  }, [query, selectedMode.id]);

  // Handle search processing using Module onSearch
  const handleSearchProcessing = async () => {
    if (!query.trim() || isSearching) return;
    
    // Check if mode is active
    if (!selectedMode.isActive) {
      alert(`${selectedMode.name} is coming soon! Please try one of the active search modes.`);
      return;
    }

    console.log('🔍 Starting search processing with mode:', selectedMode.name);
    
    try {
      const params: HuntWidgetParams = {
        query: query,
        category: selectedMode.id,
        search_depth: searchDepth || 'standard',
        result_format: resultFormat || 'summary'
      };
      
      // Use Module's onSearch - no fallback needed
      if (onSearch) {
        console.log('🔍 HUNT_WIDGET: Using module onSearch function');
        await onSearch(params);
      } else {
        console.error('🔍 HUNT_WIDGET: No onSearch prop provided - widget not properly configured');
        return;
      }
      
      console.log('🚀 Search processing request sent with mode:', selectedMode.name);
    } catch (error) {
      console.error('Search processing failed:', error);
    }
  };

  return (
    <div className="space-y-4 p-3">
      {/* Compact Mode Header */}
      <div className="flex items-center gap-3 p-2 bg-green-500/10 rounded border border-green-500/20">
        <span className="text-lg">{selectedMode.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{selectedMode.name}</div>
          <div className="flex gap-3 text-xs text-white/50">
            <span>{selectedMode.estimatedTime}</span>
            <span>{selectedMode.isActive ? 'Active' : 'Coming Soon'}</span>
          </div>
        </div>
      </div>

      {/* Compact Input Area */}
      <div className="space-y-3">
        <textarea
          value={query}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue !== query) {
              console.log('🔍 Search query changed');
            }
            setQuery(newValue);
          }}
          placeholder={selectedMode.isActive 
            ? `Search for ${selectedMode.name.toLowerCase()}...`
            : "Enter your search query..."}
          className="w-full p-2 bg-white/5 border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-blue-500 resize-none text-sm"
          rows={2}
        />
      </div>

      {/* Mode Recommendation Alert */}
      {recommendedMode && (
        <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded border border-blue-500/20">
          <span className="text-sm">💡</span>
          <div className="flex-1 text-xs text-white">
            Suggested: <span className="font-medium">{recommendedMode.name}</span> mode for better results
          </div>
          <button
            onClick={() => {
              setSelectedMode(recommendedMode);
              setRecommendedMode(null);
              console.log('🔍 Accepted recommendation:', recommendedMode.name);
            }}
            className="px-2 py-1 bg-blue-500/20 text-white rounded text-xs hover:bg-blue-500/30"
          >
            Use
          </button>
          <button
            onClick={() => setRecommendedMode(null)}
            className="px-1 py-1 text-white/60 rounded text-xs hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* Compact Mode Selector */}
      <div>
        <div className="text-xs text-white/60 mb-2">🎯 Select Search Mode ({searchModes.length} modes)</div>
        <div className="grid grid-cols-2 gap-1">
          {searchModes.filter(mode => mode.isActive).map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setSelectedMode(mode);
                console.log('🔍 Mode selected:', mode.name);
              }}
              className={`p-1.5 rounded border transition-all text-center cursor-pointer ${
                selectedMode.id === mode.id
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
              }`}
              title={`${mode.name} - ${mode.description}${!mode.isActive ? ' (Coming Soon)' : ''}`}
              disabled={!mode.isActive}
            >
              <div className="text-xs mb-0.5">{mode.icon}</div>
              <div className="text-xs font-medium truncate leading-tight">{mode.name}</div>
              {!mode.isActive && <div className="text-xs text-white/60">Soon</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Search Options - Simplified */}
      {selectedMode && selectedMode.isActive && (
        <div className="space-y-2">
          <div className="text-xs text-white/60">⚙️ Advanced Options</div>
          
          <div>
            <label className="block text-xs text-white/60 mb-1">Search Depth</label>
            <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={searchDepth} onChange={(e) => setSearchDepth(e.target.value)}>
              <option value="standard">Standard</option>
              <option value="comprehensive">Comprehensive</option>
              <option value="deep_analysis">Deep Analysis</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs text-white/60 mb-1">Result Format</label>
            <select className="w-full p-1.5 bg-white/5 border border-white/10 rounded text-white text-xs" value={resultFormat} onChange={(e) => setResultFormat(e.target.value)}>
              <option value="summary">Summary</option>
              <option value="detailed">Detailed</option>
              <option value="comparison">Comparison Table</option>
            </select>
          </div>
        </div>
      )}

      {/* Enhanced Process Button */}
      <button
        onClick={handleSearchProcessing}
        disabled={isSearching || !query.trim() || !selectedMode.isActive}
        className={`w-full p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded text-white font-medium transition-all hover:from-green-600 hover:to-blue-600 flex items-center justify-center gap-2 text-sm ${
          isSearching ? 'animate-pulse' : ''
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isSearching ? (
          <>
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Searching...
          </>
        ) : (
          <>
            <span>{selectedMode.icon}</span>
            Search with {selectedMode.name}
          </>
        )}
      </button>
    </div>
  );
};

/**
 * Hunt Widget with BaseWidget - New standardized layout
 */
export const HuntWidget: React.FC<HuntWidgetProps> = ({
  isSearching = false,
  searchResults = [],
  lastQuery = '',
  triggeredInput,
  outputHistory = [],
  currentOutput = null,
  isStreaming = false,
  streamingContent = '',
  onSearch,
  onClearResults,
  onSelectOutput,
  onClearHistory,
  onBack
}) => {
  
  // Search-specific edit actions for search results - simplified like DreamWidget
  const editActions: EditAction[] = [
    {
      id: 'open',
      label: 'Open',
      icon: '🔗',
      onClick: (content) => {
        // Open search result URL in new tab
        if (typeof content === 'object' && content?.url) {
          window.open(content.url, '_blank');
        } else if (typeof content === 'string' && content.startsWith('http')) {
          window.open(content, '_blank');
        }
      }
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: '📋',
      onClick: (content) => {
        // Copy search result content to clipboard
        if (typeof content === 'object' && content?.text) {
          navigator.clipboard.writeText(content.text);
        } else if (typeof content === 'string') {
          navigator.clipboard.writeText(content);
        }
      }
    }
  ];

  // Hunt-specific management actions for bottom menu
  const managementActions: ManagementAction[] = [
    {
      id: 'search',
      label: 'Search',
      icon: '🔍',
      onClick: () => console.log('🔍 Search mode active'),
      variant: 'primary' as const,
      disabled: false
    },
    {
      id: 'crawler',
      label: 'Crawler',
      icon: '🕷️',
      onClick: () => console.log('🕷️ Crawler mode - coming soon'),
      disabled: true
    },
    {
      id: 'automation',
      label: 'Automation', 
      icon: '🤖',
      onClick: () => console.log('🤖 Automation mode - coming soon'),
      disabled: true
    },
    {
      id: 'other',
      label: 'Other',
      icon: '⚙️',
      onClick: () => console.log('⚙️ Other tools - coming soon'),
      disabled: true
    }
  ];

  // Custom empty state for Hunt Widget
  const huntEmptyState: EmptyStateConfig = {
    icon: '🔍',
    title: 'Ready to Hunt Information',
    description: 'Search the web with AI-powered intelligence. Find academic papers, news, videos, social media, and more across multiple search engines.',
    actionText: 'Start Searching',
    onAction: () => {
      const textarea = document.querySelector('textarea[placeholder*="search"]') as HTMLTextAreaElement;
      textarea?.focus();
    }
  };

  return (
    <BaseWidget
      title="HuntAI"
      icon="🔍"
      isProcessing={isSearching}
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
      emptyStateConfig={huntEmptyState}
    >
      <HuntInputArea
        isSearching={isSearching}
        searchResults={searchResults}
        lastQuery={lastQuery}
        triggeredInput={triggeredInput}
        onSearch={onSearch}
        onClearResults={onClearResults}
      />
    </BaseWidget>
  );
};