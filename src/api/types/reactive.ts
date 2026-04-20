/**
 * Types for the isA_Mate /v1/reactive/* capability router
 * (xenoISA/isA_Mate#409 / #429). TODO: import from @isa/transport
 * once xenoISA/isA_App_SDK#313 publishes.
 */

export interface WebhookInput {
  path: string;
  secret: string;
  action_prompt: string;
  filter?: Record<string, unknown>;
  enabled?: boolean;
}

export interface Webhook {
  id: string;
  user_id: string;
  path: string;
  action_prompt: string;
  filter: Record<string, unknown> | null;
  enabled: boolean;
  created_at: string;
}

export interface WebhookListResponse {
  webhooks: Webhook[];
  next_cursor: string | null;
}

export interface EventSubscriptionInput {
  channel: string;
  filter?: Record<string, unknown>;
  delivery_url?: string;
}

export interface EventSubscription {
  id: string;
  user_id: string;
  channel: string;
  filter: Record<string, unknown> | null;
  delivery_url: string | null;
  created_at: string;
}

export interface EventSubscriptionListResponse {
  subscriptions: EventSubscription[];
}
