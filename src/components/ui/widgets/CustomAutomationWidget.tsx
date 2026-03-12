/**
 * ============================================================================
 * Custom Automation Widget (CustomAutomationWidget.tsx)
 * ============================================================================
 * 
 * Intelligent Business Process Automation Widget - Hybrid Interaction Modes
 * 
 * Core Features:
 * - Modern card-based primary interface with visual flow steps
 * - Classic form intervention points for manual configuration
 * - Minimal chat integration for bidirectional sync with ChatModule
 * - Data-driven UI generation (intelligent input type selection)
 * - Real-time status updates and progress tracking
 * - Task management system integration
 */

import React, { useState, useMemo, useCallback } from 'react';
import { BaseWidget, EditAction, ManagementAction, OutputHistoryItem } from './BaseWidget';
import { useTranslation } from '../../../hooks/useTranslation';
import { logger, LogCategory } from '../../../utils/logger';


// ============================================================================
// Types and Interfaces
// ============================================================================

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'data_processing' | 'workflow' | 'integration' | 'analysis';
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTime: string;
  steps: AutomationStep[];
  inputs: AutomationInput[];
  tags: string[];
}

export interface AutomationStep {
  id: string;
  title: string;
  description: string;
  type: 'data_input' | 'processing' | 'decision' | 'output';
  status: 'pending' | 'running' | 'completed' | 'error' | 'manual_review';
  allowsIntervention: boolean;
  config?: Record<string, any>;
  result?: any;
  error?: string;
}

export interface AutomationInput {
  id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'file' | 'date' | 'boolean';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { label: string; value: any }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  value?: any;
}

export interface AutomationRequest {
  templateId: string;
  inputs: Record<string, any>;
  mode: 'guided' | 'auto' | 'chat_sync';
  chatContext?: {
    sessionId: string;
    messageHistory: any[];
  };
}

export interface CustomAutomationWidgetProps {
  isProcessing: boolean;
  currentTemplate: string | null;
  automationResults: any[];
  processStatus: 'idle' | 'configuring' | 'running' | 'completed' | 'error';
  triggeredInput?: string;
  outputHistory?: OutputHistoryItem[];
  currentOutput?: OutputHistoryItem | null;
  isStreaming?: boolean;
  streamingContent?: string;
  onStartAutomation: (params: AutomationRequest) => Promise<void>;
  onClearData: () => void;
  onSelectOutput?: (item: OutputHistoryItem) => void;
  onClearHistory?: () => void;
  onBack?: () => void;
  onToggleMode?: () => void; // Display mode toggle callback (half ↔ full)
}

// ============================================================================
// Smart Form Field Component (Data-driven UI generation)
// ============================================================================

