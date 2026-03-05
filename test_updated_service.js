/**
 * 测试更新后的chatService事件处理
 */

// 模拟真实API事件
const realAPIEvents = [
  // 1. start事件
  {
    type: "start",
    content: "Starting chat processing",
    timestamp: "2025-09-14T20:07:41.525209",
    session_id: "test_session"
  },
  
  // 2. content事件 (完整响应)
  {
    type: "content", 
    content: "Hello! I'm doing great, thank you for asking.",
    timestamp: "2025-09-14T20:07:44.006888",
    session_id: "test_session"
  },
  
  // 3. custom_event (LLM chunk)
  {
    type: "custom_event",
    content: "🔄 Custom: {'custom_llm_chunk': 'Hello'}",
    timestamp: "2025-09-14T20:07:46.181510",
    session_id: "test_session",
    metadata: { 
      raw_chunk: { custom_llm_chunk: "Hello" }
    }
  },
  
  // 4. tool_calls
  {
    type: "tool_calls",
    content: "🤖 AIMessage: 1 tool call(s)",
    timestamp: "2025-09-14T20:08:01.225698", 
    session_id: "test_session",
    metadata: {
      tool_calls: [{
        name: "get_weather",
        args: { city: "New York" },
        id: "call_123"
      }]
    }
  },
  
  // 5. tool_result_msg
  {
    type: "tool_result_msg",
    content: '🔧 ToolMessage: {"status": "success", "action": "get_weather", "data": {"temperature": 20}}',
    timestamp: "2025-09-14T20:08:01.236218",
    session_id: "test_session"
  },
  
  // 6. node_update
  {
    type: "node_update",
    content: "📊 reason_model: Credits: N/A, Messages: 1",
    timestamp: "2025-09-14T20:08:01.225900",
    session_id: "test_session",
    metadata: {
      node_name: "reason_model",
      next_action: "call_tool"
    }
  },
  
  // 7. end事件
  {
    type: "end",
    content: "Chat processing completed",
    timestamp: "2025-09-14T20:08:10.000000",
    session_id: "test_session"
  }
];

// 简化的AGUIEventParser模拟
class MockAGUIEventParser {
  parse(data) {
    // 模拟解析逻辑
    const baseEvent = {
      thread_id: data.session_id,
      timestamp: data.timestamp,
      run_id: `run_${data.session_id}`,
      metadata: {
        _converted_from_legacy: true,
        _original_type: data.type
      }
    };
    
    switch (data.type) {
      case 'start':
        return {
          ...baseEvent,
          type: 'run_started',
          message_id: `msg_${Date.now()}`
        };
        
      case 'content':
        return {
          ...baseEvent,
          type: 'text_message_content',
          message_id: `msg_${Date.now()}`,
          delta: data.content,
          metadata: {
            ...baseEvent.metadata,
            is_complete_response: true,
            extraction_method: 'content_event',
            final_content: data.content
          }
        };
        
      case 'custom_event':
        if (data.metadata?.raw_chunk?.custom_llm_chunk) {
          return {
            ...baseEvent,
            type: 'text_message_content',
            message_id: `msg_${Date.now()}`,
            delta: data.metadata.raw_chunk.custom_llm_chunk,
            metadata: {
              ...baseEvent.metadata,
              extraction_method: 'custom_event_llm_chunk'
            }
          };
        }
        return {
          ...baseEvent,
          type: 'custom_event',
          metadata: {
            ...baseEvent.metadata,
            custom_content: data.content
          }
        };
        
      case 'tool_calls':
        const toolCall = data.metadata?.tool_calls?.[0];
        if (toolCall) {
          return {
            ...baseEvent,
            type: 'tool_call_start',
            tool_call_id: toolCall.id,
            tool_name: toolCall.name,
            parameters: toolCall.args
          };
        }
        break;
        
      case 'tool_result_msg':
        // 简化的工具结果解析
        const match = data.content.match(/🔧 ToolMessage: ({.*})/);
        if (match) {
          try {
            const result = JSON.parse(match[1]);
            return {
              ...baseEvent,
              type: 'tool_call_end',
              tool_call_id: `tool_${Date.now()}`,
              tool_name: result.action,
              result: result.data,
              error: result.status === 'success' ? undefined : result.error
            };
          } catch (e) {
            console.warn('Failed to parse tool result');
          }
        }
        break;
        
      case 'node_update':
        const nodeMatch = data.content.match(/📊 ([^:]+): Credits: ([^,]+), Messages: (\d+)/);
        if (nodeMatch) {
          return {
            ...baseEvent,
            type: 'node_update',
            node_name: nodeMatch[1].trim(),
            status: 'started',
            credits: nodeMatch[2].trim() === 'N/A' ? 0 : parseInt(nodeMatch[2]),
            messages_count: parseInt(nodeMatch[3]),
            data: data.metadata || {}
          };
        }
        break;
        
      case 'end':
        return {
          ...baseEvent,
          type: 'run_finished',
          result: data.content
        };
        
      default:
        return null;
    }
    
    return null;
  }
}

