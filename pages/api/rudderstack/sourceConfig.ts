import { NextApiRequest, NextApiResponse } from 'next';
import { createLogger } from '@/utils/logger';

const log = createLogger('RudderstackSourceConfig');

/**
 * RudderStack Source Configuration API
 * 
 * This endpoint serves the source configuration for the RudderStack JavaScript SDK
 * when running in self-hosted mode. The SDK automatically appends /sourceConfig
 * to the configUrl to fetch this configuration.
 */

interface SourceConfig {
  source: {
    id: string;
    name: string;
    writeKey: string;
    config: Record<string, any>;
    enabled: boolean;
  };
  destinations: Array<{
    id: string;
    name: string;
    destinationDefinition: {
      id: string;
      name: string;
    };
    config: Record<string, any>;
    enabled: boolean;
  }>;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract writeKey from query parameters
    const { writeKey } = req.query;
    
    if (!writeKey || writeKey !== 'your-dev-write-key') {
      return res.status(400).json({ error: 'Invalid write key' });
    }

    // Source configuration based on our workspaceConfig.json
    const sourceConfig: SourceConfig = {
      source: {
        id: "1pYpnSEfaRJmdyfF4tuvJBw5gu8",
        name: "JavaScript Source",
        writeKey: "your-dev-write-key",
        config: {},
        enabled: true
      },
      destinations: [
        {
          id: "1pYpnSEfaRJmdyfF4tuvJBw5gu9",
          name: "Webhook Destination",
          destinationDefinition: {
            id: "1aL6wZM906ftQHKnADhWStPKh2h",
            name: "WEBHOOK"
          },
          config: {
            webhookUrl: "http://localhost:5173/api/analytics/webhook",
            webhookMethod: "POST",
            headers: {}
          },
          enabled: true
        }
      ]
    };

    res.status(200).json(sourceConfig);
  } catch (error) {
    log.error('Error serving source config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}