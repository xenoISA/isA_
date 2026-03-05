/**
 * ============================================================================
 * Hunt Widget Module (HuntWidgetModule.tsx) - Refactored with BaseWidgetModule
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Uses BaseWidgetModule for standardized widget management
 * - Provides Hunt-specific configuration and customizations
 * - Manages AI search business logic with 4 specialized search modes
 * - Integrates seamlessly with BaseWidget UI components
 * 
 * Benefits of BaseWidgetModule integration:
 * - Automatic output history management for search results
 * - Built-in edit and management actions
 * - Streaming status display
 * - Standard error handling and logging
 * - Consistent UI patterns across all widgets
 */
import React, { ReactNode } from 'react';
import { BaseWidgetModule, createWidgetConfig } from './BaseWidgetModule';
import { HuntWidgetParams, HuntWidgetResult } from '../../types/widgetTypes';
import { EditAction, ManagementAction } from '../../components/ui/widgets/BaseWidget';
import { useHuntState } from '../../stores/useWidgetStores';
import { createLogger } from '../../utils/logger';
const log = createLogger('HuntWidget');

interface HuntWidgetModuleProps {
  triggeredInput?: string;
  onSearchCompleted?: (results: HuntWidgetResult) => void;
  children: ReactNode;
}

/**
 * Hunt Widget Module - Template mapping and configuration for 4 search modes
 * 
 * Search Modes:
 * - ecommerce: E-commerce focused search (hunt_ecommerce_prompt)
 * - academic: Academic research search (hunt_academic_prompt) 
 * - social: Social media and community search (hunt_social_prompt)
 * - general: General web search (hunt_general_prompt)
 */

// Hunt mode to MCP template mapping
const HUNT_TEMPLATE_MAPPING = {
  'ecommerce': {
    template_id: 'hunt_ecommerce_prompt',
    focus: 'product_research'
  },
  'academic': {
    template_id: 'hunt_academic_prompt', 
    focus: 'scholarly_research'
  },
  'social': {
    template_id: 'hunt_social_prompt',
    focus: 'social_sentiment'
  },
  'general': {
    template_id: 'hunt_general_prompt',
    focus: 'general_information'
  }
};

// Hunt-specific template parameter preparation (像DreamModule一样)
const prepareHuntTemplateParams = (params: HuntWidgetParams) => {
  const { query, category = 'general', search_depth = 'standard', result_format = 'summary', priceRange } = params;
  
  const mapping = HUNT_TEMPLATE_MAPPING[category as keyof typeof HUNT_TEMPLATE_MAPPING] || HUNT_TEMPLATE_MAPPING['general'];
  
  // Build prompt_args dynamically - much cleaner approach
  const prompt_args: Record<string, any> = {
    query: query, // Don't use fallback here - let the actual query be empty if user hasn't entered anything
    search_depth,
    result_format,
    ...(priceRange && { 
      price_min: priceRange.min,
      price_max: priceRange.max 
    })
  };
  
  log.debug('Prepared template params', { category, template_id: mapping.template_id, prompt_args });
  
  return {
    template_id: mapping.template_id,
    prompt_args
  };
};

