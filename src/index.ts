import WebSocket from 'ws';
import type {
  ConnectionState, WSocketOptions, ClientMessage, ServerMessage,
  MessageMeta, PresenceMember, HistoryResult, EventCallback,
} from './types.js';
import { Channel } from './pubsub/channel.js';
import { PubSubNamespace } from './pubsub/index.js';
import { PushClient, type PushClientOptions } from './push/index.js';

// ─── Re-exports ─────────────────────────────────────────────

export type {
  ConnectionState, WSocketOptions, ChannelSubscription,
  MessageMeta, PresenceMember, HistoryMessage, HistoryResult,
  HistoryOptions, PublishOptions, EventCallback,
  ClientMessage, ServerMessage,
} from './types.js';
export { Channel } from './pubsub/channel.js';
export { Presence } from './pubsub/presence.js';
export { PubSubNamespace } from './pubsub/index.js';
export { PushClient, type PushClientOptions, type PushPayload, type PushSendResult } from './push/index.js';

// ─── wSocket Client ────────────────────────────────────────

export class WSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private apiKey: string;
  private options: Required<Omit<WSocketOptions, 'token'>> & Pick<WSocketOptions, 'token'>;
  private state: ConnectionState = 'disconnected';
  private channels = new Map<string, Channel>();
  private events = new Map<string, Set<EventCallback>>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private lastMessageTimestamp = 0;
  private resumeToken: string | null = null;

  /** Pub/Sub namespace — `client.pubsub.channel('name')` */
  public readonly pubsub: PubSubNamespace;

  /** Push client — lazily created, auto-configured from connection info */
  private _push: PushClient | null = null;

  constructor(url: string, apiKey: string, options: WSocketOptions = {}) {
    this.url = url;
    this.apiKey = apiKey;
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      reconnectDelay: options.reconnectDelay ?? 1000,
      token: options.token,
      recover: options.recover ?? true,
    };

    // Pubsub namespace delegates to channel()
    this.pubsub = new PubSubNamespace((name) => this.channel(name));
  }

  // ─── Push ─────────────────────────────────────────────────

  /**
   * Push notifications — auto-configured, ready to use.
   *
   * @example
   * ```ts
   * // Subscribe browser to channels
   * await client.push.subscribe(['news', 'alerts']);
   *
   * // Send to a member
   * await client.push.send({ title: 'Hello' }, { to: 'user-1', channel: 'news' });
   *
   * // Broadcast to all
   * await client.push.broadcast({ title: 'Hi all' });
   * ```
   */
  get push(): PushClient {
    if (!this._push) {
      const httpUrl = this.url.replace(/^ws(s?)/, 'http$1');
      this._push = new PushClient({ baseUrl: httpUrl, token: this.apiKey });
    }
    return this._push;
  }

  /**
   * Configure push with custom options (overrides auto-config).
   * Only needed if your push API uses a different URL or token.
   */
  configurePush(options: PushClientOptions): PushClient {
    this._push = new PushClient(options);
    return this._push;
  }

  // ─── Connection ──────────────────────────────────────────

  /** Connect to the wSocket server */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === 'connected') {
        resolve();
        return;
      }

      this.setState('connecting');
      const wsUrl = this.options.token
        ? `${this.url}?token=${encodeURIComponent(this.options.token)}`
        : `${this.url}?key=${encodeURIComponent(this.apiKey)}`;

      try {
        this.ws = new WebSocket(wsUrl);
      } catch (err) {
        this.setState('disconnected');
        reject(err);
        return;
      }

      this.ws.on('open', () => {
        this.setState('connected');
        this.reconnectAttempts = 0;
        this.startPing();
        this.resubscribeAll();
        resolve();
      });

      this.ws.on('message', (raw: WebSocket.Data) => {
        this.handleMessage(raw.toString());
      });

      this.ws.on('close', (code: number) => {
        this.stopPing();
        this.emit('disconnected', code);

        if (this.state !== 'disconnected' && this.options.autoReconnect) {
          this.scheduleReconnect();
        }
      });

      this.ws.on('error', (err: Error) => {
        this.emit('error', err);
        if (this.state === 'connecting') {
          reject(err);
        }
      });
    });
  }

  /** Disconnect from the server */
  disconnect(): void {
    this.setState('disconnected');
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // ─── Channels ────────────────────────────────────────────

  /**
   * Get or create a channel.
   * @deprecated Use `client.pubsub.channel(name)` for new code.
   */
  channel(name: string): Channel {
    if (!this.channels.has(name)) {
      this.channels.set(name, new Channel(name, (msg) => this.send(msg)));
    }
    return this.channels.get(name)!;
  }

  // ─── Events ──────────────────────────────────────────────

  /** Listen for client events: 'connected', 'disconnected', 'error', 'state' */
  on(event: string, callback: EventCallback): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
    return this;
  }

  /** Remove an event listener */
  off(event: string, callback: EventCallback): this {
    this.events.get(event)?.delete(callback);
    return this;
  }

  /** Current connection state */
  get connectionState(): ConnectionState {
    return this.state;
  }

  // ─── Internal ────────────────────────────────────────────

  private send(msg: ClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private handleMessage(raw: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.action) {
      case 'message': {
        if (msg.channel) {
          const ch = this.channels.get(msg.channel);
          if (ch) {
            const ts = msg.timestamp || Date.now();
            if (ts > this.lastMessageTimestamp) {
              this.lastMessageTimestamp = ts;
            }
            ch._emit(msg.data, {
              id: msg.id || '',
              channel: msg.channel,
              timestamp: ts,
            });
          }
        }
        break;
      }
      case 'subscribed':
        this.emit('subscribed', msg.channel);
        break;
      case 'unsubscribed':
        this.emit('unsubscribed', msg.channel);
        break;
      case 'ack':
        if (msg.id === 'resume' && (msg as any).data?.resumeToken) {
          this.resumeToken = (msg as any).data.resumeToken;
        }
        this.emit('ack', msg.id, msg.channel);
        break;
      case 'error':
        this.emit('error', new Error(msg.error || 'Unknown error'));
        break;
      case 'pong':
        break;
      case 'presence.enter': {
        if (msg.channel) {
          const ch = this.channels.get(msg.channel);
          if (ch) ch.presence._emitEnter(msg.data as PresenceMember);
        }
        break;
      }
      case 'presence.leave': {
        if (msg.channel) {
          const ch = this.channels.get(msg.channel);
          if (ch) ch.presence._emitLeave(msg.data as PresenceMember);
        }
        break;
      }
      case 'presence.update': {
        if (msg.channel) {
          const ch = this.channels.get(msg.channel);
          if (ch) ch.presence._emitUpdate(msg.data as PresenceMember);
        }
        break;
      }
      case 'presence.members': {
        if (msg.channel) {
          const ch = this.channels.get(msg.channel);
          if (ch) ch.presence._emitMembers(msg.data as PresenceMember[]);
        }
        break;
      }
      case 'history': {
        if (msg.channel) {
          const ch = this.channels.get(msg.channel);
          if (ch) ch._emitHistory(msg.data as HistoryResult);
        }
        break;
      }
    }
  }

  private setState(state: ConnectionState): void {
    const prev = this.state;
    this.state = state;
    if (prev !== state) {
      this.emit('state', state, prev);
      if (state === 'connected') this.emit('connected');
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    const listeners = this.events.get(event);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(...args);
        } catch {
          // don't let listener errors propagate
        }
      }
    }
  }

  private resubscribeAll(): void {
    if (this.options.recover && this.lastMessageTimestamp > 0) {
      const channelNames: string[] = [];
      for (const [, ch] of this.channels) {
        if (ch._hasListeners) {
          channelNames.push(ch.name);
          ch._markForResubscribe();
        }
      }
      if (channelNames.length > 0) {
        const token = this.resumeToken || btoa(JSON.stringify({
          channels: channelNames,
          lastTs: this.lastMessageTimestamp,
        }));
        this.send({ action: 'resume', resumeToken: token } as any);
        return;
      }
    }

    for (const [, ch] of this.channels) {
      if (ch._hasListeners) {
        ch._markForResubscribe();
        this.send({ action: 'subscribe', channel: ch.name });
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.setState('disconnected');
      this.emit('error', new Error('Max reconnect attempts reached'));
      return;
    }

    this.setState('reconnecting');
    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // will retry via close handler
      });
    }, delay);
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ action: 'ping' });
    }, 30_000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }
}

// ─── Factory ────────────────────────────────────────────────

/**
 * Create a new wSocket client.
 *
 * @example
 * ```ts
 * import { createClient } from '@wsocket/sdk';
 *
 * const client = createClient('ws://localhost:9001', 'your-api-key');
 * await client.connect();
 *
 * // Pub/Sub (backward compatible)
 * const chat = client.channel('chat');
 * chat.subscribe((data, meta) => console.log('Received:', data));
 * chat.publish({ text: 'Hello!' });
 *
 * // New namespaced API
 * client.pubsub.channel('chat').publish({ text: 'Hello!' });
 *
 * // Push notifications
 * client.configurePush({
 *   baseUrl: 'http://localhost:9001',
 *   token: 'your-api-key',
 *   appId: 'your-app-id',
 * });
 * await client.push!.sendToMember('user-1', { title: 'New message!' });
 * ```
 */
export function createClient(url: string, apiKey: string, options?: WSocketOptions): WSocket {
  return new WSocket(url, apiKey, options);
}
