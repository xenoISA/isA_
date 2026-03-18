/**
 * Runtime env accessors for required public variables.
 * Avoid hardcoded service URLs in application code.
 */

import { createLogger } from '../utils/logger';
const log = createLogger('RuntimeEnv');

const DEFAULT_GATEWAY_URL = 'http://localhost:9080';

export const getRequiredPublicEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const getGatewayUrl = (): string => {
  const value = process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV !== 'production') {
    if (typeof console !== 'undefined') {
      log.warn(
        `Missing NEXT_PUBLIC_GATEWAY_URL, falling back to ${DEFAULT_GATEWAY_URL} for local development.`
      );
    }
    return DEFAULT_GATEWAY_URL;
  }

  throw new Error('Missing required environment variable: NEXT_PUBLIC_GATEWAY_URL');
};

/**
 * Chat backend selector: 'mate' uses isA_Mate, 'agent' uses isA_Agent (default).
 * Set NEXT_PUBLIC_CHAT_BACKEND=mate to enable Mate integration.
 */
export const getChatBackend = (): 'mate' | 'agent' => {
  const value = process.env.NEXT_PUBLIC_CHAT_BACKEND;
  return value === 'mate' ? 'mate' : 'agent';
};
