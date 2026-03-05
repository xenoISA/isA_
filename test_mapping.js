/**
 * 测试真实API事件映射关系
 */

// 简化的映射器实现，用于测试
class RealAPIEventMapper {
  static analyzeCustomEvent(event) {
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
                       
      rawChunk: metadata.raw_chunk
    };
  }
  
  static extractLLMChunk(event) {
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
  
  static extractToolResult(event) {
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
}

// 测试数据 - 基于真实API调用
const testEvents = [
  // 1. simple LLM chunk
  {
    type: 'custom_event',
    content: "🔄 Custom: {'custom_llm_chunk': 'Hello'}",
    timestamp: '2025-09-14T20:07:46.181510',
    session_id: 'test_session',
    metadata: { raw_chunk: { custom_llm_chunk: 'Hello' } }
  },
  
  // 2. progress event
  {
    type: 'custom_event',
    content: "🔄 Custom: {'data': '[get_weather] Starting execution (1/1)', 'type': 'progress'}",
    timestamp: '2025-09-14T20:08:01.228717',
    session_id: 'test_session',
    metadata: { raw_chunk: { data: '[get_weather] Starting execution (1/1)', type: 'progress' } }
  },
  
  // 3. tool result
  {
    type: 'tool_result_msg',
    content: '🔧 ToolMessage: {"status": "success", "action": "get_weather", "data": {"temperature": 20, "condition": "cloudy"}}',
    timestamp: '2025-09-14T20:08:01.236218',
    session_id: 'test_session'
  },
  
  // 4. content event
  {
    type: 'content',
    content: "Hello! I'm doing great, thank you for asking. How can I assist you today?",
    timestamp: '2025-09-14T20:07:44.006888',
    session_id: 'test_session'
  }
];

console.log('🧪 测试真实API事件映射...\n');

// 测试每个事件
testEvents.forEach((event, index) => {
  console.log(`📋 测试事件 ${index + 1}: ${event.type}`);
  
  switch (event.type) {
    case 'custom_event':
      const analysis = RealAPIEventMapper.analyzeCustomEvent(event);
      console.log('   - hasLLMChunk:', analysis.hasLLMChunk);
      console.log('   - hasProgress:', analysis.hasProgress);
      
      if (analysis.hasLLMChunk) {
        const chunk = RealAPIEventMapper.extractLLMChunk(event);
        console.log('   - extracted chunk:', chunk);
      }
      break;
      
    case 'tool_result_msg':
      const toolResult = RealAPIEventMapper.extractToolResult(event);
      console.log('   - tool result:', toolResult?.action, '- status:', toolResult?.status);
      break;
      
    case 'content':
      console.log('   - complete response:', event.content.substring(0, 50) + '...');
      break;
  }
  
  console.log('');
});

console.log('✅ 映射测试完成!\n');

// 测试响应提取器
console.log('🔄 测试响应提取器...\n');

class ResponseExtractor {
  constructor() {
    this.llmChunkBuffer = '';
    this.toolResults = [];
  }
  
  processEvent(event) {
    const result = {};
    
    switch (event.type) {
      case 'content':
        result.complete_response = event.content;
        break;
        
      case 'custom_event':
        const chunk = RealAPIEventMapper.extractLLMChunk(event);
        if (chunk) {
          this.llmChunkBuffer += chunk;
          result.streaming_chunk = chunk;
        }
        break;
        
      case 'tool_result_msg':
        const toolResult = RealAPIEventMapper.extractToolResult(event);
        if (toolResult) {
          this.toolResults.push(toolResult);
          result.tool_result = toolResult;
        }
        break;
    }
    
    return result;
  }
  
  getReconstructedResponse() {
    return this.llmChunkBuffer;
  }
  
  getToolResults() {
    return this.toolResults;
  }
}

const extractor = new ResponseExtractor();

testEvents.forEach(event => {
  const result = extractor.processEvent(event);
  if (Object.keys(result).length > 0) {
    console.log(`✨ 处理 ${event.type}:`, result);
  }
});

console.log('\n📊 最终结果:');
console.log('- 重构的响应:', extractor.getReconstructedResponse());
console.log('- 工具结果数量:', extractor.getToolResults().length);

console.log('\n🎉 所有测试完成!');