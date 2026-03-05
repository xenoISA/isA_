# Frontend Gateway Migration Guide

## Overview
This guide explains how to migrate the frontend application from direct service access to the unified Gateway architecture (port 8000).

## Architecture Change
```
Before: Frontend → Individual Services (8080, 8201, 8205, etc.)
After:  Frontend → Gateway (8000) → Services
```

## Step 1: Update BaseApiService

Update `/src/api/BaseApiService.ts` to use Gateway configuration:

```typescript
import { GATEWAY_CONFIG, getAuthHeaders } from '../config/gatewayConfig';

export class BaseApiService {
  constructor(baseUrl?: string, defaultHeaders?: Record<string, string>, getAuthHeadersFn?: () => Promise<Record<string, string>>) {
    // Use Gateway base URL if not specified
    this.baseUrl = baseUrl || GATEWAY_CONFIG.BASE_URL;
    
    // Use unified auth headers
    this.getAuthHeaders = getAuthHeadersFn || (async () => getAuthHeaders());
  }
}
```

## Step 2: Update ChatService

Update `/src/api/chatService.ts` to use Gateway Agent endpoints:

```typescript
import { GATEWAY_ENDPOINTS, getAuthHeaders } from '../config/gatewayConfig';

export class ChatService {
  private apiService: BaseApiService;
  
  constructor() {
    // Use Gateway Agent endpoint
    this.apiService = new BaseApiService(
      GATEWAY_ENDPOINTS.AGENTS.BASE,
      undefined,
      async () => getAuthHeaders()
    );
  }

  async sendMessage(message: string, sessionId: string): Promise<void> {
    // Use Gateway chat endpoint
    const response = await fetch(GATEWAY_ENDPOINTS.AGENTS.CHAT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ message, session_id: sessionId })
    });
  }

  async streamChat(params: ChatRequest): Promise<void> {
    // SSE streaming through Gateway
    const eventSource = new EventSource(
      `${GATEWAY_ENDPOINTS.AGENTS.CHAT}?${new URLSearchParams(params)}`,
      { headers: getAuthHeaders() }
    );
  }
}
```

## Step 3: Update UserService

Update `/src/api/userService.ts` to use Gateway Accounts endpoints:

```typescript
import { GATEWAY_ENDPOINTS, getAuthHeaders, buildUrlWithParams } from '../config/gatewayConfig';

export class UserService {
  private apiService: BaseApiService;
  
  constructor() {
    // Use Gateway Accounts endpoint
    this.apiService = new BaseApiService(
      GATEWAY_ENDPOINTS.ACCOUNTS.BASE,
      undefined,
      async () => getAuthHeaders()
    );
  }

  async getCurrentUser(): Promise<ExternalUser> {
    // Use Gateway ME endpoint
    const response = await this.apiService.get<ExternalUser>(
      GATEWAY_ENDPOINTS.ACCOUNTS.ME.replace(GATEWAY_ENDPOINTS.ACCOUNTS.BASE, '')
    );
    return response.data!;
  }

  async consumeCredits(auth0_id: string, consumption: CreditConsumption): Promise<CreditConsumptionResult> {
    // Use Gateway credits endpoint with URL params
    const url = buildUrlWithParams(GATEWAY_ENDPOINTS.ACCOUNTS.CREDITS, { userId: auth0_id });
    const response = await this.apiService.post<CreditConsumptionResult>(
      url.replace(GATEWAY_ENDPOINTS.ACCOUNTS.BASE, ''),
      consumption
    );
    return response.data!;
  }
}
```

## Step 4: Update Session Service

Create or update session service to use Gateway:

```typescript
import { GATEWAY_ENDPOINTS, getAuthHeaders } from '../config/gatewayConfig';

export class SessionService {
  async getUserSessions(): Promise<Session[]> {
    const response = await fetch(GATEWAY_ENDPOINTS.SESSIONS.USER, {
      headers: getAuthHeaders()
    });
    return response.json();
  }

  async getActiveSession(): Promise<Session | null> {
    const response = await fetch(GATEWAY_ENDPOINTS.SESSIONS.ACTIVE, {
      headers: getAuthHeaders()
    });
    return response.json();
  }

  async createSession(data: CreateSessionRequest): Promise<Session> {
    const response = await fetch(GATEWAY_ENDPOINTS.SESSIONS.CREATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
}
```

## Step 5: Update MCP Integration

For MCP tool calls and prompts:

