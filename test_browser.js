// 在浏览器控制台运行这个测试
// 1. 打开 http://localhost:5173
// 2. 打开浏览器开发者控制台
// 3. 粘贴并运行以下代码：

async function testGatewayFromBrowser() {
  console.log('Testing Gateway from browser at localhost:5173...');
  
  try {
    const response = await fetch('http://localhost:8000/api/v1/agents/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        message: 'hello test from browser',
        user_id: 'browser-test', 
        session_id: 'browser-session'
      })
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Headers:', response.headers);
    
    if (response.ok) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        console.log('Received:', chunk);
      }
    } else {
      console.error('Error:', response.statusText);
      const text = await response.text();
      console.error('Response body:', text);
    }
  } catch (error) {
    console.error('Network Error:', error);
  }
}

// 运行测试
testGatewayFromBrowser();