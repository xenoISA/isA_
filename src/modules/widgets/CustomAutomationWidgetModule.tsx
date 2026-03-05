/**
 * ============================================================================
 * Custom Automation Widget Module (CustomAutomationWidgetModule.tsx) - Business Process Automation Module
 * ============================================================================
 * 
 * Core Responsibilities:
 * - Uses BaseWidgetModule for standardized widget management
 * - Provides Custom Automation-specific configuration and customizations
 * - Manages intelligent business process automation logic
 * - Integrates seamlessly with BaseWidget UI components
 * 
 * Features:
 * - Template-based automation workflows
 * - Intelligent parameter extraction
 * - Multi-step process execution
 * - Real-time status updates
 * - Custom intervention points
 */

import React, { ReactNode } from 'react';
import { BaseWidgetModule, createWidgetConfig } from './BaseWidgetModule';
import { EditAction, ManagementAction, OutputHistoryItem } from '../../components/ui/widgets/BaseWidget';
import { useCustomAutomationWidgetStore } from '../../stores/useWidgetStores';
import { createLogger } from '../../utils/logger';
const log = createLogger('AutomationWidget');

// Custom Automation specific types
interface CustomAutomationWidgetParams {
  templateId: string;
  inputs: Record<string, any>;
  mode?: 'guided' | 'auto' | 'chat_sync';
  chatContext?: {
    sessionId: string;
    messageHistory: any[];
  };
}

interface CustomAutomationWidgetResult {
  templateId: string;
  status: 'idle' | 'configuring' | 'running' | 'completed' | 'error';
  stepsCompleted: number;
  totalSteps: number;
  executionSummary: string;
  results: any;
  recommendations: string[];
}

interface CustomAutomationWidgetModuleProps {
  triggeredInput?: string;
  onAutomationCompleted?: (results: CustomAutomationWidgetResult) => void;
  children: ReactNode | ((moduleProps: {
    isProcessing: boolean;
    outputHistory: OutputHistoryItem[];
    currentOutput: OutputHistoryItem | null;
    isStreaming: boolean;
    streamingContent: string;
    startProcessing: (params: CustomAutomationWidgetParams) => Promise<void>;
    onSelectOutput: (item: OutputHistoryItem) => void;
    onClearHistory: () => void;
  }) => ReactNode);
}

/**
 * Custom Automation Widget Module - Template mapping and configuration for automation workflows
 * 
 * Automation Templates:
 * - data_etl_pipeline: Data extraction, transformation, and loading
 * - content_workflow: Content creation, review, and publishing
 * - api_integration: API connection, mapping, and synchronization
 */

// Automation template to MCP template mapping
const AUTOMATION_TEMPLATE_MAPPING = {
  'data_etl_pipeline': {
    template_id: 'automation_data_etl_prompt',
    focus: 'data_processing',
    steps: ['extract', 'transform', 'load'],
    estimatedTime: '15-30 min'
  },
  'content_workflow': {
    template_id: 'automation_content_workflow_prompt',
    focus: 'content_management',
    steps: ['create', 'review', 'publish'],
    estimatedTime: '5-10 min'
  },
  'api_integration': {
    template_id: 'automation_api_integration_prompt',
    focus: 'system_integration',
    steps: ['configure', 'map', 'test', 'sync'],
    estimatedTime: '30-60 min'
  }
};

// Custom Automation-specific template parameter preparation
const prepareAutomationTemplateParams = (params: CustomAutomationWidgetParams) => {
  const { templateId, inputs, mode = 'guided', chatContext } = params;
  
  const mapping = AUTOMATION_TEMPLATE_MAPPING[templateId as keyof typeof AUTOMATION_TEMPLATE_MAPPING];
  if (!mapping) {
    throw new Error(`Unsupported automation template: ${templateId}`);
  }
  
  // Build prompt_args dynamically based on template and inputs
  const prompt_args: Record<string, any> = {
    template_id: templateId,
    execution_mode: mode,
    inputs: inputs,
    focus: mapping.focus,
    steps: mapping.steps,
    estimated_time: mapping.estimatedTime,
    ...(chatContext && {
      session_id: chatContext.sessionId,
      context_messages: chatContext.messageHistory?.length || 0
    })
  };
  
  log.debug('Prepared template params', { templateId, template_id: mapping.template_id, prompt_args, inputCount: Object.keys(inputs).length });
  
  return {
    template_id: mapping.template_id,
    prompt_args
  };
};