```typescript
import { GATEWAY_ENDPOINTS, getAuthHeaders, SSE_CONFIG } from '../config/gatewayConfig';

export class MCPService {
  async callTool(toolName: string, params: any): Promise<void> {
    // Check if SSE endpoint
    if (SSE_CONFIG.isSSEEndpoint(GATEWAY_ENDPOINTS.MCP.TOOLS_CALL)) {
      // Use EventSource for streaming
      const eventSource = new EventSource(GATEWAY_ENDPOINTS.MCP.TOOLS_CALL, {
        headers: {
          ...getAuthHeaders(),
          'Accept': 'text/event-stream'
        }
      });
      
      eventSource.onmessage = (event) => {
        // Handle streaming response
      };
    } else {
      // Regular request
      const response = await fetch(GATEWAY_ENDPOINTS.MCP.TOOLS_CALL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ tool: toolName, params })
      });
    }
  }
}
```

## Step 6: Update API Config

Update `/src/config/apiConfig.ts`:

```typescript
// Import Gateway config
import { GATEWAY_CONFIG, GATEWAY_ENDPOINTS } from './gatewayConfig';

// Update endpoints to use Gateway
export const API_ENDPOINTS = {
  MAIN: GATEWAY_CONFIG.BASE_URL,
  CHAT: GATEWAY_ENDPOINTS.AGENTS.BASE,
  EXECUTION: GATEWAY_ENDPOINTS.AGENTS.BASE,
  SESSION: GATEWAY_ENDPOINTS.SESSIONS.BASE,
  USER: GATEWAY_ENDPOINTS.ACCOUNTS.BASE,
  // Remove MODEL endpoint as not needed
} as const;

// Update path builders to use Gateway paths
export const buildApiUrl = (endpoint: string, path: string): string => {
  // All paths now go through Gateway
  return `${GATEWAY_CONFIG.BASE_URL}/api/${GATEWAY_CONFIG.API_VERSION}${path}`;
};
```

## Step 7: Environment Variables

Update `.env.local`:

```bash
# Remove individual service URLs
# NEXT_PUBLIC_CHAT_API_URL=http://localhost:8080
# NEXT_PUBLIC_USER_API_URL=http://localhost:9000
# NEXT_PUBLIC_SESSION_API_URL=http://localhost:3000

# Add Gateway URL
NEXT_PUBLIC_GATEWAY_URL=http://localhost:8000

# Authentication (if using Auth0)
NEXT_PUBLIC_AUTH0_DOMAIN=your-domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

## Step 8: Authentication

All authentication is now handled through the Gateway:

```typescript
// Before: Multiple auth methods
const token = await getAuth0Token();
const apiKey = getApiKey();

// After: Unified auth
import { getAuthHeaders, saveAuthToken } from '../config/gatewayConfig';

// On login
const token = await auth0.getAccessTokenSilently();
saveAuthToken(token);

// For all API calls
const headers = getAuthHeaders(); // Automatically includes JWT or API Key
```

## Migration Checklist

- [ ] Update BaseApiService to use Gateway URL
- [ ] Update ChatService to use Agent endpoints through Gateway
- [ ] Update UserService to use Accounts endpoints through Gateway  
- [ ] Update or create SessionService for Gateway
- [ ] Update MCP integration for SSE support
- [ ] Update environment variables
- [ ] Remove direct service URLs from code
- [ ] Test authentication flow through Gateway
- [ ] Test SSE streaming for chat and MCP
- [ ] Update error handling for Gateway responses

## Testing

1. Start Gateway and services:
```bash
cd ~/Documents/Fun/isA_Cloud
make start-all
```

2. Verify services are registered:
```bash
curl http://localhost:8000/api/v1/gateway/services
```

3. Test authentication:
```bash
# Test with JWT token
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/v1/accounts/api/v1/users/me

# Test with API key
curl -H "X-API-Key: YOUR_API_KEY" http://localhost:8000/api/v1/accounts/api/v1/users/me
```

4. Test SSE streaming:
```bash
# Test Agent chat
curl -N -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8000/api/v1/agents/api/chat?message=hello"

# Test MCP tools
curl -N -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: text/event-stream" \
  "http://localhost:8000/api/v1/mcp/mcp/tools/call"
```

## Rollback Plan

If issues occur, you can temporarily use the legacy URL mapper:

```typescript
import { mapLegacyUrl } from '../config/gatewayConfig';

// Convert old URL to Gateway URL
const newUrl = mapLegacyUrl('http://localhost:8080/api/chat');
```

## Support

For issues or questions:
1. Check Gateway health: `http://localhost:8000/health`
2. Check service registration: `http://localhost:8000/api/v1/gateway/services`
3. Review Gateway logs: `docker logs isa_cloud_gateway`