// Hunt widget configuration
const huntWidgetConfig = createWidgetConfig({
  type: 'hunt',
  title: 'HuntAI Search Intelligence',
  icon: '🔍',
  sessionIdPrefix: 'hunt_widget',
  maxHistoryItems: 20,
  
  // Result extraction configuration
  resultExtractor: {
    outputType: 'search',
    extractResult: (widgetData: any) => {
      if (widgetData?.searchResults?.length > 0) {
        return {
          finalResult: { 
            searchResults: widgetData.searchResults, 
            query: widgetData.lastQuery 
          },
          outputContent: widgetData.searchResults[0]?.content || JSON.stringify(widgetData.searchResults),
          title: `Search Results (${widgetData.searchResults.length} found)`
        };
      }
      return null;
    }
  },
  
  // Extract parameters from triggered input
  extractParamsFromInput: (input: string) => ({
    query: input.trim(),
    category: 'general', // Default to general search
    search_depth: 'standard',
    result_format: 'summary'
  }),
  editActions: [
    {
      id: 'open_source',
      label: 'Open',
      icon: '🔗',
      onClick: (content) => {
        if (typeof content === 'object' && content?.url) {
          window.open(content.url, '_blank');
        }
      }
    },
    {
      id: 'copy_content', 
      label: 'Copy',
      icon: '📋',
      onClick: (content) => {
        const text = typeof content === 'object' ? content?.text || JSON.stringify(content) : content;
        navigator.clipboard.writeText(text);
      }
    },
    {
      id: 'bookmark',
      label: 'Save',
      icon: '🔖', 
      onClick: (content) => {
        log.info('Bookmarking search result');
      }
    }
  ],
  managementActions: [
    {
      id: 'search',
      label: 'Search',
      icon: '🔍',
      onClick: () => log.info('Search mode active'),
      variant: 'primary' as const,
      disabled: false
    },
    {
      id: 'crawler',
      label: 'Crawler',
      icon: '🕷️',
      onClick: () => log.info('Crawler mode - coming soon'),
      disabled: true
    },
    {
      id: 'automation',
      label: 'Automation', 
      icon: '🤖',
      onClick: () => log.info('Automation mode - coming soon'),
      disabled: true
    },
    {
      id: 'other',
      label: 'Other',
      icon: '⚙️',
      onClick: () => log.info('Other tools - coming soon'),
      disabled: true
    }
  ]
});

/**
 * Hunt Widget Module - Uses BaseWidgetModule with Hunt-specific configuration
 */
export const HuntWidgetModule: React.FC<HuntWidgetModuleProps> = ({
  triggeredInput,
  onSearchCompleted,
  children
}) => {
  // Read state from store
  const { searchResults, isSearching, lastQuery } = useHuntState();
  
  // Convert searchResults to outputHistory format for BaseWidget display
  const outputHistory = React.useMemo(() => {
    // Check if searchResults is a valid array
    if (!Array.isArray(searchResults) || searchResults.length === 0) {
      return [];
    }
    
    return searchResults.map((result, index) => ({
      id: `hunt_result_${Date.now()}_${index}`,
      timestamp: result.timestamp || new Date().toISOString(),
      type: 'text', // Use text type for better display
      title: result.title || `Search Results for: ${lastQuery}`,
      content: result.content || result.description || 'Search result',
      metadata: {
        query: result.query || lastQuery,
        originalType: result.type || 'search_response',
        url: result.url
      }
    }));
  }, [searchResults, lastQuery]);
  
  log.debug('Converting search results to output history', {
    searchResultsCount: Array.isArray(searchResults) ? searchResults.length : 0,
    outputHistoryCount: outputHistory.length,
    latestResult: outputHistory[0]?.title
  });
  
  return (
    <BaseWidgetModule
      config={huntWidgetConfig}
      triggeredInput={triggeredInput}
      onResultGenerated={onSearchCompleted}
    >
      {(moduleProps) => {
        // Pass store state to HuntWidget via props with template support
        if (React.isValidElement(children)) {
          return React.cloneElement(children, {
            ...children.props,
            // Store state (use BaseWidgetModule state instead of store state for consistency)
            searchResults,
            isSearching: moduleProps.isProcessing, // Use BaseWidgetModule state for button status
            lastQuery,
            // Add onSearch function with template parameter preparation (like Dream)
            onSearch: async (params: HuntWidgetParams) => {
              // Prepare template parameters based on the selected mode
              const templateParams = prepareHuntTemplateParams(params);
              
              // Add template information to params before sending to store
              const enrichedParams = {
                query: params.query || '',
                category: params.category || 'general',
                search_depth: params.search_depth || 'standard',
                result_format: params.result_format || 'summary',
                ...params,
                templateParams // Add template configuration
              };
              
              log.debug('Sending enriched params to store', enrichedParams);
              await moduleProps.startProcessing(enrichedParams);
            },
            // BaseWidget state with converted data
            outputHistory: outputHistory, // Use converted data instead of moduleProps.outputHistory
            currentOutput: moduleProps.currentOutput, // Use BaseWidgetModule's currentOutput // Show latest result as current
            isStreaming: moduleProps.isStreaming,
            streamingContent: moduleProps.streamingContent,
            onSelectOutput: moduleProps.onSelectOutput,
            onClearHistory: moduleProps.onClearHistory
          });
        }
        return children;
      }}
    </BaseWidgetModule>
  );
};