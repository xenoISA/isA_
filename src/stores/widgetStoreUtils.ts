/**
 * ============================================================================
 * Widget Store 通用工具函数 (widgetStoreUtils.ts)
 * ============================================================================
 * 
 * 【核心职责】
 * - 提供Widget Store的通用工具函数
 * - 常用的结果处理函数
 * - 模板参数构建帮助函数
 */

import { WidgetHelpers, CustomResultHandlers } from '../types/widgetTypes';
import { createLogger, LogCategory } from '../utils/logger';

const log = createLogger('WidgetStoreUtils', LogCategory.ARTIFACT_CREATION);

/**
 * 通用图片URL提取函数 (用于Dream等图片生成Widget)
 */
export function extractImageFromMessage(
  completeMessage: string,
  setImageCallback: (imageUrl: string) => void,
  helpers: WidgetHelpers
): void {
  const imageRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g;
  const imageMatches = completeMessage.match(imageRegex);
  
  if (imageMatches && imageMatches.length > 0) {
    const urlMatch = imageMatches[0].match(/\((https?:\/\/[^\)]+)\)/);
    if (urlMatch && urlMatch[1]) {
      const imageUrl = urlMatch[1];
      setImageCallback(imageUrl);
      helpers.markWithArtifacts();
      
      helpers.logger.info('ARTIFACT_CREATION', `${helpers.config.logEmoji} Image extracted from complete message`, {
        imageUrl: imageUrl,
        messageLength: completeMessage.length
      });
    } else {
      log.debug(`${helpers.config.widgetType} no valid image URL found in complete message`);
    }
  } else {
    log.debug(`${helpers.config.widgetType} no image markdown found in complete message`);
  }
}

/**
 * 通用文本内容处理函数 (用于Omni、Assistant等文本生成Widget)
 */
export function extractTextFromMessage(
  completeMessage: string,
  setContentCallback: (content: string) => void,
  helpers: WidgetHelpers
): void {
  if (completeMessage && completeMessage.trim()) {
    setContentCallback(completeMessage);
    helpers.markWithArtifacts();
    
    helpers.logger.info('ARTIFACT_CREATION', `${helpers.config.logEmoji} Content extracted from complete message`, {
      contentLength: completeMessage.length,
      contentPreview: completeMessage.substring(0, 100) + '...'
    });
  } else {
    log.debug(`${helpers.config.widgetType} no complete message content provided`);
  }
}

/**
 * 通用搜索结果处理函数 (用于Hunt等搜索Widget)
 */
export function extractSearchResultFromMessage(
  completeMessage: string,
  params: any,
  setResultsCallback: (results: any[]) => void,
  helpers: WidgetHelpers
): void {
  if (completeMessage && completeMessage.trim()) {
    log.debug(`${helpers.config.widgetType} processing complete search response`, { preview: completeMessage.substring(0, 200) });
    
    // 创建搜索结果
    const searchResult = {
      title: `Search Results for: ${params.query}`,
      description: completeMessage.length > 200 ? completeMessage.substring(0, 200) + '...' : completeMessage,
      content: completeMessage,
      query: params.query,
      timestamp: new Date().toISOString(),
      type: 'search_response'
    };
    
    setResultsCallback([searchResult]);
    helpers.logger.info('ARTIFACT_CREATION', `${helpers.config.logEmoji} Search completed with complete message from chatService`, {
      query: params.query,
      responseLength: completeMessage.length
    });
  } else {
    // Fallback if no complete message was provided
    log.debug(`${helpers.config.widgetType} no complete message provided, creating placeholder result`);
    const placeholderResult = {
      title: `Search Results for: ${params.query}`,
      description: 'Search completed but no content was returned.',
      content: 'Search completed but no content was returned.',
      query: params.query,
      timestamp: new Date().toISOString(),
      type: 'search_response'
    };
    
    setResultsCallback([placeholderResult]);
  }
}

/**
 * 通用分析结果处理函数 (用于DataScientist等分析Widget)
 */
