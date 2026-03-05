/**
 * 基于真实测试数据的API事件映射测试
 */

import {
  RealAPIEventMapper,
  RealAPIToAGUIMapper,
  ResponseExtractor,
  RealAPIEvent
} from '../RealAPIEventMapping';

// ================================================================================
// 真实测试数据 - 来自2025-09-14的实际API调用
// ================================================================================

describe('RealAPIEventMapping', () => {
  
  // 真实的simple2场景数据
  const realSimpleEvents: RealAPIEvent[] = [
    {
      type: "start",
      content: "Starting chat processing",
      timestamp: "2025-09-14T20:07:41.525209",
      session_id: "test_simple2_session"
    },
    {
      type: "content",
      content: "Hello! I'm doing great, thank you for asking. How can I assist you today?",
      timestamp: "2025-09-14T20:07:44.006888",
      session_id: "test_simple2_session"
    },
    {
      type: "custom_event",
      content: "🔄 Custom: {'custom_llm_chunk': 'Hello'}",
      timestamp: "2025-09-14T20:07:46.181510",
      session_id: "test_simple2_session",
      metadata: { "raw_chunk": { "custom_llm_chunk": "Hello" } }
    },
    {
      type: "custom_event", 
      content: "🔄 Custom: {'custom_llm_chunk': '!'}",
      timestamp: "2025-09-14T20:07:46.181589",
      session_id: "test_simple2_session", 
      metadata: { "raw_chunk": { "custom_llm_chunk": "!" } }
    }
  ];

  // 真实的weather场景数据
  const realWeatherEvents: RealAPIEvent[] = [
    {
      type: "tool_calls",
      content: "🤖 AIMessage: 1 tool call(s)",
      timestamp: "2025-09-14T20:08:01.225698",
      session_id: "test_weather_session",
      metadata: {
        "tool_calls": [{"name": "get_weather", "args": {"city": "New York"}}]
      }
    },
    {
      type: "custom_event",
      content: "🔄 Custom: {'data': '[get_weather] Starting execution (1/1)', 'type': 'progress'}",
      timestamp: "2025-09-14T20:08:01.228717",
      session_id: "test_weather_session",
      metadata: {
        "raw_chunk": {"data": "[get_weather] Starting execution (1/1)", "type": "progress"}
      }
    },
    {
      type: "custom_event", 
      content: "🔄 Custom: {'data': '[get_weather] Completed - 489 chars result', 'type': 'progress'}",
      timestamp: "2025-09-14T20:08:01.235652",
      session_id: "test_weather_session",
      metadata: {
        "raw_chunk": {"data": "[get_weather] Completed - 489 chars result", "type": "progress"}
      }
    },
    {
      type: "tool_result_msg",
      content: "🔧 ToolMessage: {\n  \"status\": \"success\",\n  \"action\": \"get_weather\",\n  \"data\": {\n    \"temperature\": 20,\n    \"condition\": \"cloudy\"\n  }\n}",
      timestamp: "2025-09-14T20:08:01.236218", 
      session_id: "test_weather_session"
    }
  ];

  // ================================================================================
  // Custom Event 分析测试
  // ================================================================================
  
  describe('RealAPIEventMapper', () => {
    
    test('应该正确分析LLM chunk类型的custom_event', () => {
      const event = realSimpleEvents[2]; // custom_event with LLM chunk
      const analysis = RealAPIEventMapper.analyzeCustomEvent(event);
      
      expect(analysis.hasLLMChunk).toBe(true);
      expect(analysis.hasProgress).toBe(false);
      expect(analysis.hasTaskPlanning).toBe(false);
      expect(analysis.rawChunk).toEqual({ "custom_llm_chunk": "Hello" });
    });
    
    test('应该正确分析Progress类型的custom_event', () => {
      const event = realWeatherEvents[1]; // progress event
      const analysis = RealAPIEventMapper.analyzeCustomEvent(event);
      
      expect(analysis.hasLLMChunk).toBe(false);
      expect(analysis.hasProgress).toBe(true);
      expect(analysis.progressInfo).toBe('get_weather starting (1/1)');
    });
    
    test('应该正确提取LLM chunk内容', () => {
      const event = realSimpleEvents[2];
      const chunk = RealAPIEventMapper.extractLLMChunk(event);
      expect(chunk).toBe('Hello');
    });
    
    test('应该正确提取工具调用信息', () => {
      const event = realWeatherEvents[0]; // tool_calls event
      const toolCalls = RealAPIEventMapper.extractToolCalls(event);
      
      expect(toolCalls).toHaveLength(1);
      expect(toolCalls![0].name).toBe('get_weather');
      expect(toolCalls![0].args).toEqual({"city": "New York"});
    });
    
    test('应该正确提取工具结果', () => {
      const event = realWeatherEvents[3]; // tool_result_msg event
      const result = RealAPIEventMapper.extractToolResult(event);
      
      expect(result).toBeTruthy();
      expect(result.status).toBe('success');
      expect(result.action).toBe('get_weather');
      expect(result.data.temperature).toBe(20);
      expect(result.data.condition).toBe('cloudy');
    });
  });

  // ================================================================================
  // AGUI映射测试
  // ================================================================================
  
  describe('RealAPIToAGUIMapper', () => {
    
    test('应该正确映射start事件为run_started', () => {
      const startEvent = realSimpleEvents[0];
      const aguiEvents = RealAPIToAGUIMapper.mapToAGUI(startEvent);
      
      expect(aguiEvents).toHaveLength(1);
      expect(aguiEvents[0].type).toBe('run_started');
      expect(aguiEvents[0].thread_id).toBe('test_simple2_session');
    });
    
    test('应该正确映射content事件为完整的消息序列', () => {
      const contentEvent = realSimpleEvents[1];
      const aguiEvents = RealAPIToAGUIMapper.mapToAGUI(contentEvent);
      
      expect(aguiEvents).toHaveLength(3);
      expect(aguiEvents[0].type).toBe('text_message_start');
      expect(aguiEvents[1].type).toBe('text_message_content');
      expect(aguiEvents[2].type).toBe('text_message_end');
      
      expect(aguiEvents[1].delta).toBe("Hello! I'm doing great, thank you for asking. How can I assist you today?");
      expect(aguiEvents[2].final_content).toBe("Hello! I'm doing great, thank you for asking. How can I assist you today?");
    });
    
    test('应该正确映射custom_event (LLM chunk)为text_message_content', () => {
      const customEvent = realSimpleEvents[2];
      const aguiEvents = RealAPIToAGUIMapper.mapToAGUI(customEvent);
      
      expect(aguiEvents).toHaveLength(1);
      expect(aguiEvents[0].type).toBe('text_message_content');
      expect(aguiEvents[0].delta).toBe('Hello');
    });
    
    test('应该正确映射custom_event (progress)为tool_executing', () => {
      const progressEvent = realWeatherEvents[1];
      const aguiEvents = RealAPIToAGUIMapper.mapToAGUI(progressEvent);
      
      expect(aguiEvents).toHaveLength(1);
      expect(aguiEvents[0].type).toBe('tool_executing');
      expect(aguiEvents[0].tool_name).toBe('get_weather');
      expect(aguiEvents[0].status).toBe('starting');
      expect(aguiEvents[0].progress).toBe(0);
    });
    
    test('应该正确映射tool_calls事件为tool_call_start', () => {
      const toolCallsEvent = realWeatherEvents[0];
      const aguiEvents = RealAPIToAGUIMapper.mapToAGUI(toolCallsEvent);
      
      expect(aguiEvents).toHaveLength(1);
      expect(aguiEvents[0].type).toBe('tool_call_start');
      expect(aguiEvents[0].tool_name).toBe('get_weather');
      expect(aguiEvents[0].parameters).toEqual({"city": "New York"});
    });
    
    test('应该正确映射tool_result_msg事件为tool_call_end', () => {
      const toolResultEvent = realWeatherEvents[3];
      const aguiEvents = RealAPIToAGUIMapper.mapToAGUI(toolResultEvent);
      
      expect(aguiEvents).toHaveLength(1);
      expect(aguiEvents[0].type).toBe('tool_call_end');
      expect(aguiEvents[0].tool_name).toBe('get_weather');
      expect(aguiEvents[0].result).toEqual({
        temperature: 20,
        condition: "cloudy"
      });
      expect(aguiEvents[0].error).toBeUndefined();
    });
  });

  // ================================================================================
  // 响应提取器测试
  // ================================================================================
  
  describe('ResponseExtractor', () => {
    
    test('应该能从content事件直接提取完整响应', () => {
      const extractor = new ResponseExtractor();
      const contentEvent = realSimpleEvents[1];
      
      const result = extractor.processEvent(contentEvent);
      
      expect(result.complete_response).toBe("Hello! I'm doing great, thank you for asking. How can I assist you today?");
    });
    
    test('应该能通过累积LLM chunks重构完整响应', () => {
      const extractor = new ResponseExtractor();
      
      // 处理多个LLM chunk事件
      extractor.processEvent(realSimpleEvents[2]); // "Hello"
      extractor.processEvent(realSimpleEvents[3]); // "!"
      
      const reconstructed = extractor.getReconstructedResponse();
      expect(reconstructed).toBe("Hello!");
    });
    
    test('应该能提取工具执行结果', () => {
      const extractor = new ResponseExtractor();
      const toolResultEvent = realWeatherEvents[3];
      
      const result = extractor.processEvent(toolResultEvent);
      
      expect(result.tool_result).toBeTruthy();
      expect(result.tool_result.action).toBe('get_weather');
      expect(result.tool_result.data.temperature).toBe(20);
      
      const allResults = extractor.getToolResults();
      expect(allResults).toHaveLength(1);
    });
    
    test('应该能提取进度更新信息', () => {
      const extractor = new ResponseExtractor();
      const progressEvent = realWeatherEvents[1];
      
      const result = extractor.processEvent(progressEvent);
      
      expect(result.progress_update).toBe('get_weather starting (1/1)');
    });
  });

  // ================================================================================
  // 集成测试 - 完整场景
  // ================================================================================
  
  describe('集成测试', () => {
    
    test('应该能处理完整的简单对话场景', () => {
      const extractor = new ResponseExtractor();
      const aguiEvents: any[] = [];
      
      // 处理所有simple2场景事件
      for (const event of realSimpleEvents) {
        // 提取响应
        const extracted = extractor.processEvent(event);
        
        // 映射为AGUI事件
        const mapped = RealAPIToAGUIMapper.mapToAGUI(event);
        aguiEvents.push(...mapped);
      }
      
      // 验证响应提取
      expect(extractor.getReconstructedResponse()).toBe("Hello!");
      
      // 验证AGUI事件映射
      expect(aguiEvents.length).toBeGreaterThan(0);
      
      // 应该有run_started事件
      const runStarted = aguiEvents.find(e => e.type === 'run_started');
      expect(runStarted).toBeTruthy();
      
      // 应该有text_message_content事件
      const textContent = aguiEvents.filter(e => e.type === 'text_message_content');
      expect(textContent.length).toBeGreaterThan(0);
    });
    
    test('应该能处理完整的工具调用场景', () => {
      const extractor = new ResponseExtractor();
      const aguiEvents: any[] = [];
      
      // 处理所有weather场景事件
      for (const event of realWeatherEvents) {
        const extracted = extractor.processEvent(event);
        const mapped = RealAPIToAGUIMapper.mapToAGUI(event);
        aguiEvents.push(...mapped);
      }
      
      // 验证工具结果提取
      const toolResults = extractor.getToolResults();
      expect(toolResults).toHaveLength(1);
      expect(toolResults[0].action).toBe('get_weather');
      
      // 验证AGUI事件映射
      const toolCallStart = aguiEvents.find(e => e.type === 'tool_call_start');
      const toolCallEnd = aguiEvents.find(e => e.type === 'tool_call_end');
      const toolExecuting = aguiEvents.find(e => e.type === 'tool_executing');
      
      expect(toolCallStart).toBeTruthy();
      expect(toolCallEnd).toBeTruthy();
      expect(toolExecuting).toBeTruthy();
    });
  });
});