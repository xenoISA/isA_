/**
 * ============================================================================
 * 基于真实测试数据的API事件映射 - Real API Event Mapping
 * ============================================================================
 * 
 * 根据2025-09-14真实测试结果重新设计的事件映射关系
 * 测试场景包括: simple2, weather, autonomous, billing, mixed_operations
 */

// ================================================================================
// 真实API事件类型定义 - 基于实际测试数据
// ================================================================================

export interface RealAPIEvent {
  type: string;
  content: string;
  timestamp: string;
  session_id: string;
  metadata?: Record<string, any>;
}

// 真实API中观察到的事件类型
export type RealAPIEventType = 
  | 'start'              // 处理开始
  | 'content'            // 完整响应内容 (推荐用于获取最终响应)
  | 'custom_event'       // 核心流式事件 (78-94%占比)
  | 'tool_calls'         // 工具调用信息
  | 'tool_result_msg'    // 工具执行结果
  | 'node_update'        // 图节点状态更新
  | 'billing'            // 计费信息
  | 'credits'            // 积分使用追踪
  | 'end'                // 处理完成
  | 'error';             // 错误处理

// ================================================================================
// Custom Event的子类型分析 - 基于真实测试观察
// ================================================================================

export interface CustomEventAnalysis {
  hasLLMChunk: boolean;           // 是否包含custom_llm_chunk
  hasProgress: boolean;           // 是否包含progress信息
  hasTaskPlanning: boolean;       // 是否包含任务规划信息
  hasAgentExecution: boolean;     // 是否包含agent execution信息
  rawChunk?: any;                 // 原始chunk数据
  progressInfo?: string;          // 进度信息
}

// ================================================================================
// 真实API事件映射器
// ================================================================================

class RealAPIEventMapper {
  
  /**
   * 分析custom_event的详细内容
   */
  static analyzeCustomEvent(event: RealAPIEvent): CustomEventAnalysis {
    const content = event.content || '';
    const metadata = event.metadata || {};
    
    return {
      hasLLMChunk: content.includes("'custom_llm_chunk':") || 
                   !!metadata.raw_chunk?.custom_llm_chunk,
                   
      hasProgress: content.includes("'type': 'progress'") ||
                   content.includes("Starting execution") ||
                   content.includes("Completed -"),
                   
      hasTaskPlanning: content.includes("Task Planning:") ||
                       content.includes("📋 Task Planning") ||
                       !!metadata.task_planning,
                       
      hasAgentExecution: content.includes("agent_execution") ||
                        content.includes("Task State:") ||
                        content.includes("Task Status:"),
                        
      rawChunk: metadata.raw_chunk,
      progressInfo: this.extractProgressInfo(content)
    };
  }
  
  /**
   * 提取进度信息
   */
  static extractProgressInfo(content: string): string | undefined {
    // 匹配: [tool_name] Starting execution (1/2)
    const startMatch = content.match(/\[([^\]]+)\] Starting execution \((\d+\/\d+)\)/);
    if (startMatch) {
      return `${startMatch[1]} starting (${startMatch[2]})`;
    }
    
    // 匹配: [tool_name] Completed - 1234 chars result
    const completeMatch = content.match(/\[([^\]]+)\] Completed - (\d+) chars result/);
    if (completeMatch) {
      return `${completeMatch[1]} completed (${completeMatch[2]} chars)`;
    }
    
    return undefined;
  }
  
  /**
   * 提取LLM chunk内容
   */
  static extractLLMChunk(event: RealAPIEvent): string | null {
    // 方法1: 从metadata中提取
    const metadataChunk = event.metadata?.raw_chunk?.custom_llm_chunk;
    if (metadataChunk) return metadataChunk;
    
    // 方法2: 从content字符串中解析
    const content = event.content || '';
    const chunkMatch = content.match(/'custom_llm_chunk':\s*'([^']*)'/) || 
                       content.match(/"custom_llm_chunk":\s*"([^"]*)"/);
    if (chunkMatch) return chunkMatch[1];
    
    return null;
  }
  
  /**
   * 提取工具调用信息
   */
  static extractToolCalls(event: RealAPIEvent): Array<{name: string, args: any}> | null {
    const metadata = event.metadata;
    if (metadata?.tool_calls && Array.isArray(metadata.tool_calls)) {
      return metadata.tool_calls.map((call: any) => ({
        name: call.name,
        args: call.args
      }));
    }
    return null;
  }
  
  /**
   * 提取工具结果
   */
  static extractToolResult(event: RealAPIEvent): any | null {
    const content = event.content || '';
    
    // 匹配: 🔧 ToolMessage: {"status": "success", ...}
    const toolMessageMatch = content.match(/🔧 ToolMessage: ({.*})/s);
    if (toolMessageMatch) {
      try {
        return JSON.parse(toolMessageMatch[1]);
      } catch (e) {
        console.warn('Failed to parse tool result JSON:', e);
      }
    }
    
    return null;
  }
  
  /**
   * 提取节点更新信息
   */
  static extractNodeUpdate(event: RealAPIEvent): {
    nodeName: string;
    status: string;
    credits: string;
    messages: number;
    nextAction: string;
  } | null {
    const content = event.content || '';
    const metadata = event.metadata;
    
    // 优先使用metadata中的信息
    if (metadata && metadata.node_name) {
      return {
        nodeName: metadata.node_name,
        status: 'active',
        credits: metadata.credits_used || 'N/A',
        messages: metadata.messages_count || 0,
        nextAction: metadata.next_action || 'unknown'
      };
    }
    
    // 回退到内容解析: 📊 reason_model: Credits: N/A, Messages: 1
    const nodeMatch = content.match(/📊 ([^:]+): Credits: ([^,]+), Messages: (\d+)/);
    if (nodeMatch) {
      return {
        nodeName: nodeMatch[1].trim(),
        status: 'active',
        credits: nodeMatch[2].trim(),
        messages: parseInt(nodeMatch[3]),
        nextAction: metadata?.next_action || 'unknown'
      };
    }
    
    return null;
  }
}

