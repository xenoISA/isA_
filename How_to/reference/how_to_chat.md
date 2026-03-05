# 聊天API使用指南

## 概述

isA_Agent聊天API支持实时流式响应，包括文本对话、工具调用、JSON输出模式等功能。

**最新验证**: 2025-09-26

## API端点

### 文本聊天端点
- **URL**: `http://localhost:8080/api/v1/agents/chat`
- **方法**: `POST`
- **认证**: Bearer Token (Header: `Authorization: Bearer dev_key_test`)
- **响应格式**: Server-Sent Events (SSE)

## 请求格式

```json
{
  "message": "用户消息内容",
  "user_id": "auth0_user_123456", 
  "session_id": "sess_789abc",    
  "output_format": "json"        // 可选: "json"为结构化输出，null为流式输出
}
```

## 响应事件类型

API返回Server-Sent Events (SSE)流，包含以下事件类型：

### 1. start - 开始处理
```json
{
  "type": "start",
  "content": "Starting chat processing",
  "timestamp": "2025-09-26T14:09:18.172361",
  "session_id": "test_session_final_validation_4"
}
```

### 2. content - 内容响应
```json
{
  "type": "content",
  "content": "Hello! How can I help you today?",
  "timestamp": "2025-09-26T14:09:21.709558",
  "session_id": "test_session_final_validation_4"
}
```

### 3. tool_calls - 工具调用
```json
{
  "type": "tool_calls",
  "content": "🤖 AIMessage: 1 tool call(s)",
  "timestamp": "2025-09-26T14:08:26.059178",
  "metadata": {
    "tool_calls": [
      {
        "name": "web_search",
        "args": {"query": "北京 今天天气", "count": 5}
      }
    ]
  }
}
```

### 4. tool_result_msg - 工具结果
```s
{
  "type": "tool_result_msg",
  "content": "🔧 ToolMessage: {\"status\": \"success\", \"action\": \"web_search\"...}",
  "timestamp": "2025-09-26T14:08:27.327842"
}
```

### 5. node_update - 节点状态更新
```json
{
  "type": "node_update",
  "content": "📊 reason_model: Credits: N/A, Messages: 1",
  "metadata": {
    "node_name": "reason_model",
    "credits_used": "N/A",
    "next_action": "end",
    "messages_count": 1
  }
}
```

### 6. custom_event - 自定义事件（LLM token流）
```json
{
  "type": "custom_event",
  "content": "🔄 Custom: {'custom_llm_chunk': 'Hello'}",
  "metadata": {
    "raw_chunk": {"custom_llm_chunk": "Hello"}
  }
}
```

### 7. credits - 积分使用
```json
{
  "type": "credits",
  "content": "Credits used: 0.1",
  "timestamp": "2025-09-26T14:09:24.731391"
}
```

### 8. billing - 计费信息
```json
{
  "type": "billing",
  "content": "Billed 2.0 credits: 2 model calls, 0 tool calls",
  "data": {
    "success": false,
    "model_calls": 2,
    "tool_calls": 0,
    "total_credits": 2.0,
    "credits_remaining": 0.0,
    "error_message": "Billing service not configured"
  }
}
```

### 9. end - 处理完成
```json
{
  "type": "end",
  "content": "Chat processing completed",
  "timestamp": "2025-09-26T14:09:24.734355"
}
```

## 前端集成示例

### React Hook实现
```jsx
import { useState, useCallback } from 'react';

const useChatAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const sendMessage = useCallback(async (message, options = {}) => {
    setIsLoading(true);
    const currentMessages = [];
    
    try {
      const response = await fetch('http://localhost:8080/api/v1/agents/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dev_key_test'
        },
        body: JSON.stringify({
          message,
          user_id: options.userId || 'default_user',
          session_id: options.sessionId || 'default_session',
          output_format: options.outputFormat || null
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const event = JSON.parse(data);
              
              // 处理不同事件类型
              switch(event.type) {
                case 'content':
                  currentMessages.push({ role: 'assistant', content: event.content });
                  setMessages(prev => [...prev, { role: 'assistant', content: event.content }]);
                  break;
                case 'tool_calls':
                  console.log('Tool calls:', event.metadata?.tool_calls);
                  break;
                case 'custom_event':
                  // 处理流式token
                  const chunk = event.metadata?.raw_chunk?.custom_llm_chunk;
                  if (chunk) {
                    // 更新最后一条消息
                    setMessages(prev => {
                      const newMessages = [...prev];
                      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
                        newMessages[newMessages.length - 1].content += chunk;
                      } else {
                        newMessages.push({ role: 'assistant', content: chunk });
                      }
                      return newMessages;
                    });
                  }
                  break;
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat API error:', error);
    } finally {
      setIsLoading(false);
    }
    
    return currentMessages;
  }, []);

  return { sendMessage, messages, isLoading };
};

// 使用示例
function ChatComponent() {
  const { sendMessage, messages, isLoading } = useChatAPI();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const input = e.target.message.value;
    
    // 普通聊天
    await sendMessage(input, {
      userId: 'user123',
      sessionId: 'session456'
    });
    
    // JSON输出模式
    await sendMessage('返回JSON格式的天气信息', {
      userId: 'user123',
      sessionId: 'session456',
      outputFormat: 'json'
    });
  };
  
  return (
    <div>
      {messages.map((msg, idx) => (
        <div key={idx}>{msg.role}: {msg.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input name="message" disabled={isLoading} />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

## 测试示例

### 1. 基础对话测试
```bash
curl -X POST "http://localhost:8080/api/v1/agents/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev_key_test" \
  -d '{
    "message": "Hello",
    "user_id": "test_user",
    "session_id": "test_session"
  }'
```

### 2. 工具调用测试
```bash
curl -X POST "http://localhost:8080/api/v1/agents/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev_key_test" \
  -d '{
    "message": "北京今天天气怎么样？",
    "user_id": "test_user",
    "session_id": "test_session"
  }'
```

### 3. JSON输出模式测试
```bash
curl -X POST "http://localhost:8080/api/v1/agents/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev_key_test" \
  -d '{
    "message": "请用JSON格式回答: {\"answer\": \"你的回答\"}",
    "user_id": "test_user",
    "session_id": "test_session",
    "output_format": "json"
  }'
```

## 性能指标

基于最新测试（2025-09-26）：
- **基础对话**: 响应时间 3-6 秒
- **工具调用**: 响应时间 10-15 秒（包含web_search和web_crawl）
- **JSON输出**: 响应时间 5-10 秒
- **事件数量**: 典型对话产生 20-40 个事件

## 注意事项

1. **会话管理**: `user_id` 和 `session_id` 由前端管理，API信任前端传入的值
2. **流式响应**: 使用SSE处理实时token流，适合打字机效果展示
3. **JSON模式**: 设置`output_format: "json"`时，响应为结构化JSON而非流式文本
4. **错误处理**: 监听`error`类型事件，包含错误详情
5. **计费信息**: `billing`事件包含积分使用情况（需配置计费服务）