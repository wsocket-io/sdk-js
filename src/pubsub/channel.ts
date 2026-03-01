import type { ClientMessage, MessageMeta, HistoryResult, HistoryOptions, PublishOptions } from '../types.js';
import { Presence } from './presence.js';

export class Channel {
  private listeners = new Map<string, Set<(data: unknown, meta: MessageMeta) => void>>();
  private subscribed = false;
  public readonly presence: Presence;

  constructor(
    public readonly name: string,
    private sendFn: (msg: ClientMessage) => void,
  ) {
    this.presence = new Presence(name, sendFn);
  }

  /** Subscribe to messages on this channel */
  subscribe(callback: (data: unknown, meta: MessageMeta) => void, options?: { rewind?: number }): this {
    if (!this.listeners.has('message')) {
      this.listeners.set('message', new Set());
    }
    this.listeners.get('message')!.add(callback);

    if (!this.subscribed) {
      const msg: ClientMessage = { action: 'subscribe', channel: this.name };
      if (options?.rewind) msg.rewind = options.rewind;
      this.sendFn(msg);
      this.subscribed = true;
    }

    return this;
  }

  /** Publish data to this channel */
  publish(data: unknown, options?: PublishOptions): this {
    const msg: ClientMessage = {
      action: 'publish',
      channel: this.name,
      data,
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    if (options?.persist === false) msg.persist = false;
    this.sendFn(msg);
    return this;
  }

  /** Query message history for this channel */
  history(options?: HistoryOptions): this {
    const msg: ClientMessage = {
      action: 'history',
      channel: this.name,
    };
    if (options?.limit) msg.limit = options.limit;
    if (options?.before) msg.before = options.before;
    if (options?.after) msg.after = options.after;
    if (options?.direction) msg.direction = options.direction;
    this.sendFn(msg);
    return this;
  }

  /** Listen for history query results */
  onHistory(callback: (result: HistoryResult) => void): this {
    if (!this.listeners.has('history')) {
      (this.listeners as any).set('history', new Set<(result: HistoryResult) => void>());
    }
    (this.listeners.get('history') as Set<any>).add(callback);
    return this;
  }

  /** @internal Emit history result to listeners */
  _emitHistory(result: HistoryResult): void {
    const listeners = this.listeners.get('history') as Set<(result: HistoryResult) => void> | undefined;
    if (listeners) {
      for (const cb of listeners) {
        try { cb(result); } catch { /* ignore */ }
      }
    }
  }

  /** Unsubscribe from this channel */
  unsubscribe(): void {
    this.sendFn({ action: 'unsubscribe', channel: this.name });
    this.subscribed = false;
    this.listeners.clear();
  }

  /** @internal Emit a message to listeners */
  _emit(data: unknown, meta: MessageMeta): void {
    const listeners = this.listeners.get('message');
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(data, meta);
        } catch {
          // don't let listener errors break the loop
        }
      }
    }
  }

  /** @internal Mark as needing re-subscribe (after reconnect) */
  _markForResubscribe(): void {
    this.subscribed = false;
  }

  /** @internal Whether this channel has active listeners */
  get _hasListeners(): boolean {
    const listeners = this.listeners.get('message');
    return !!listeners && listeners.size > 0;
  }

  get isSubscribed(): boolean {
    return this.subscribed;
  }
}