// ================================================================================
// 映射到AGUI事件的转换器
// ================================================================================

export interface AGUIEventLight {
  type: string;
  thread_id: string;
  timestamp: string;
  run_id?: string;
  message_id?: string;
  metadata?: Record<string, any>;
  [key: string]: any;
}

class RealAPIToAGUIMapper {
  
  /**
   * 将真实API事件映射为AGUI标准事件
   */
  static mapToAGUI(realEvent: RealAPIEvent): AGUIEventLight[] {
    const baseEvent = {
      thread_id: realEvent.session_id,
      timestamp: realEvent.timestamp,
      run_id: `run_${realEvent.session_id}`,
      metadata: {
        _source: 'real_api',
        _original_type: realEvent.type,
        _original_content: realEvent.content
      }
    };
    
    switch (realEvent.type) {
      case 'start':
        return [{
          ...baseEvent,
          type: 'run_started',
          message_id: `msg_${Date.now()}`
        }];
        
      case 'content':
        // content事件是最重要的完整响应
        return [
          {
            ...baseEvent,
            type: 'text_message_start',
            message_id: `msg_${Date.now()}`,
            role: 'assistant',
            content_type: 'text'
          },
          {
            ...baseEvent,
            type: 'text_message_content',
            message_id: `msg_${Date.now()}`,
            delta: realEvent.content,
            position: 0
          },
          {
            ...baseEvent,
            type: 'text_message_end',
            message_id: `msg_${Date.now()}`,
            final_content: realEvent.content
          }
        ];
        
      case 'custom_event':
        return this.mapCustomEvent(realEvent, baseEvent);
        
      case 'tool_calls':
        const toolCalls = RealAPIEventMapper.extractToolCalls(realEvent);
        if (toolCalls) {
          return toolCalls.map((call, index) => ({
            ...baseEvent,
            type: 'tool_call_start',
            tool_call_id: `tool_${Date.now()}_${index}`,
            tool_name: call.name,
            parameters: call.args
          }));
        }
        return [];
        
      case 'tool_result_msg':
        const toolResult = RealAPIEventMapper.extractToolResult(realEvent);
        if (toolResult) {
          return [{
            ...baseEvent,
            type: 'tool_call_end',
            tool_call_id: `tool_${Date.now()}`,
            tool_name: toolResult.action || 'unknown_tool',
            result: toolResult.data,
            error: toolResult.status === 'success' ? undefined : toolResult.error
          }];
        }
        return [];
        
      case 'node_update':
        const nodeInfo = RealAPIEventMapper.extractNodeUpdate(realEvent);
        if (nodeInfo) {
          return [{
            ...baseEvent,
            type: 'node_update',
            node_name: nodeInfo.nodeName,
            status: nodeInfo.status as 'started' | 'completed' | 'failed',
            credits: nodeInfo.credits === 'N/A' ? 0 : parseInt(nodeInfo.credits),
            messages_count: nodeInfo.messages,
            data: { next_action: nodeInfo.nextAction }
          }];
        }
        return [];
        
      case 'end':
        return [{
          ...baseEvent,
          type: 'run_finished',
          result: realEvent.content
        }];
        
      case 'error':
        return [{
          ...baseEvent,
          type: 'run_error',
          error: {
            code: 'API_ERROR',
            message: realEvent.content,
            details: realEvent
          }
        }];
        
      case 'billing':
        return [{
          ...baseEvent,
          type: 'billing',
          credits_remaining: 0, // 需要从content中解析
          total_credits: 0,
          model_calls: 0,
          tool_calls: 0
        }];
        
      default:
        // 未知事件类型，返回自定义事件
        return [{
          ...baseEvent,
          type: 'custom_event',
          metadata: {
            ...baseEvent.metadata,
            custom_type: realEvent.type,
            custom_data: realEvent
          }
        }];
    }
  }
  