const SmartFormField: React.FC<{
  input: AutomationInput;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}> = ({ input, value, onChange, error }) => {
  const { t } = useTranslation();

  const renderField = () => {
    switch (input.type) {
      case 'text':
        return (
          <input
            type="text"
            className="w-full px-3 py-2 bg-gray-800/60 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-xs"
            placeholder={input.placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            className="w-full px-3 py-2 bg-gray-800/60 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-xs"
            placeholder={input.placeholder}
            value={value || ''}
            min={input.validation?.min}
            max={input.validation?.max}
            onChange={(e) => onChange(parseFloat(e.target.value))}
          />
        );
      
      case 'select':
        return (
          <select
            className="w-full px-3 py-2 bg-gray-800/60 border border-gray-600/50 rounded-lg text-white focus:border-blue-400 focus:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-xs"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">{input.placeholder || 'Please select option'}</option>
            {input.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'multiselect':
        return (
          <div className="space-y-2">
            {input.options?.map((option) => (
              <label key={option.value} className="flex items-center space-x-2 text-xs">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option.value)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      onChange([...currentValues, option.value]);
                    } else {
                      onChange(currentValues.filter(v => v !== option.value));
                    }
                  }}
                  className="rounded border-gray-600/50 bg-gray-800/60 text-blue-500 focus:ring-blue-400 focus:ring-2 transition-all"
                />
                <span className="text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        );
      
      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => onChange(e.target.checked)}
              className="rounded border-gray-600/50 bg-gray-800/60 text-blue-500 focus:ring-blue-400 focus:ring-2 transition-all"
            />
            <span className="text-gray-300 text-xs">{input.placeholder}</span>
          </label>
        );
      
      case 'file':
        return (
          <input
            type="file"
            className="w-full px-3 py-2 bg-gray-800/60 border border-gray-600/50 rounded-lg text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-blue-600/80 file:text-white hover:file:bg-blue-600 file:transition-all file:duration-200 text-xs"
            onChange={(e) => onChange(e.target.files?.[0])}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            className="w-full px-3 py-2 bg-gray-800/60 border border-gray-600/50 rounded-lg text-white focus:border-blue-400 focus:bg-gray-800/80 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 text-xs"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-white">
        {input.label}
        {input.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {renderField()}
      {error && (
        <p className="text-red-300 text-xs mt-1 p-2 bg-red-600/10 rounded-lg border border-red-500/20 flex items-center gap-2">
          <span className="text-red-400">⚠️</span>
          {error}
        </p>
      )}
    </div>
  );
};

// ============================================================================
// Main Widget Component
// ============================================================================

export const CustomAutomationWidget: React.FC<CustomAutomationWidgetProps> = ({
  isProcessing,
  currentTemplate,
  automationResults,
  processStatus,
  triggeredInput,
  outputHistory = [],
  currentOutput,
  isStreaming,
  streamingContent,
  onStartAutomation,
  onClearData,
  onSelectOutput,
  onClearHistory,
  onBack,
  onToggleMode
}) => {
  const { t } = useTranslation();
  
  // Generate sample execution output for demonstration
  const generateSampleExecutionOutput = (): OutputHistoryItem[] => {
    if (!selectedTemplate || activeMode !== 'running') return outputHistory;
    
    return [
      {
        id: 'exec-1',
        timestamp: new Date(Date.now() - 180000), // 3 minutes ago
        type: 'analysis',
        title: 'Configuration Validation',
        content: `✅ Template configuration is valid\n🔧 Input parameters are valid\n📊 Estimated processing time: 15-20 min`,
        params: { templateId: selectedTemplate.id }
      },
      {
        id: 'exec-2', 
        timestamp: new Date(Date.now() - 120000), // 2 minutes ago
        type: 'data',
        title: 'Data Extraction Step',
        content: {
          summary: 'Successfully extracted customer data from production database',
          records: 2456,
          source: selectedTemplate.inputs.find(i => i.id === 'source_db')?.value || 'mysql_prod',
          status: 'completed'
        },
        params: { stepId: 'data_extract' }
      },
      {
        id: 'exec-3',
        timestamp: new Date(Date.now() - 60000), // 1 minute ago  
        type: 'data',
        title: 'Data Transformation Step',
        content: {
          summary: 'Applied data cleaning and normalization rules',
          duplicatesFound: 12,
          duplicatesRemoved: 12,
          recordsProcessed: 2444,
          artifacts: [
            { name: 'transformation_log.csv', size: '15.2KB', type: 'log' },
            { name: 'duplicate_records.json', size: '1.8KB', type: 'error_data' }
          ]
        },
        params: { stepId: 'data_transform' }
      }
    ];
  };
  
  // Component state  
  const [activeMenu, setActiveMenu] = useState<'templates' | 'dashboard' | 'scheduled' | 'settings'>('templates');
  const [activeMode, setActiveMode] = useState<'template_select' | 'configure' | 'running' | 'results' | 'step_detail'>('template_select');
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);
  const [selectedStep, setSelectedStep] = useState<AutomationStep | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'modern' | 'classic'>('modern');

  // Mock automation templates (in real implementation, these would come from store)
  const automationTemplates: AutomationTemplate[] = useMemo(() => [
    {
      id: 'data_etl_pipeline',
      name: 'Data ETL Pipeline',
      description: 'Extract, transform, and load data between systems',
      icon: '🔄',
      category: 'data_processing',
      complexity: 'moderate',
      estimatedTime: '15-30 min',
      tags: ['ETL', 'Database', 'Processing'],
      steps: [
        { id: 'data_extract', title: t('customAutomationWidget.ui.templates.dataEtl.steps.extract'), description: 'Extract data from source systems', type: 'data_input', status: 'pending', allowsIntervention: true },
        { id: 'data_transform', title: t('customAutomationWidget.ui.templates.dataEtl.steps.transform'), description: 'Clean and transform data format', type: 'processing', status: 'pending', allowsIntervention: true },
        { id: 'data_load', title: t('customAutomationWidget.ui.templates.dataEtl.steps.load'), description: 'Load data to target system', type: 'output', status: 'pending', allowsIntervention: false }
      ],
      inputs: [
        { id: 'source_db', name: 'source_database', type: 'select', label: t('customAutomationWidget.ui.templates.dataEtl.inputs.sourceDb'), required: true, options: [
          { label: 'MySQL Production', value: 'mysql_prod' },
          { label: 'PostgreSQL Staging', value: 'pg_staging' },
          { label: 'MongoDB Analytics', value: 'mongo_analytics' }
        ]},
        { id: 'target_format', name: 'output_format', type: 'select', label: t('customAutomationWidget.ui.templates.dataEtl.inputs.targetFormat'), required: true, options: [
          { label: 'JSON', value: 'json' },
          { label: 'CSV', value: 'csv' },
          { label: 'Parquet', value: 'parquet' }
        ]},
        { id: 'batch_size', name: 'batch_size', type: 'number', label: t('customAutomationWidget.ui.templates.dataEtl.inputs.batchSize'), required: false, placeholder: '1000', validation: { min: 100, max: 10000 } }
      ]
    },
    {
      id: 'content_workflow',
      name: t('customAutomationWidget.ui.templates.contentWorkflow.name'),
      description: t('customAutomationWidget.ui.templates.contentWorkflow.description'),
      icon: '📝',
      category: 'workflow',
      complexity: 'simple',
      estimatedTime: '5-10 min',
      tags: ['Content', 'Review', 'Publishing'],
      steps: [
        { id: 'content_create', title: t('customAutomationWidget.ui.templates.contentWorkflow.steps.create'), description: 'Generate or import content', type: 'data_input', status: 'pending', allowsIntervention: true },
        { id: 'content_review', title: t('customAutomationWidget.ui.templates.contentWorkflow.steps.review'), description: 'Quality check and compliance verification', type: 'decision', status: 'pending', allowsIntervention: true },
        { id: 'content_publish', title: t('customAutomationWidget.ui.templates.contentWorkflow.steps.publish'), description: 'Publish to target channels', type: 'output', status: 'pending', allowsIntervention: false }
      ],
      inputs: [
        { id: 'content_type', name: 'content_type', type: 'select', label: t('customAutomationWidget.ui.templates.contentWorkflow.inputs.contentType'), required: true, options: [
          { label: 'Article', value: 'article' },
          { label: 'Product Description', value: 'product_desc' },
          { label: 'Social Media', value: 'social_media' }
        ]},
        { id: 'target_channels', name: 'channels', type: 'multiselect', label: t('customAutomationWidget.ui.templates.contentWorkflow.inputs.targetChannels'), required: true, options: [
          { label: 'Website', value: 'website' },
          { label: 'WeChat', value: 'wechat' },
          { label: 'Weibo', value: 'weibo' }
        ]},
        { id: 'auto_schedule', name: 'auto_schedule', type: 'boolean', label: t('customAutomationWidget.ui.templates.contentWorkflow.inputs.autoSchedule'), required: false, placeholder: 'Enable scheduled publishing' }
      ]
    },
    {
      id: 'api_integration',
      name: t('customAutomationWidget.ui.templates.apiIntegration.name'),
      description: t('customAutomationWidget.ui.templates.apiIntegration.description'),
      icon: '🔗',
      category: 'integration',
      complexity: 'complex',
      estimatedTime: '30-60 min',
      tags: ['API', 'Integration', 'Sync'],
      steps: [
        { id: 'api_config', title: t('customAutomationWidget.ui.templates.apiIntegration.steps.configure'), description: 'Configure API connection and authentication', type: 'data_input', status: 'pending', allowsIntervention: true },
        { id: 'data_mapping', title: t('customAutomationWidget.ui.templates.apiIntegration.steps.map'), description: 'Define data field mapping relationships', type: 'processing', status: 'pending', allowsIntervention: true },
        { id: 'sync_test', title: t('customAutomationWidget.ui.templates.apiIntegration.steps.test'), description: 'Execute test sync to verify configuration', type: 'decision', status: 'pending', allowsIntervention: true },
        { id: 'full_sync', title: t('customAutomationWidget.ui.templates.apiIntegration.steps.sync'), description: 'Execute full data synchronization', type: 'output', status: 'pending', allowsIntervention: false }
      ],
      inputs: [
        { id: 'api_endpoint', name: 'endpoint', type: 'text', label: t('customAutomationWidget.ui.templates.apiIntegration.inputs.apiEndpoint'), required: true, placeholder: 'https://api.example.com/v1' },
        { id: 'auth_method', name: 'auth_method', type: 'select', label: t('customAutomationWidget.ui.templates.apiIntegration.inputs.authMethod'), required: true, options: [
          { label: 'API Key', value: 'api_key' },
          { label: 'OAuth 2.0', value: 'oauth2' },
          { label: 'Basic Auth', value: 'basic' }
        ]},
        { id: 'sync_frequency', name: 'sync_frequency', type: 'select', label: t('customAutomationWidget.ui.templates.apiIntegration.inputs.syncFrequency'), required: true, options: [
          { label: 'Real-time', value: 'realtime' },
          { label: 'Hourly', value: 'hourly' },
          { label: 'Daily', value: 'daily' }
        ]}
      ]
    }
  ], [t]);

  // Get complexity indicator
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'simple': return 'text-green-400';
      case 'moderate': return 'text-yellow-400';
      case 'complex': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Get complexity label
  const getComplexityLabel = (complexity: string) => {
    switch (complexity) {
      case 'simple': return t('customAutomationWidget.ui.complexity.simple');
      case 'moderate': return t('customAutomationWidget.ui.complexity.moderate');
      case 'complex': return t('customAutomationWidget.ui.complexity.complex');
      default: return complexity;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'error': return '❌';
      case 'manual_review': return '👤';
      default: return '⏳';
    }
  };

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return t('customAutomationWidget.ui.status.pending');
      case 'running': return t('customAutomationWidget.ui.status.running');
      case 'completed': return t('customAutomationWidget.ui.status.completed');
      case 'error': return t('customAutomationWidget.ui.status.error');
      case 'manual_review': return t('customAutomationWidget.ui.status.manual_review');
      default: return status;
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: AutomationTemplate) => {
    setSelectedTemplate(template);
    setActiveMode('configure');
    
    // Initialize input values with defaults
    const initialValues: Record<string, any> = {};
    template.inputs.forEach(input => {
      if (input.type === 'multiselect') {
        initialValues[input.id] = [];
      } else {
        initialValues[input.id] = input.value || '';
      }
    });
    setInputValues(initialValues);
  };

  // Handle input validation
  const validateInputs = (): boolean => {
    if (!selectedTemplate) return false;
    
    const errors: Record<string, string> = {};
    
    selectedTemplate.inputs.forEach(input => {
      const value = inputValues[input.id];
      
      if (input.required && (!value || (Array.isArray(value) && value.length === 0))) {
        errors[input.id] = `${input.label} ${t('customAutomationWidget.ui.validation.required')}`;
      }
      
      if (input.validation) {
        if (input.type === 'number' && value) {
          if (input.validation.min && value < input.validation.min) {
            errors[input.id] = `${input.label} ${t('customAutomationWidget.ui.validation.minValue')} ${input.validation.min}`;
          }
          if (input.validation.max && value > input.validation.max) {
            errors[input.id] = `${input.label} ${t('customAutomationWidget.ui.validation.maxValue')} ${input.validation.max}`;
          }
        }
        
        if (input.validation.pattern && value) {
          const regex = new RegExp(input.validation.pattern);
          if (!regex.test(value)) {
            errors[input.id] = input.validation.message || `${input.label} ${t('customAutomationWidget.ui.validation.invalidFormat')}`;
          }
        }
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // View mode toggle handler
  const handleToggleViewMode = React.useCallback(() => {
    setViewMode(prev => prev === 'modern' ? 'classic' : 'modern');
  }, []);

  // Start automation
  const handleStartAutomation = async () => {
    if (!selectedTemplate || !validateInputs()) {
      return;
    }
    
    setActiveMode('running');
    
    logger.info(LogCategory.ARTIFACT_CREATION, 'Starting automation', {
      templateId: selectedTemplate.id,
      inputs: inputValues
    });
    
    // Call parent callback to process the automation
    try {
      await onStartAutomation({
        templateId: selectedTemplate.id,
        inputs: inputValues,
        mode: 'guided'
      });
    } catch (error) {
      logger.error(LogCategory.ARTIFACT_CREATION, 'Automation failed', { error });
    }
  };

  // Widget edit actions
  const editActions: EditAction[] = [
    { id: 'copy', label: t('customAutomationWidget.ui.actions.copy'), icon: '📋', onClick: (content) => {} },
    { id: 'download', label: t('customAutomationWidget.ui.actions.download'), icon: '💾', onClick: (content) => {} },
    { id: 'share', label: t('customAutomationWidget.ui.actions.share'), icon: '🔗', onClick: (content) => {} }
  ];

  // Widget management actions will be defined after shouldShowOutputHistory

  // Render template selection view
  const renderTemplateSelection = () => (
    <div className="space-y-6 p-3">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-white tracking-tight">{t('customAutomationWidget.ui.templateSelection')}</h3>
        <p className="text-gray-300 text-sm max-w-2xl mx-auto leading-relaxed">{t('customAutomationWidget.ui.templateSelectionDesc')}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {automationTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
            className="group relative p-6 bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-gray-900/60 border border-gray-700/40 rounded-2xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-gray-700/60 hover:via-gray-700/40 hover:to-gray-800/60 hover:border-gray-600/50 hover:shadow-xl hover:shadow-blue-500/10"
          >
            <div className="flex items-start space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-gray-600/20 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform duration-300">
                {template.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white text-sm mb-1 group-hover:text-blue-100 transition-colors">{template.name}</h4>
                <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{template.description}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-xs mb-3 pt-2 border-t border-gray-700/30">
              <span className={`font-semibold px-2 py-1 rounded-full text-xs uppercase tracking-wider ${getComplexityColor(template.complexity)} bg-current/10`}>
                {getComplexityLabel(template.complexity)}
              </span>
              <span className="text-gray-400 font-medium flex items-center gap-1">
                <span className="text-xs">⏱</span>
                {template.estimatedTime}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="inline-flex items-center px-2 py-1 bg-gray-700/40 text-gray-200 text-xs font-medium rounded-md border border-gray-600/30 group-hover:bg-gray-600/50 transition-colors">
                  {tag}
                </span>
              ))}
              {template.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-600/20 text-blue-300 text-xs font-semibold rounded-md border border-blue-500/30">
                  +{template.tags.length - 3}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render configuration view (hybrid modern + classic)
  const renderConfiguration = () => (
    <div className="space-y-6 p-4 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{selectedTemplate?.icon}</span>
            <h3 className="text-lg font-bold text-white tracking-tight">
              {selectedTemplate?.name}
            </h3>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{selectedTemplate?.description}</p>
        </div>
      </div>
      
      {viewMode === 'classic' ? (
        // Classic Form Layout - Traditional form layout (single column)
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-4 bg-gradient-to-br from-gray-800/40 to-gray-800/60 rounded-xl border border-gray-700/50 shadow-lg">
            <div className="space-y-4">
              <h5 className="text-sm font-semibold text-white mb-3 pb-2 border-b border-gray-600/30 flex items-center gap-2">
                <span className="text-purple-400">📝</span>
                {t('customAutomationWidget.ui.parameterConfig')}
              </h5>
              {selectedTemplate?.inputs.map((input) => (
                <SmartFormField
                  key={input.id}
                  input={input}
                  value={inputValues[input.id]}
                  onChange={(value) => setInputValues(prev => ({ ...prev, [input.id]: value }))}
                  error={validationErrors[input.id]}
                />
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-gray-700/40">
            <button
              onClick={() => setActiveMode('template_select')}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-lg text-xs font-medium transition-all duration-200 border border-gray-600/50 hover:border-gray-500/50 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span>←</span>
              {t('customAutomationWidget.ui.backToSelection')}
            </button>
            <button
              onClick={handleStartAutomation}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg text-xs font-bold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <span>▶️</span>
              {t('customAutomationWidget.ui.startAutomation')}
            </button>
          </div>
        </div>
      ) : (
        // Modern Layout - Modern horizontal flow layout
        <div className="space-y-6 mt-6">
          {/* Horizontal Flow Steps */}
          <div className="space-y-6 mt-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 pb-2">
              <span className="text-blue-400">🔄</span>
              {t('customAutomationWidget.ui.processSteps')}
            </h4>
            
            {/* Horizontal Step Flow - Horizontal flow nodes */}
            <div className="relative mt-3 pt-2">
              <div className="flex items-center justify-between overflow-x-auto pb-2 pt-1 mt-2">
                {selectedTemplate?.steps.map((step, index) => (
                  <div key={step.id} className="relative flex flex-col items-center min-w-0 flex-1 py-1">
                    {/* Step Node - Clickable step nodes */}
                    <button 
                      onClick={() => {
                        setSelectedStep(step);
                        setActiveMode('step_detail');
                      }}
                      className="relative group w-12 h-12 bg-gradient-to-br from-gray-800/60 to-gray-800/40 rounded-lg border border-gray-700/50 hover:border-blue-500/50 hover:from-blue-600/20 hover:to-blue-600/10 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/20 cursor-pointer flex items-center justify-center mb-2"
                    >
                      {/* Step Number */}
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg group-hover:scale-110 transition-transform">
                        {index + 1}
                      </div>
                      
                      {/* Step Icon */}
                      <div className="text-lg group-hover:scale-110 transition-transform">
                        {step.type === 'data_input' ? '📝' : 
                         step.type === 'processing' ? '⚙️' :
                         step.type === 'decision' ? '🤔' : '📤'}
                      </div>
                      
                      {/* Status Indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gray-900 rounded-full flex items-center justify-center">
                        <span className="text-xs">{getStatusIcon(step.status)}</span>
                      </div>
                      
                      {/* Intervention Badge */}
                      {step.allowsIntervention && (
                        <div className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-yellow-500/80 rounded-full flex items-center justify-center">
                          <span className="text-xs">👤</span>
                        </div>
                      )}
                    </button>
                    
                    {/* Step Details */}
                    <div className="text-center max-w-20">
                      <h5 className="font-medium text-white text-xs mb-0.5 truncate">{step.title}</h5>
                      <p className="text-xs text-gray-500 leading-tight line-clamp-1">{step.description.split(' ').slice(0, 2).join(' ')}</p>
                    </div>
                    
                    {/* Horizontal Connection Arrow */}
                    {index < selectedTemplate.steps.length - 1 && (
                      <div className="absolute top-6 left-[calc(50%+1.5rem)] w-[calc(100%-3rem)] flex items-center justify-center">
                        <div className="w-full h-0.5 bg-gradient-to-r from-blue-500/60 via-blue-400/80 to-blue-500/60 relative">
                          <div className="absolute -right-1 top-[-2px] w-0 h-0 border-l-[4px] border-l-blue-500/80 border-t-[2px] border-t-transparent border-b-[2px] border-b-transparent"></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Input Configuration Area */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="text-purple-400">⚙️</span>
              {t('customAutomationWidget.ui.parameterConfig')}
            </h4>
            
            {/* Modern card mode - Modern card layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {selectedTemplate?.inputs.map((input) => (
                <div key={input.id} className="p-3 bg-gradient-to-br from-gray-800/50 via-gray-800/30 to-gray-800/50 rounded-lg border border-gray-700/40 hover:border-gray-600/50 transition-all">
                  <SmartFormField
                    input={input}
                    value={inputValues[input.id]}
                    onChange={(value) => setInputValues(prev => ({ ...prev, [input.id]: value }))}
                    error={validationErrors[input.id]}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-gray-700/40">
              <button
                onClick={() => setActiveMode('template_select')}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white rounded-lg text-xs font-medium transition-all duration-200 border border-gray-600/50 hover:border-gray-500/50 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <span>←</span>
                {t('customAutomationWidget.ui.backToSelection')}
              </button>
              <button
                onClick={handleStartAutomation}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg text-xs font-bold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <span>▶️</span>
                {t('customAutomationWidget.ui.startAutomation')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Step detail page renderer - Specific operation interface
  const renderStepDetail = () => {
    if (!selectedStep || !selectedTemplate) return null;
    
    return (
      <div className="space-y-4 p-3">
        {/* Step Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600/20 to-blue-600/10 rounded-lg border border-blue-500/30 flex items-center justify-center">
              <span className="text-lg">
                {selectedStep.type === 'data_input' ? '📝' : 
                 selectedStep.type === 'processing' ? '⚙️' :
                 selectedStep.type === 'decision' ? '🤔' : '📤'}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">{selectedStep.title}</h2>
              <p className="text-sm text-gray-400">{selectedStep.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  selectedStep.status === 'completed'
                    ? 'bg-green-500/20 text-green-300'
                    : selectedStep.status === 'running'
                    ? 'bg-blue-500/20 text-blue-300'
                    : selectedStep.status === 'error'
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-gray-600/20 text-gray-300'
                }`}>
                  {getStatusIcon(selectedStep.status)} {getStatusLabel(selectedStep.status)}
                </span>
                {selectedStep.allowsIntervention && (
                  <span className="inline-flex items-center text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full border border-yellow-500/30 font-medium">
                    <span className="mr-1">👤</span>
                    Manual Override
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveMode('configure')}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
          >
            <span>←</span>
            Back
          </button>
        </div>

        {/* Step Operation Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Operation Form */}
          <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
              <span>🛠️</span>
              Operation Config
            </h3>
            
            {/* Dynamic form based on step type */}
            {selectedStep.type === 'data_input' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Data Source</label>
                  <select className="w-full p-2 bg-gray-800/60 border border-gray-600/50 rounded text-white text-xs">
                    <option>MySQL Production</option>
                    <option>PostgreSQL Staging</option>
                    <option>MongoDB Analytics</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Query Configuration</label>
                  <textarea 
                    className="w-full p-2 bg-gray-800/60 border border-gray-600/50 rounded text-white placeholder-gray-400 text-xs"
                    rows={3}
                    placeholder="SELECT * FROM users WHERE created_at > '2024-01-01'"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-1">File Upload</label>
                  <div className="border-2 border-dashed border-gray-600/50 rounded p-4 text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-colors cursor-pointer">
                    <div className="text-xl mb-1">📁</div>
                    <p className="text-gray-300 text-xs">Click or drag files here</p>
                    <p className="text-xs text-gray-500 mt-0.5">CSV, Excel, JSON formats</p>
                  </div>
                </div>
              </div>
            )}
            
            {selectedStep.type === 'processing' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Processing Rules</label>
                  <div className="space-y-2">
                    {[
                      'Remove duplicates',
                      'Data type conversion', 
                      'Handle missing values',
                      'Field mapping rules'
                    ].map((rule, index) => (
                      <label key={index} className="flex items-center gap-2 text-xs">
                        <input type="checkbox" className="rounded" defaultChecked={index < 2} />
                        <span className="text-gray-300">{rule}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Batch Size</label>
                  <input 
                    type="number" 
                    className="w-full p-2 bg-gray-800/60 border border-gray-600/50 rounded text-white text-xs"
                    defaultValue="1000"
                    placeholder="Enter batch size"
                  />
                </div>
              </div>
            )}
            
            {selectedStep.type === 'decision' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Decision Conditions</label>
                  <div className="space-y-2">
                    <div className="p-2 bg-gray-700/30 rounded border border-gray-600/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white text-xs">Data Quality Check</span>
                        <span className="text-green-300 text-xs">Passed</span>
                      </div>
                      <p className="text-xs text-gray-400">Error rate &lt; 5%, Completeness &gt; 95%</p>
                    </div>
                    <div className="p-2 bg-gray-700/30 rounded border border-gray-600/30">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white text-xs">Business Rules Validation</span>
                        <span className="text-yellow-300 text-xs">Pending Review</span>
                      </div>
                      <p className="text-xs text-gray-400">Exception data requiring manual review</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {selectedStep.type === 'output' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Output Format</label>
                  <select className="w-full p-2 bg-gray-800/60 border border-gray-600/50 rounded text-white text-xs">
                    <option>JSON</option>
                    <option>CSV</option>
                    <option>Excel</option>
                    <option>Parquet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white mb-1">Output Directory</label>
                  <input 
                    type="text" 
                    className="w-full p-2 bg-gray-800/60 border border-gray-600/50 rounded text-white text-xs"
                    defaultValue="/data/processed/"
                    placeholder="Enter output directory"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" className="rounded" />
                    <span className="text-gray-300">Auto upload to cloud storage</span>
                  </label>
                </div>
              </div>
            )}
            
            <div className="flex gap-2 pt-3 border-t border-gray-700/40">
              <button className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition-colors">
                Save Config
              </button>
              <button className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-xs font-medium transition-colors">
                Execute Step
              </button>
            </div>
          </div>
          
          {/* Right: Execution Status & Logs */}
          <div className="space-y-4">
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                <span>📄</span>
                Execution Status
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded text-xs">
                  <span className="text-gray-300">Last Execution</span>
                  <span className="text-white font-medium">14:30:25</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded text-xs">
                  <span className="text-gray-300">Records Processed</span>
                  <span className="text-white font-medium">2,456</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded text-xs">
                  <span className="text-gray-300">Execution Time</span>
                  <span className="text-white font-medium">3m 42s</span>
                </div>
              </div>
            </div>
            
            {/* Artifacts & Output Data */}
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                <span>📁</span>
                Generated Files
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded hover:bg-gray-700/40 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📊</span>
                    <div>
                      <p className="font-medium text-white text-xs">data_summary.json</p>
                      <p className="text-xs text-gray-400">Data summary report</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">2.4KB</span>
                    <button className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded text-xs transition-colors">
                      View
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded hover:bg-gray-700/40 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">📈</span>
                    <div>
                      <p className="font-medium text-white text-xs">processing_report.csv</p>
                      <p className="text-xs text-gray-400">Processing detailed report</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">15.2KB</span>
                    <button className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded text-xs transition-colors">
                      Download
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-gray-700/30 rounded hover:bg-gray-700/40 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⚠️</span>
                    <div>
                      <p className="font-medium text-white text-xs">duplicate_records.log</p>
                      <p className="text-xs text-gray-400">Error and duplicate data log</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">1.8KB</span>
                    <button className="px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded text-xs transition-colors">
                      Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                <span>📝</span>
                Execution Logs
              </h3>
              <div className="bg-gray-900/60 rounded p-3 font-mono text-xs max-h-48 overflow-y-auto">
                <div className="space-y-0.5 text-gray-300">
                  <div>[14:30:25] Starting step: {selectedStep.title}</div>
                  <div className="text-blue-300">[14:30:26] Connecting to database...</div>
                  <div className="text-green-300">[14:30:27] Connection successful</div>
                  <div className="text-blue-300">[14:30:28] Querying data...</div>
                  <div className="text-green-300">[14:32:15] Query complete: 2,456 records</div>
                  <div className="text-yellow-300">[14:32:16] Found 12 duplicate records</div>
                  <div className="text-blue-300">[14:32:17] Processing duplicates...</div>
                  <div className="text-green-300">[14:34:07] Step completed</div>
                  
                  {/* Artifact Output */}
                  <div className="border-t border-gray-700/50 pt-1 mt-2">
                    <div className="text-purple-300 font-semibold">[14:34:08] Artifacts generated:</div>
                    <div className="text-gray-400 ml-2">📊 data_summary.json (2.4KB)</div>
                    <div className="text-gray-400 ml-2">📈 processing_report.csv (15.2KB)</div>
                    <div className="text-gray-400 ml-2">⚠️ duplicate_records.log (1.8KB)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Dashboard page renderer - Professional data dashboard
  const renderDashboard = () => (
    <div className="space-y-4 p-4">
      {/* Header with Real-time Status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Business Intelligence Dashboard</h2>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium">Live</span>
            </div>
            <div className="text-gray-400">Last updated: {new Date().toLocaleTimeString()}</div>
            <div className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium border border-blue-500/30">
              99.7% Uptime
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-gray-700/60 hover:bg-gray-600/60 text-white rounded-lg text-xs font-medium transition-colors border border-gray-600/50">
            🔄 Refresh
          </button>
          <button className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors border border-blue-500/50">
            📊 Export
          </button>
        </div>
      </div>

      {/* Real-time KPIs with Trend Indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-600/15 via-blue-600/10 to-blue-600/5 p-4 rounded-xl border border-blue-500/20 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <span className="text-sm">⚡</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full text-xs font-bold">
                <span>↗</span>12.3%
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-blue-300 text-xs font-medium uppercase tracking-wider">Active Executions</p>
              <p className="text-white text-xl font-bold">1,847</p>
              <p className="text-blue-200/80 text-xs">vs 1,643 last period</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-600/15 via-green-600/10 to-green-600/5 p-4 rounded-xl border border-green-500/20 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/10 rounded-full -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-sm">✓</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full text-xs font-bold">
                <span>↗</span>2.4%
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-green-300 text-xs font-medium uppercase tracking-wider">Success Rate</p>
              <p className="text-white text-xl font-bold">98.4%</p>
              <p className="text-green-200/80 text-xs">vs 95.9% last period</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/15 via-purple-600/10 to-purple-600/5 p-4 rounded-xl border border-purple-500/20 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/10 rounded-full -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <span className="text-sm">⚡</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-300 rounded-full text-xs font-bold">
                <span>↘</span>18.7%
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-purple-300 text-xs font-medium uppercase tracking-wider">Avg Response</p>
              <p className="text-white text-xl font-bold">1.8s</p>
              <p className="text-purple-200/80 text-xs">vs 2.2s last period</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-600/15 via-orange-600/10 to-orange-600/5 p-4 rounded-xl border border-orange-500/20 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-500/10 rounded-full -mr-8 -mt-8"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <span className="text-sm">💾</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-xs font-bold">
                <span>↗</span>5.2%
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-orange-300 text-xs font-medium uppercase tracking-wider">Data Processed</p>
              <p className="text-white text-xl font-bold">2.4TB</p>
              <p className="text-orange-200/80 text-xs">vs 2.28TB last period</p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Activity Feed & System Health Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Real-time Activity Feed */}
        <div className="lg:col-span-2 bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
          <div className="p-4 border-b border-gray-700/50">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-blue-400">📈</span>
                Real-time Activity Stream
              </h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400 font-medium">Live Updates</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {[
                { time: '14:32:45', type: 'success', template: 'ETL Data Processing', records: '2,456 records', icon: '📊', color: 'green' },
                { time: '14:31:12', type: 'warning', template: 'API Integration Sync', records: 'Rate limit warning', icon: '⚠️', color: 'yellow' },
                { time: '14:29:38', type: 'success', template: 'Content Workflow', records: '15 articles published', icon: '📝', color: 'green' },
                { time: '14:28:22', type: 'info', template: 'System Health Check', records: 'All services operational', icon: '🔍', color: 'blue' },
                { time: '14:27:05', type: 'success', template: 'Data ETL Pipeline', records: '5.2GB processed', icon: '🔄', color: 'green' },
                { time: '14:25:41', type: 'error', template: 'API Integration', records: 'Connection timeout', icon: '🔗', color: 'red' }
              ].map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-700/20 rounded-lg hover:bg-gray-700/30 transition-colors group">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                    activity.color === 'green' ? 'bg-green-500/20 text-green-300' :
                    activity.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-300' :
                    activity.color === 'red' ? 'bg-red-500/20 text-red-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-white text-xs truncate group-hover:text-blue-100">{activity.template}</p>
                      <span className="text-xs text-gray-400 font-mono">{activity.time}</span>
                    </div>
                    <p className="text-xs text-gray-300 mb-1">{activity.records}</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        activity.type === 'success' ? 'bg-green-500/15 text-green-300 border border-green-500/30' :
                        activity.type === 'warning' ? 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30' :
                        activity.type === 'error' ? 'bg-red-500/15 text-red-300 border border-red-500/30' :
                        'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      }`}>
                        {activity.type.toUpperCase()}
                      </span>
                      <div className="flex-1 h-1 bg-gray-700/50 rounded-full overflow-hidden">
                        <div className={`h-full ${
                          activity.type === 'success' ? 'bg-green-400' :
                          activity.type === 'warning' ? 'bg-yellow-400' :
                          activity.type === 'error' ? 'bg-red-400' :
                          'bg-blue-400'
                        } w-full transition-all duration-1000 ease-out`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Health & Quick Actions */}
        <div className="space-y-4">
          {/* System Health Monitor */}
          <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="p-4 border-b border-gray-700/50">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-green-400">💚</span>
                System Health
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { service: 'Database Pool', status: 'healthy', value: '85%', icon: '🗄️' },
                { service: 'API Gateway', status: 'healthy', value: '92%', icon: '🌐' },
                { service: 'Queue Workers', status: 'warning', value: '78%', icon: '⚡' },
                { service: 'Storage', status: 'healthy', value: '94%', icon: '💾' }
              ].map((health, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm">{health.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-white">{health.service}</span>
                      <span className="text-xs text-gray-400">{health.value}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        health.status === 'healthy' ? 'bg-gradient-to-r from-green-500 to-green-400' :
                        health.status === 'warning' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                        'bg-gradient-to-r from-red-500 to-red-400'
                      }`} style={{width: health.value}}></div>
                    </div>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    health.status === 'healthy' ? 'bg-green-400' :
                    health.status === 'warning' ? 'bg-yellow-400' :
                    'bg-red-400'
                  }`}></div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="p-4 border-b border-gray-700/50">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-blue-400">⚡</span>
                Quick Actions
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {[
                { action: 'Create ETL Pipeline', icon: '🔄', color: 'blue' },
                { action: 'Schedule Task', icon: '📅', color: 'purple' },
                { action: 'Health Check', icon: '🔍', color: 'green' },
                { action: 'Export Report', icon: '📊', color: 'orange' }
              ].map((quick, index) => (
                <button key={index} className={`w-full text-left p-3 rounded-lg transition-all duration-200 hover:scale-105 hover:shadow-md ${
                  quick.color === 'blue' ? 'bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30' :
                  quick.color === 'purple' ? 'bg-purple-600/15 hover:bg-purple-600/25 border border-purple-500/30' :
                  quick.color === 'green' ? 'bg-green-600/15 hover:bg-green-600/25 border border-green-500/30' :
                  'bg-orange-600/15 hover:bg-orange-600/25 border border-orange-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{quick.icon}</span>
                    <span className="text-xs font-medium text-white">{quick.action}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Analytics Mini-Charts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">CPU Usage</span>
            <span className="text-xs font-bold text-blue-300">67%</span>
          </div>
          <div className="flex items-end gap-0.5 h-8">
            {[45, 52, 48, 67, 71, 58, 62, 67].map((height, i) => (
              <div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm" style={{height: `${height}%`}}></div>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">Memory</span>
            <span className="text-xs font-bold text-green-300">42%</span>
          </div>
          <div className="flex items-end gap-0.5 h-8">
            {[38, 41, 39, 42, 45, 44, 41, 42].map((height, i) => (
              <div key={i} className="flex-1 bg-gradient-to-t from-green-600 to-green-400 rounded-sm" style={{height: `${height}%`}}></div>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">Network I/O</span>
            <span className="text-xs font-bold text-purple-300">1.2GB/s</span>
          </div>
          <div className="flex items-end gap-0.5 h-8">
            {[25, 58, 72, 89, 65, 45, 78, 82].map((height, i) => (
              <div key={i} className="flex-1 bg-gradient-to-t from-purple-600 to-purple-400 rounded-sm" style={{height: `${height}%`}}></div>
            ))}
          </div>
        </div>
        
        <div className="bg-gray-800/40 rounded-lg border border-gray-700/50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">Queue Depth</span>
            <span className="text-xs font-bold text-orange-300">23</span>
          </div>
          <div className="flex items-end gap-0.5 h-8">
            {[15, 18, 22, 27, 23, 19, 21, 23].map((height, i) => (
              <div key={i} className="flex-1 bg-gradient-to-t from-orange-600 to-orange-400 rounded-sm" style={{height: `${height}%`}}></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Scheduled tasks page renderer - Professional task management system
  const renderScheduledTasks = () => (
    <div className="space-y-4 p-4">
      {/* Header with Statistics */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Task Management Center</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-green-400 font-medium">12 Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-yellow-400 font-medium">3 Paused</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-blue-400 font-medium">Next: 2h 15m</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-gray-700/60 hover:bg-gray-600/60 text-white rounded-lg text-xs font-medium transition-colors border border-gray-600/50 flex items-center gap-1">
            <span>🔄</span> Refresh
          </button>
          <button className="px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs font-medium transition-colors border border-blue-500/50 flex items-center gap-1">
            <span>➕</span> New Task
          </button>
        </div>
      </div>

      {/* Task Categories & Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-600/15 via-blue-600/10 to-blue-600/5 p-3 rounded-xl border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-blue-500/20 rounded-md flex items-center justify-center">
              <span className="text-xs">⏰</span>
            </div>
            <span className="text-xs font-medium text-blue-300">Scheduled</span>
          </div>
          <p className="text-white text-lg font-bold">8</p>
          <p className="text-blue-200/80 text-xs">2 due today</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600/15 via-purple-600/10 to-purple-600/5 p-3 rounded-xl border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-purple-500/20 rounded-md flex items-center justify-center">
              <span className="text-xs">🔔</span>
            </div>
            <span className="text-xs font-medium text-purple-300">Triggered</span>
          </div>
          <p className="text-white text-lg font-bold">4</p>
          <p className="text-purple-200/80 text-xs">1 active listener</p>
        </div>

        <div className="bg-gradient-to-br from-green-600/15 via-green-600/10 to-green-600/5 p-3 rounded-xl border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-green-500/20 rounded-md flex items-center justify-center">
              <span className="text-xs">✅</span>
            </div>
            <span className="text-xs font-medium text-green-300">Completed</span>
          </div>
          <p className="text-white text-lg font-bold">127</p>
          <p className="text-green-200/80 text-xs">Today: 15</p>
        </div>

        <div className="bg-gradient-to-br from-red-600/15 via-red-600/10 to-red-600/5 p-3 rounded-xl border border-red-500/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-red-500/20 rounded-md flex items-center justify-center">
              <span className="text-xs">⚠️</span>
            </div>
            <span className="text-xs font-medium text-red-300">Failed</span>
          </div>
          <p className="text-white text-lg font-bold">3</p>
          <p className="text-red-200/80 text-xs">Need attention</p>
        </div>
      </div>

      {/* Advanced Task Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-800/60 p-1 rounded-lg">
          {[
            { id: 'all', label: 'All Tasks', count: 15 },
            { id: 'scheduled', label: 'Scheduled', count: 8 },
            { id: 'triggered', label: 'Event-Based', count: 4 },
            { id: 'recurring', label: 'Recurring', count: 3 }
          ].map((tab, index) => (
            <button
              key={tab.id}
              className={`px-3 py-1.5 rounded-md font-medium text-xs transition-colors flex items-center gap-1 ${
                index === 0 ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
              }`}
            >
              {tab.label}
              <span className="px-1.5 py-0.5 bg-gray-600/40 rounded-full text-xs">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-1.5 bg-gray-800/60 border border-gray-600/50 rounded-lg text-white text-xs">
            <option>Sort by Next Run</option>
            <option>Sort by Priority</option>
            <option>Sort by Status</option>
            <option>Sort by Template</option>
          </select>
          <button className="px-3 py-1.5 bg-gray-700/60 hover:bg-gray-600/60 text-white rounded-lg text-xs transition-colors">
            📊 Analytics
          </button>
        </div>
      </div>

      {/* Enhanced Task List */}
      <div className="space-y-3">
        {[
          {
            id: 'task_1',
            name: 'Daily ETL Data Backup',
            template: 'ETL Data Processing',
            schedule: 'Daily at 02:00',
            status: 'active',
            nextRun: 'Tomorrow 02:00',
            lastRun: '12h ago',
            priority: 'high',
            duration: '~15 min',
            success_rate: '98.5%',
            type: 'scheduled',
            icon: '🔄'
          },
          {
            id: 'task_2',
            name: 'Weekly Analytics Report',
            template: 'API Integration Sync',
            schedule: 'Weekly Mon 09:00',
            status: 'active',
            nextRun: 'Monday 09:00',
            lastRun: '6d ago',
            priority: 'medium',
            duration: '~8 min',
            success_rate: '95.2%',
            type: 'scheduled',
            icon: '📊'
          },
          {
            id: 'task_3',
            name: 'Content Auto-Publishing',
            template: 'Content Workflow',
            schedule: 'On file upload',
            status: 'active',
            nextRun: 'Event triggered',
            lastRun: '2h ago',
            priority: 'high',
            duration: '~3 min',
            success_rate: '97.1%',
            type: 'triggered',
            icon: '📝'
          },
          {
            id: 'task_4',
            name: 'API Health Monitor',
            template: 'System Health Check',
            schedule: 'Every 5 minutes',
            status: 'active',
            nextRun: 'In 2 minutes',
            lastRun: '3m ago',
            priority: 'critical',
            duration: '~30 sec',
            success_rate: '99.8%',
            type: 'recurring',
            icon: '🔍'
          },
          {
            id: 'task_5',
            name: 'Customer Data Sync',
            template: 'API Integration',
            schedule: 'Hourly',
            status: 'paused',
            nextRun: 'Paused',
            lastRun: '4h ago',
            priority: 'low',
            duration: '~5 min',
            success_rate: '89.3%',
            type: 'scheduled',
            icon: '🔗'
          }
        ].map((task) => (
          <div key={task.id} className="bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm hover:bg-gray-800/50 transition-all duration-200 group">
            <div className="p-4">
              <div className="flex items-start justify-between">
                {/* Left: Task Info */}
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                    task.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-700/50 text-gray-400'
                  }`}>
                    {task.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-sm mb-1 group-hover:text-blue-100">{task.name}</h3>
                        <p className="text-xs text-gray-400 mb-1">Template: <span className="text-gray-300">{task.template}</span></p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-gray-500">📅 {task.schedule}</span>
                          <span className="text-gray-500">⏱️ {task.duration}</span>
                          <span className={`font-medium ${
                            task.priority === 'critical' ? 'text-red-400' :
                            task.priority === 'high' ? 'text-orange-400' :
                            task.priority === 'medium' ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            🏷️ {task.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          task.type === 'scheduled' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
                          task.type === 'triggered' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
                          'bg-green-500/15 text-green-300 border-green-500/30'
                        }`}>
                          {task.type === 'scheduled' ? '⏰ Scheduled' :
                           task.type === 'triggered' ? '🔔 Event-Based' :
                           '🔄 Recurring'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex items-start gap-4">
                  {/* Status & Metrics */}
                  <div className="text-right space-y-2">
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      task.status === 'active' 
                        ? 'bg-green-500/20 text-green-300 border-green-500/40' 
                        : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                    }`}>
                      {task.status === 'active' ? '🟢 ACTIVE' : '⏸️ PAUSED'}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400">Next: <span className="text-white font-medium">{task.nextRun}</span></p>
                      <p className="text-xs text-gray-400">Last: <span className="text-gray-300">{task.lastRun}</span></p>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs text-green-300 font-medium">{task.success_rate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-1">
                    <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-xs">
                      <span>▶️</span>
                    </button>
                    <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-xs">
                      <span>⚙️</span>
                    </button>
                    <button className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors text-xs">
                      <span>📊</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar for Running Tasks */}
              {task.status === 'active' && task.nextRun.includes('minutes') && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Next execution</span>
                    <span className="text-xs text-blue-300 font-medium">{task.nextRun}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full animate-pulse" style={{width: '70%'}}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Task Creation Quick Panel */}
      <div className="bg-gradient-to-br from-gray-800/60 via-gray-800/40 to-gray-800/60 rounded-xl border border-gray-700/50 p-4">
        <h3 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
          <span className="text-blue-400">⚡</span>
          Quick Task Creation
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {[
            { template: 'ETL Pipeline', icon: '🔄', color: 'blue' },
            { template: 'API Sync', icon: '🔗', color: 'purple' },
            { template: 'Content Workflow', icon: '📝', color: 'green' },
            { template: 'Health Check', icon: '🔍', color: 'orange' }
          ].map((quick) => (
            <button
              key={quick.template}
              className={`p-3 rounded-lg text-left transition-all duration-200 hover:scale-105 border ${
                quick.color === 'blue' ? 'bg-blue-600/15 hover:bg-blue-600/25 border-blue-500/30' :
                quick.color === 'purple' ? 'bg-purple-600/15 hover:bg-purple-600/25 border-purple-500/30' :
                quick.color === 'green' ? 'bg-green-600/15 hover:bg-green-600/25 border-green-500/30' :
                'bg-orange-600/15 hover:bg-orange-600/25 border-orange-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{quick.icon}</span>
                <span className="text-xs font-medium text-white">{quick.template}</span>
              </div>
              <p className="text-xs text-gray-400">Create scheduled task</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // Settings page renderer - Professional system configuration center
  const renderSettings = () => (
    <div className="space-y-4 p-4">
      {/* Header with System Status */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">System Configuration Center</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium">System Healthy</span>
            </div>
            <div className="text-gray-400">Last sync: {new Date().toLocaleTimeString()}</div>
            <div className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-medium border border-blue-500/30">
              Config v2.4.1
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 bg-gray-700/60 hover:bg-gray-600/60 text-white rounded-lg text-xs font-medium transition-colors border border-gray-600/50">
            🔄 Sync
          </button>
          <button className="px-3 py-1.5 bg-green-600/80 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors border border-green-500/50">
            💾 Backup
          </button>
        </div>
      </div>

      {/* Configuration Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Connectors & Integrations */}
        <div className="lg:col-span-2 space-y-4">
          {/* Data Sources & APIs */}
          <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="p-4 border-b border-gray-700/50">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="text-blue-400">🔌</span>
                  Data Sources & Integrations
                </h3>
                <button className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded text-xs transition-colors">
                  + Add New
                </button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {[
                { 
                  name: 'MySQL Production DB', 
                  type: 'Database', 
                  status: 'connected', 
                  icon: '🗄️',
                  config: { host: '*.*.*.123', port: '3306', ssl: true },
                  lastSync: '2m ago',
                  health: 95
                },
                { 
                  name: 'WeChat Business API', 
                  type: 'Social API', 
                  status: 'connected', 
                  icon: '💬',
                  config: { version: 'v2.1', auth: 'OAuth 2.0', rate_limit: '1000/min' },
                  lastSync: '5m ago',
                  health: 89
                },
                { 
                  name: 'PostgreSQL Analytics', 
                  type: 'Database', 
                  status: 'warning', 
                  icon: '📊',
                  config: { host: '*.*.*.124', port: '5432', ssl: true },
                  lastSync: '15m ago',
                  health: 72
                },
                { 
                  name: 'Email Service (SMTP)', 
                  type: 'Communication', 
                  status: 'disconnected', 
                  icon: '📧',
                  config: { provider: 'SendGrid', ssl: true, port: '587' },
                  lastSync: 'Never',
                  health: 0
                }
              ].map((connector, index) => (
                <div key={index} className="group bg-gray-700/20 hover:bg-gray-700/30 rounded-lg p-4 transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
                      connector.status === 'connected' ? 'bg-green-500/20 text-green-300' :
                      connector.status === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }`}>
                      {connector.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white text-sm group-hover:text-blue-100">{connector.name}</h4>
                          <p className="text-xs text-gray-400 mb-1">{connector.type} Integration</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>Last sync: {connector.lastSync}</span>
                            <span>•</span>
                            <span>Health: {connector.health}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                            connector.status === 'connected' ? 'bg-green-500/15 text-green-300 border-green-500/30' :
                            connector.status === 'warning' ? 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' :
                            'bg-red-500/15 text-red-300 border-red-500/30'
                          }`}>
                            {connector.status === 'connected' ? '🟢 Connected' :
                             connector.status === 'warning' ? '🟡 Warning' :
                             '🔴 Disconnected'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Configuration Details */}
                      <div className="bg-gray-800/40 rounded-lg p-3 space-y-2">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {Object.entries(connector.config).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="text-gray-400 capitalize">{key.replace('_', ' ')}:</span>
                              <span className="text-gray-300 font-mono">{String(value)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                          <div className="flex gap-2">
                            <button className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded text-xs transition-colors">
                              ⚙️ Configure
                            </button>
                            <button className="px-2 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded text-xs transition-colors">
                              🔍 Test
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-full h-1 bg-gray-700/50 rounded-full w-16 overflow-hidden">
                              <div className={`h-full rounded-full ${
                                connector.health > 80 ? 'bg-green-400' :
                                connector.health > 60 ? 'bg-yellow-400' : 'bg-red-400'
                              }`} style={{width: `${connector.health}%`}}></div>
                            </div>
                            <span className="text-xs text-gray-400">{connector.health}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security & Authentication */}
          <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="p-4 border-b border-gray-700/50">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-red-400">🔒</span>
                Security & Authentication
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {[
                { 
                  setting: 'API Key Rotation', 
                  description: 'Automatically rotate API keys every 90 days',
                  enabled: true,
                  critical: true
                },
                { 
                  setting: 'Two-Factor Authentication', 
                  description: 'Require 2FA for system configuration changes',
                  enabled: true,
                  critical: true
                },
                { 
                  setting: 'IP Whitelist', 
                  description: 'Restrict access to specified IP addresses',
                  enabled: false,
                  critical: false
                },
                { 
                  setting: 'Audit Logging', 
                  description: 'Log all system configuration changes',
                  enabled: true,
                  critical: false
                },
                { 
                  setting: 'SSL Certificate Auto-Renewal', 
                  description: 'Automatically renew SSL certificates',
                  enabled: true,
                  critical: true
                }
              ].map((security, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-700/20 rounded-lg">
                  <div className={`mt-0.5 w-2 h-2 rounded-full ${
                    security.critical ? 'bg-red-400' : 'bg-blue-400'
                  }`}></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-white text-sm">{security.setting}</h4>
                      <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        security.enabled ? 'bg-green-600' : 'bg-gray-600'
                      }`}>
                        <div className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          security.enabled ? 'translate-x-5' : 'translate-x-1'
                        }`}></div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{security.description}</p>
                    {security.critical && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-red-300">⚠️ Critical Security Setting</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Preferences & Monitoring */}
        <div className="space-y-4">
          {/* Notification Settings */}
          <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="p-4 border-b border-gray-700/50">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-yellow-400">🔔</span>
                Notifications
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Task Completion', enabled: true, channel: 'email + slack' },
                { label: 'System Alerts', enabled: true, channel: 'slack' },
                { label: 'Daily Reports', enabled: false, channel: 'email' },
                { label: 'Maintenance Windows', enabled: true, channel: 'email' },
                { label: 'Performance Warnings', enabled: true, channel: 'slack' }
              ].map((notification, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <span className="text-sm text-white font-medium">{notification.label}</span>
                      <p className="text-xs text-gray-400">via {notification.channel}</p>
                    </div>
                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      notification.enabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}>
                      <div className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        notification.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Settings */}
          <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="p-4 border-b border-gray-700/50">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-purple-400">⚡</span>
                Performance
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Max Concurrent Tasks</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    defaultValue="8" 
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none slider"
                  />
                  <span className="text-sm text-blue-300 font-medium w-8">8</span>
                </div>
                <p className="text-xs text-gray-400">Current load: 65%</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Memory Allocation (GB)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="2" 
                    max="16" 
                    defaultValue="8" 
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none slider"
                  />
                  <span className="text-sm text-green-300 font-medium w-8">8</span>
                </div>
                <p className="text-xs text-gray-400">Available: 16GB</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Cache TTL (minutes)</label>
                <input 
                  type="number" 
                  defaultValue="60" 
                  className="w-full px-3 py-2 bg-gray-700/60 border border-gray-600/50 rounded-lg text-white text-sm"
                />
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-gray-800/40 rounded-xl border border-gray-700/50 backdrop-blur-sm">
            <div className="p-4 border-b border-gray-700/50">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <span className="text-green-400">📊</span>
                System Info
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: 'Version', value: '2.4.1-prod' },
                { label: 'Uptime', value: '15d 7h 23m' },
                { label: 'Total Tasks', value: '1,247' },
                { label: 'Success Rate', value: '98.4%' },
                { label: 'CPU Usage', value: '67%' },
                { label: 'Memory Usage', value: '4.2/8GB' },
                { label: 'Disk Space', value: '124/500GB' },
                { label: 'Network I/O', value: '1.2GB/s' }
              ].map((info, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">{info.label}:</span>
                  <span className="text-xs text-white font-medium font-mono">{info.value}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-700/50">
                <button className="w-full px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-medium transition-colors border border-blue-500/30">
                  📄 Export System Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Bottom menu renderer
  const renderBottomMenu = () => (
    <div className="flex-shrink-0 border-t border-gray-700/50 bg-gray-800/60 backdrop-blur-sm">
      <div className="flex w-full">
        {[
          { id: 'templates', label: 'Templates', icon: '📋' },
          { id: 'dashboard', label: 'Dashboard', icon: '📊' },
          { id: 'scheduled', label: 'Tasks', icon: '⏰' },
          { id: 'settings', label: 'Settings', icon: '⚙️' }
        ].map(menu => (
          <button
            key={menu.id}
            onClick={() => setActiveMenu(menu.id as any)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 transition-colors ${
              activeMenu === menu.id
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
            }`}
          >
            <span className="text-lg">{menu.icon}</span>
            <span className="text-xs font-medium truncate">{menu.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  // Render running view
  const renderRunning = () => (
    <div className="space-y-6 p-3">
      <div className="text-center space-y-3">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-blue-500/30 rounded-full animate-pulse"></div>
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full flex items-center justify-center border-2 border-blue-500/30">
            <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">{t('customAutomationWidget.ui.automationRunning')}</h3>
        <p className="text-gray-300 text-sm max-w-md mx-auto leading-relaxed">{t('customAutomationWidget.ui.automationRunningDesc')}</p>
      </div>
      
      <div className="max-w-2xl mx-auto space-y-3">
        {selectedTemplate?.steps.map((step, index) => (
          <div
            key={step.id}
            className={`relative flex items-start space-x-3 p-3 rounded-lg border transition-all duration-300 ${
              step.status === 'completed' 
                ? 'bg-gradient-to-r from-green-600/10 via-green-600/5 to-green-600/10 border-green-500/40 shadow-lg shadow-green-500/10' 
                : step.status === 'running'
                ? 'bg-gradient-to-r from-blue-600/10 via-blue-600/5 to-blue-600/10 border-blue-500/40 shadow-lg shadow-blue-500/10'
                : step.status === 'error'
                ? 'bg-gradient-to-r from-red-600/10 via-red-600/5 to-red-600/10 border-red-500/40 shadow-lg shadow-red-500/10'
                : 'bg-gradient-to-r from-gray-800/50 to-gray-800/30 border-gray-700/40'
            }`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
              step.status === 'completed'
                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                : step.status === 'running'
                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                : step.status === 'error'
                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                : 'bg-gradient-to-br from-gray-700 to-gray-600 text-gray-300'
            }`}>
              {step.status === 'running' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                getStatusIcon(step.status)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h5 className="font-bold text-white text-sm">{step.title}</h5>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  step.status === 'completed'
                    ? 'bg-green-500/20 text-green-300'
                    : step.status === 'running'
                    ? 'bg-blue-500/20 text-blue-300'
                    : step.status === 'error'
                    ? 'bg-red-500/20 text-red-300'
                    : 'bg-gray-600/20 text-gray-300'
                }`}>{getStatusLabel(step.status)}</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{step.description}</p>
              {step.error && (
                <p className="text-xs text-red-300 mt-2 p-2 bg-red-600/10 rounded-lg border border-red-500/20">{step.error}</p>
              )}
            </div>
            {index < selectedTemplate.steps.length - 1 && (
              <div className="absolute left-5 top-11 w-0.5 h-4 bg-gradient-to-b from-current to-transparent opacity-30"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Main content renderer based on active menu
  const renderMainContent = () => {
    switch (activeMenu) {
      case 'templates':
        if (isProcessing) {
          return (
            <div className="flex items-center justify-center h-48 p-6">
              <div className="text-center space-y-3">
                <div className="relative w-12 h-12 mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full animate-pulse"></div>
                  <div className="w-12 h-12 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-gray-300 font-medium text-sm">Processing automation...</p>
              </div>
            </div>
          );
        }
        
        switch (activeMode) {
          case 'template_select':
            return renderTemplateSelection();
          case 'configure':
            return renderConfiguration();
          case 'running':
            return renderRunning();
          case 'step_detail':
            return renderStepDetail();
          case 'results':
            return (
              <div className="text-center py-12 space-y-4">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping"></div>
                  <div className="text-4xl relative z-10">✅</div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">{t('customAutomationWidget.ui.automationCompleted')}</h3>
                  <p className="text-gray-300 text-sm max-w-md mx-auto leading-relaxed">{t('customAutomationWidget.ui.automationCompletedDesc')}</p>
                </div>
                <div className="flex justify-center pt-3">
                  <button
                    onClick={() => setActiveMode('template_select')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2 text-xs"
                  >
                    <span>✨</span>
                    Start New Automation
                  </button>
                </div>
              </div>
            );
          default:
            return renderTemplateSelection();
        }
      case 'dashboard':
        return renderDashboard();
      case 'scheduled':
        return renderScheduledTasks();
      case 'settings':
        return renderSettings();
      default:
        return renderTemplateSelection();
    }
  };

  // Determine if we should show output history 
  // Show output when: configuring templates (to see artifacts), running, or showing results
  const shouldShowOutputHistory = activeMenu === 'templates' && (activeMode === 'configure' || activeMode === 'running' || activeMode === 'results' || activeMode === 'step_detail');
  
  // Widget management actions - hide to avoid duplicate menus
  const managementActions: ManagementAction[] = [];
  
  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 backdrop-blur-lg border border-gray-700/50 rounded-2xl shadow-2xl">
      {/* Main Content Area - No BaseWidget wrapper for template selection */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {shouldShowOutputHistory && (
          <BaseWidget
            title={t('customAutomationWidget.ui.title')}
            icon="🤖"
            isProcessing={isProcessing}
            outputHistory={generateSampleExecutionOutput()}
            currentOutput={currentOutput}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            editActions={editActions}
            managementActions={managementActions}
            onSelectOutput={onSelectOutput}
            onClearHistory={onClearHistory}
            onBack={onBack}
            onToggleMode={onToggleMode}
            viewMode={viewMode}
            onToggleViewMode={handleToggleViewMode}
          >
            {renderMainContent()}
          </BaseWidget>
        )}
        {!shouldShowOutputHistory && (
          <div className="flex-1 overflow-auto">
            {renderMainContent()}
          </div>
        )}
      </div>
      
      {/* Bottom Navigation Menu */}
      {renderBottomMenu()}
    </div>
  );
};

export default CustomAutomationWidget;