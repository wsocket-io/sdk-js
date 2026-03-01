// ─── Shared Types ───────────────────────────────────────────

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface WSocketOptions {
  /** Auto reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnect attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Use JWT token instead of API key for auth */
  token?: string;
  /** Enable connection state recovery — resend missed messages on reconnect (default: true) */
  recover?: boolean;
}

export interface ChannelSubscription {
  channel: string;
  callback: (data: unknown, meta: MessageMeta) => void;
}

export interface MessageMeta {
  id: string;
  channel: string;
  timestamp: number;
}

export type EventCallback = (...args: unknown[]) => void;

// ─── Protocol (mirrors server) ──────────────────────────────

export interface ClientMessage {
  action: 'subscribe' | 'unsubscribe' | 'publish' | 'ping'
    | 'presence.enter' | 'presence.leave' | 'presence.update' | 'presence.get'
    | 'history';
  channel?: string;
  data?: unknown;
  id?: string;
  persist?: boolean;
  rewind?: number;
  limit?: number;
  before?: number;
  after?: number;
  direction?: 'forward' | 'backward';
}

export interface ServerMessage {
  action: 'message' | 'subscribed' | 'unsubscribed' | 'error' | 'pong' | 'ack'
    | 'presence.enter' | 'presence.leave' | 'presence.update' | 'presence.members'
    | 'history';
  channel?: string;
  data?: unknown;
  id?: string;
  error?: string;
  timestamp?: number;
}

export interface PresenceMember {
  clientId: string;
  data?: Record<string, unknown>;
  joinedAt: number;
}

export interface HistoryMessage {
  id: string;
  channel: string;
  data: unknown;
  publisherId: string;
  timestamp: number;
  sequence: number;
}

export interface HistoryResult {
  channel: string;
  messages: HistoryMessage[];
  hasMore: boolean;
}

export interface HistoryOptions {
  limit?: number;
  before?: number;
  after?: number;
  direction?: 'forward' | 'backward';
}

export interface PublishOptions {
  /** Set to false to skip persisting to history (ephemeral message) */
  persist?: boolean;
}