// 模拟ChatService的handleAGUIEvent方法
function handleAGUIEvent(event, callbacks) {
  console.log(`🎯 处理事件: ${event.type}`);
  
  switch (event.type) {
    case 'run_started':
      callbacks.onStreamStart?.(event.message_id || event.run_id, 'Starting...');
      break;
      
    case 'text_message_content':
      if (event.metadata?.is_complete_response) {
        console.log('📝 完整响应接收 (content事件)');
        callbacks.onStreamComplete?.(event.metadata.final_content || event.delta);
      } else if (event.delta) {
        console.log('🔄 LLM token接收');
        callbacks.onStreamContent?.(event.delta);
      }
      break;
      
    case 'tool_call_start':
      callbacks.onToolStart?.(event.tool_name, event.tool_call_id, event.parameters);
      break;
      
    case 'tool_call_end':
      callbacks.onToolCompleted?.(event.tool_name, event.result, event.error);
      break;
      
    case 'node_update':
      callbacks.onNodeUpdate?.(event.node_name, event.status, event.data);
      break;
      
    case 'run_finished':
      callbacks.onStreamComplete?.();
      break;
      
    case 'custom_event':
      if (event.metadata?.custom_content) {
        console.log('🔄 自定义事件内容:', event.metadata.custom_content);
        callbacks.onStreamStatus?.(event.metadata.custom_content);
      }
      break;
      
    default:
      console.warn('🚨 未处理的事件类型:', event.type);
  }
}

// 测试回调
const testCallbacks = {
  onStreamStart: (messageId, status) => console.log(`✅ Stream Started: ${messageId} - ${status}`),
  onStreamContent: (chunk) => console.log(`📝 Content Chunk: "${chunk}"`),
  onStreamComplete: (finalContent) => console.log(`🎉 Stream Complete: ${finalContent ? `"${finalContent}"` : 'no content'}`),
  onStreamStatus: (status) => console.log(`📊 Status: ${status}`),
  onToolStart: (name, id, params) => console.log(`🔧 Tool Start: ${name} (${id}) with`, params),
  onToolCompleted: (name, result, error) => console.log(`✅ Tool Complete: ${name} -`, error ? `Error: ${error}` : 'Success', result),
  onNodeUpdate: (name, status, data) => console.log(`🔄 Node Update: ${name} - ${status}`, data),
  onError: (error) => console.error(`❌ Error:`, error.message)
};

// 运行测试
console.log('🧪 测试更新后的事件处理...\n');

const parser = new MockAGUIEventParser();

realAPIEvents.forEach((event, index) => {
  console.log(`\n📋 处理事件 ${index + 1}: ${event.type}`);
  
  const aguiEvent = parser.parse(event);
  if (aguiEvent) {
    handleAGUIEvent(aguiEvent, testCallbacks);
  } else {
    console.log('  ⚠️ 事件未能解析');
  }
});

console.log('\n✅ 事件处理测试完成!');