export function extractAnalysisFromMessage(
  completeMessage: string,
  setAnalysisCallback: (result: any) => void,
  helpers: WidgetHelpers
): void {
  if (completeMessage && completeMessage.trim()) {
    helpers.markWithArtifacts();
    
    try {
      // 尝试解析为JSON
      const analysisResult = JSON.parse(completeMessage);
      setAnalysisCallback(analysisResult);
      helpers.logger.info('ARTIFACT_CREATION', `${helpers.config.logEmoji} Analysis extracted from complete message (JSON)`, {
        hasInsights: !!analysisResult.analysis?.insights?.length,
        contentLength: completeMessage.length
      });
    } catch (parseError) {
      // 如果不是JSON，作为纯文本存储并构建标准格式
      setAnalysisCallback({
        analysis: {
          summary: completeMessage,
          insights: [],
          recommendations: []
        },
        visualizations: [],
        statistics: {
          dataPoints: 0,
          columns: []
        }
      });
      helpers.logger.info('ARTIFACT_CREATION', `${helpers.config.logEmoji} Analysis extracted from complete message (text)`, {
        contentLength: completeMessage.length,
        contentPreview: completeMessage.substring(0, 100) + '...'
      });
    }
  } else {
    log.debug(`${helpers.config.widgetType} no complete message content provided`);
  }
}

/**
 * 常用模板参数构建器
 */
export const templateBuilders = {
  // 图片生成模板参数
  imageGeneration: (params: any) => ({
    template_id: 'text_to_image_prompt',
    prompt_args: {
      prompt: params.prompt || 'Generate an image',
      style_preset: params.style_preset || params.style || 'photorealistic',
      quality: params.quality || 'high'
    }
  }),

  // 搜索模板参数
  search: (params: any) => ({
    template_id: 'hunt_general_prompt',
    prompt_args: {
      query: params.query || params.prompt, // 不使用默认值，让用户输入为空时保持为空
      search_depth: params.search_depth || 'standard',
      result_format: params.result_format || 'summary'
    }
  }),

  // 内容生成模板参数
  contentGeneration: (params: any) => ({
    template_id: 'general_content_prompt',
    prompt_args: {
      subject: params.topic || params.subject || params.prompt || 'Content generation request',
      content_type: params.contentType || 'text',
      tone: params.tone || 'professional',
      length: params.length || 'medium',
      depth: 'deep',
      reference_text: params.context || 'Generate comprehensive content based on the given topic'
    }
  }),

  // 数据分析模板参数
  dataAnalysis: (params: any) => ({
    template_id: 'csv_analyze_prompt',
    prompt_args: {
      query: params.query || 'Perform data analysis',
      analysis_type: params.analysisType || 'exploratory',
      visualization_type: params.visualizationType || 'chart',
      data_context: params.data ? 'CSV data provided' : 'Request for data analysis'
    }
  }),

  // 文档分析模板参数 (Knowledge)
  knowledgeAnalysis: (params: any) => ({
    template_id: 'intelligent_rag_search_prompt',
    prompt_args: {
      query: params.query || 'Search knowledge base',
      search_type: params.searchType || 'hybrid',
      context_size: params.contextSize || 'medium',
      has_documents: params.documents && params.documents.length > 0
    }
  }),

  // 文档分析模板参数
  documentAnalysis: (params: any) => ({
    template_id: 'document_analysis_prompt',
    prompt_args: {
      query: params.query || 'Analyze documents',
      analysis_type: params.analysisType || 'comprehensive',
      document_context: params.documents ? `${params.documents.length} documents provided` : 'Document analysis request'
    }
  })
};

/**
 * 常用提示词构建器
 */
export const promptBuilders = {
  simple: (params: any) => params.prompt || params.query || 'General request',
  
  dream: (params: any) => params.prompt || 'Generate an image',
  
  hunt: (params: any) => params.query || 'Search for information',
  
  assistant: (params: any) => {
    const prompt = `Assistant request: ${params.query || params.prompt}
${params.context ? `Context: ${params.context}` : ''}
${params.task ? `Task: ${params.task}` : ''}

Please provide helpful assistance based on this request.`;
    return prompt;
  },
  
  dataScientist: (params: any) => {
    const prompt = `Perform data analysis with the following specifications:
Query: ${params.query || 'General data analysis'}
${params.analysisType ? `Analysis Type: ${params.analysisType}` : ''}
${params.visualizationType ? `Visualization Type: ${params.visualizationType}` : ''}
${params.data ? `Data: ${typeof params.data === 'string' ? params.data : 'File provided'}` : ''}

Please provide comprehensive data analysis including insights, recommendations, and visualizations as a data_analysis artifact.`;
    return prompt;
  },
  
  knowledge: (params: any) => {
    const prompt = `Analyze the following document(s) and provide insights:
Query: ${params.query || 'General document analysis'}
${params.documents ? `Documents: ${params.documents.length} file(s) provided` : ''}
${params.analysisType ? `Analysis Type: ${params.analysisType}` : ''}

Please provide comprehensive analysis and insights based on the provided content.`;
    return prompt;
  }
};