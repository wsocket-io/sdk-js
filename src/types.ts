// ─── Shared Types ───────────────────────────────────────────

/** Current state of the WebSocket connection */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/** Options passed to the {@link WSocket} constructor */
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

/** Represents a channel subscription with its callback */
export interface ChannelSubscription {
  /** Name of the channel */
  channel: string;
  /** Message handler callback */
  callback: (data: unknown, meta: MessageMeta) => void;
}

/** Metadata attached to every received message */
export interface MessageMeta {
  /** Unique message ID */
  id: string;
  /** Channel the message was published to */
  channel: string;
  /** Unix timestamp (ms) when the message was published */
  timestamp: number;
}

/** Generic event listener callback */
export type EventCallback = (...args: unknown[]) => void;

// ─── Protocol (mirrors server) ──────────────────────────────

/** Message sent from client to server */
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

/** Message received from the server */
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

/** A member currently tracked in a channel's presence set */
export interface PresenceMember {
  /** Unique client identifier */
  clientId: string;
  /** Optional custom state data for this member */
  data?: Record<string, unknown>;
  /** Unix timestamp (ms) when the member joined */
  joinedAt: number;
}

/** A single message retrieved from channel history */
export interface HistoryMessage {
  /** Unique message ID */
  id: string;
  /** Channel the message was published to */
  channel: string;
  /** Message payload */
  data: unknown;
  /** ID of the client that published this message */
  publisherId: string;
  /** Unix timestamp (ms) when the message was published */
  timestamp: number;
  /** Monotonically increasing sequence number within the channel */
  sequence: number;
}

/** Result of a history query */
export interface HistoryResult {
  /** Channel the history was retrieved from */
  channel: string;
  /** List of messages, ordered according to the query direction */
  messages: HistoryMessage[];
  /** Whether more messages are available beyond this page */
  hasMore: boolean;
}

/** Options for a history query */
export interface HistoryOptions {
  /** Maximum number of messages to return */
  limit?: number;
  /** Return messages published before this Unix timestamp (ms) */
  before?: number;
  /** Return messages published after this Unix timestamp (ms) */
  after?: number;
  /** Iteration direction (default: 'backward') */
  direction?: 'forward' | 'backward';
}

/** Options when publishing a message */
export interface PublishOptions {
  /** Set to false to skip persisting to history (ephemeral message) */
  persist?: boolean;
}