// Extract automation parameters from natural language input
const extractAutomationParamsFromInput = (input: string): CustomAutomationWidgetParams | null => {
  const lowerInput = input.toLowerCase();
  
  // Detect automation template based on keywords
  let templateId = 'data_etl_pipeline'; // default
  let inputs: Record<string, any> = {};
  
  if (lowerInput.includes('data') || lowerInput.includes('etl') || lowerInput.includes('database')) {
    templateId = 'data_etl_pipeline';
    
    // Extract data processing parameters
    if (lowerInput.includes('mysql')) inputs.source_db = 'mysql_prod';
    else if (lowerInput.includes('postgres')) inputs.source_db = 'pg_staging';
    else if (lowerInput.includes('mongo')) inputs.source_db = 'mongo_analytics';
    
    if (lowerInput.includes('json')) inputs.target_format = 'json';
    else if (lowerInput.includes('csv')) inputs.target_format = 'csv';
    else if (lowerInput.includes('parquet')) inputs.target_format = 'parquet';
    
    const batchMatch = input.match(/(\d+)\s*records?|batch\s*size\s*[:\s]*(\d+)/i);
    if (batchMatch) inputs.batch_size = parseInt(batchMatch[1] || batchMatch[2]);
    
  } else if (lowerInput.includes('content') || lowerInput.includes('publish') || lowerInput.includes('article')) {
    templateId = 'content_workflow';
    
    // Extract content workflow parameters
    if (lowerInput.includes('article')) inputs.content_type = 'article';
    else if (lowerInput.includes('product')) inputs.content_type = 'product_desc';
    else if (lowerInput.includes('social')) inputs.content_type = 'social_media';
    
    const channels = [];
    if (lowerInput.includes('website')) channels.push('website');
    if (lowerInput.includes('wechat')) channels.push('wechat');
    if (lowerInput.includes('weibo')) channels.push('weibo');
    if (channels.length > 0) inputs.target_channels = channels;
    
    inputs.auto_schedule = lowerInput.includes('schedule') || lowerInput.includes('automatic');
    
  } else if (lowerInput.includes('api') || lowerInput.includes('integration') || lowerInput.includes('sync')) {
    templateId = 'api_integration';
    
    // Extract API integration parameters
    const urlMatch = input.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) inputs.api_endpoint = urlMatch[1];
    
    if (lowerInput.includes('oauth')) inputs.auth_method = 'oauth2';
    else if (lowerInput.includes('basic')) inputs.auth_method = 'basic';
    else inputs.auth_method = 'api_key';
    
    if (lowerInput.includes('realtime') || lowerInput.includes('real-time')) inputs.sync_frequency = 'realtime';
    else if (lowerInput.includes('hourly')) inputs.sync_frequency = 'hourly';
    else if (lowerInput.includes('daily')) inputs.sync_frequency = 'daily';
  }
  
  return {
    templateId,
    inputs,
    mode: 'guided'
  };
};

// Extract result data from custom automation widget store
const extractAutomationResult = (widgetData: any) => {
  if (!widgetData || !widgetData.automationResults?.length) {
    return null;
  }
  
  const result = widgetData.automationResults[0];
  
  return {
    finalResult: result,
    outputContent: result.executionSummary || 'Automation completed successfully',
    title: `${result.templateId} - ${result.status}`
  };
};

// Widget configuration for Custom Automation
export const customAutomationConfig = createWidgetConfig<CustomAutomationWidgetParams, CustomAutomationWidgetResult>({
  type: 'custom_automation',
  title: '智能自动化',
  icon: '🤖',
  sessionIdPrefix: 'automation_',
  
  // Result processing
  resultExtractor: {
    outputType: 'analysis',
    extractResult: extractAutomationResult
  },
  
  // Callbacks
  onProcessStart: (params) => {
    log.info('Starting automation process', { templateId: params.templateId });
  },
  
  onProcessComplete: (result) => {
    log.info('Automation completed', { status: result.status, steps: `${result.stepsCompleted}/${result.totalSteps}` });
  },
  
  onProcessError: (error) => {
    log.error('Automation failed', error);
  },
  
  // Input processing
  extractParamsFromInput: extractAutomationParamsFromInput,
  
  // Edit actions specific to automation
  editActions: [
    {
      id: 'copy_config',
      label: '复制配置',
      icon: '📋',
      onClick: (content) => {
        if (typeof content === 'object' && content.inputs) {
          navigator.clipboard.writeText(JSON.stringify(content.inputs, null, 2));
        } else {
          navigator.clipboard.writeText(String(content));
        }
      }
    },
    {
      id: 'export_results',
      label: '导出结果',
      icon: '💾',
      onClick: (content) => {
        const dataStr = JSON.stringify(content, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `automation_results_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    },
    {
      id: 'share_workflow',
      label: '分享工作流',
      icon: '🔗',
      onClick: (content) => {
        const shareData = {
          title: '智能自动化工作流',
          text: typeof content === 'object' ? JSON.stringify(content) : String(content)
        };
        
        if (navigator.share && navigator.canShare?.(shareData)) {
          navigator.share(shareData);
        } else {
          navigator.clipboard.writeText(shareData.text);
        }
      }
    }
  ],
  
  // Management actions
  managementActions: [
    {
      id: 'refresh_templates',
      label: '刷新模板',
      icon: '🔄',
      onClick: () => {
        log.info('Refreshing automation templates...');
        // Logic to refresh available automation templates
      }
    },
    {
      id: 'clear_automation_data',
      label: '清除数据',
      icon: '🗑️',
      onClick: () => {
        useCustomAutomationWidgetStore.getState().clearData?.();
      }
    },
    {
      id: 'manage_templates',
      label: '管理模板',
      icon: '⚙️',
      onClick: () => {
        log.info('Opening template management...');
        // Logic to open template management interface
      }
    },
    {
      id: 'view_history',
      label: '执行历史',
      icon: '📊',
      onClick: () => {
        log.info('Opening execution history...');
        // Logic to view automation execution history
      }
    }
  ]
});

/**
 * Custom Automation Widget Module Component
 */
export const CustomAutomationWidgetModule: React.FC<CustomAutomationWidgetModuleProps> = ({
  triggeredInput,
  onAutomationCompleted,
  children
}) => {
  return (
    <BaseWidgetModule<CustomAutomationWidgetParams, CustomAutomationWidgetResult>
      config={customAutomationConfig}
      triggeredInput={triggeredInput}
      onResultGenerated={onAutomationCompleted}
    >
      {children}
    </BaseWidgetModule>
  );
};

export default CustomAutomationWidgetModule;