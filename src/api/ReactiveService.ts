/**
 * ReactiveService — client for the isA_Mate /v1/reactive/*
 * capability router (xenoISA/isA_Mate#409 / #429). Surfaces webhook
 * config + event subscription UI in the frontend.
 *
 * TODO: Replace with `import { ReactiveClient } from '@isa/transport'`
 * once xenoISA/isA_App_SDK#313 publishes.
 */

import { GATEWAY_ENDPOINTS } from '../config/gatewayConfig';
import { authTokenStore } from '../stores/authTokenStore';
import type {
  EventSubscription,
  EventSubscriptionInput,
  EventSubscriptionListResponse,
  Webhook,
  WebhookInput,
  WebhookListResponse,
} from './types/reactive';

export class ReactiveService {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = authTokenStore.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async registerWebhook(input: WebhookInput): Promise<Webhook> {
    if (!input.path.startsWith('/')) {
      throw new RangeError('registerWebhook: path must start with "/"');
    }
    if (input.secret.length < 16) {
      throw new RangeError('registerWebhook: secret must be at least 16 characters');
    }
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.REACTIVE.WEBHOOKS, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    if (!resp.ok) throw new Error(`registerWebhook failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async listWebhooks(): Promise<WebhookListResponse> {
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.REACTIVE.WEBHOOKS, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!resp.ok) throw new Error(`listWebhooks failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.REACTIVE.WEBHOOK(webhookId), {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!resp.ok) throw new Error(`getWebhook failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.REACTIVE.WEBHOOK(webhookId), {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!resp.ok && resp.status !== 204) {
      throw new Error(`deleteWebhook failed: ${resp.status} ${resp.statusText}`);
    }
  }

  async subscribe(input: EventSubscriptionInput): Promise<EventSubscription> {
    if (!input.channel || input.channel.trim().length === 0) {
      throw new RangeError('subscribe: channel must be non-empty');
    }
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.REACTIVE.SUBSCRIBE, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(input),
    });
    if (!resp.ok) throw new Error(`subscribe failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async listSubscriptions(): Promise<EventSubscriptionListResponse> {
    const resp = await fetch(GATEWAY_ENDPOINTS.MATE.REACTIVE.SUBSCRIPTIONS, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!resp.ok) throw new Error(`listSubscriptions failed: ${resp.status} ${resp.statusText}`);
    return resp.json();
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const resp = await fetch(
      GATEWAY_ENDPOINTS.MATE.REACTIVE.SUBSCRIPTION(subscriptionId),
      { method: 'DELETE', headers: this.getHeaders() },
    );
    if (!resp.ok && resp.status !== 204) {
      throw new Error(`unsubscribe failed: ${resp.status} ${resp.statusText}`);
    }
  }
}

export const reactiveService = new ReactiveService();
export default reactiveService;