  /**
   * 专门处理custom_event的复杂映射
   */
  static mapCustomEvent(realEvent: RealAPIEvent, baseEvent: any): AGUIEventLight[] {
    const analysis = RealAPIEventMapper.analyzeCustomEvent(realEvent);
    const results: AGUIEventLight[] = [];
    
    // 1. LLM Token 流
    if (analysis.hasLLMChunk) {
      const chunk = RealAPIEventMapper.extractLLMChunk(realEvent);
      if (chunk) {
        results.push({
          ...baseEvent,
          type: 'text_message_content',
          message_id: `msg_${Date.now()}`,
          delta: chunk
        });
      }
    }
    
    // 2. 工具执行进度
    if (analysis.hasProgress && analysis.progressInfo) {
      results.push({
        ...baseEvent,
        type: 'tool_executing',
        tool_name: analysis.progressInfo.split(' ')[0],
        status: analysis.progressInfo.includes('starting') ? 'starting' : 'completed',
        progress: analysis.progressInfo.includes('starting') ? 0 : 100
      });
    }
    
    // 3. 任务规划状态
    if (analysis.hasTaskPlanning) {
      results.push({
        ...baseEvent,
        type: 'task_progress_update',
        task: {
          id: `task_${Date.now()}`,
          name: 'Task Planning',
          progress: 50,
          status: 'running' as 'pending' | 'running' | 'completed' | 'failed',
          description: realEvent.content.substring(0, 100)
        }
      });
    }
    
    // 4. 如果没有匹配到特定类型，返回自定义事件
    if (results.length === 0) {
      results.push({
        ...baseEvent,
        type: 'custom_event',
        metadata: {
          ...baseEvent.metadata,
          custom_analysis: analysis,
          custom_content: realEvent.content
        }
      });
    }
    
    return results;
  }
}

// ================================================================================
// 使用示例和工具函数
// ================================================================================

/**
 * 处理SSE流的完整响应提取器
 */
class ResponseExtractor {
  private contentBuffer: string = '';
  private llmChunkBuffer: string = '';
  private toolResults: any[] = [];
  
  /**
   * 处理单个SSE事件
   */
  processEvent(event: RealAPIEvent): {
    complete_response?: string;
    streaming_chunk?: string;
    tool_result?: any;
    progress_update?: string;
  } {
    const result: any = {};
    
    switch (event.type) {
      case 'content':
        // 方法1: 直接从content事件获取完整响应 (推荐)
        result.complete_response = event.content;
        break;
        
      case 'custom_event':
        // 方法2: 累积LLM chunks重构完整响应
        const chunk = RealAPIEventMapper.extractLLMChunk(event);
        if (chunk) {
          this.llmChunkBuffer += chunk;
          result.streaming_chunk = chunk;
        }
        
        // 提取进度信息
        const progress = RealAPIEventMapper.extractProgressInfo(event.content);
        if (progress) {
          result.progress_update = progress;
        }
        break;
        
      case 'tool_result_msg':
        // 方法3: 提取工具调用结果
        const toolResult = RealAPIEventMapper.extractToolResult(event);
        if (toolResult) {
          this.toolResults.push(toolResult);
          result.tool_result = toolResult;
        }
        break;
    }
    
    return result;
  }
  
  /**
   * 获取重构的完整响应
   */
  getReconstructedResponse(): string {
    return this.llmChunkBuffer;
  }
  
  /**
   * 获取所有工具结果
   */
  getToolResults(): any[] {
    return this.toolResults;
  }
  
  /**
   * 重置提取器状态
   */
  reset(): void {
    this.contentBuffer = '';
    this.llmChunkBuffer = '';
    this.toolResults = [];
  }
}

// ================================================================================
// 导出主要接口
// ================================================================================

export {
  RealAPIEventMapper,
  RealAPIToAGUIMapper,
  ResponseExtractor
};