// ─── Push Notification Client ───────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

// Browser types that may not exist in Node.js
declare const window: any;
declare const navigator: any;
declare const Notification: any;

export interface PushClientOptions {
  /** API base URL (e.g. http://localhost:9001) */
  baseUrl: string;
  /** API key or JWT token for auth */
  token: string;
  /** App ID — optional, server resolves from API key if omitted */
  appId?: string;
}

export interface PushPayload {
  title: string;
  body?: string;
  icon?: string;
  image?: string;
  badge?: string;
  url?: string;
  data?: Record<string, unknown>;
  ttl?: number;
  urgency?: 'very-low' | 'low' | 'normal' | 'high';
}

export interface PushSendResult {
  sent: number;
  results: { subscriptionId: string; memberId: string; platform: string; success: boolean; error?: string }[];
}

/** A single push subscription record */
export interface PushSubscriptionRecord {
  /** Unique subscription identifier */
  subscriptionId: string;
  /** Member the subscription belongs to */
  memberId: string;
  /** Push platform */
  platform: 'web' | 'fcm' | 'apns';
  /** Channels this subscription is enrolled in */
  channels: string[];
  /** Unix timestamp (ms) when the subscription was created */
  createdAt: number;
}

/** Result of {@link PushClient.listSubscriptions} */
export interface PushSubscriptionsResult {
  /** List of matching subscriptions */
  subscriptions: PushSubscriptionRecord[];
  /** Total number of matching subscriptions (may exceed the page) */
  total: number;
}

export class PushClient {
  private baseUrl: string;
  private token: string;
  private appId?: string;

  constructor(options: PushClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
    this.appId = options.appId;
  }

  // ─── Subscribe (Browser) ────────────────────────────────

  /**
   * Subscribe this browser to push notifications.
   * Requests permission, registers service worker, and subscribes.
   *
   * @param channels - Channels to subscribe to (default: ['default'])
   * @param serviceWorkerPath - Path to service worker (default: '/sw.js')
   * @returns The browser PushSubscription, or null if denied/unsupported
   *
   * @example
   * ```ts
   * await client.push.subscribe(['news', 'alerts']);
   * ```
   */
  async subscribe(channels?: string[], serviceWorkerPath = '/sw.js'): Promise<any | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const vapidKey = await this.getVapidKey();
    if (!vapidKey) throw new Error('VAPID public key not available');

    const reg = await (navigator as any).serviceWorker.register(serviceWorkerPath);
    await (navigator as any).serviceWorker.ready;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    await this.register('web', sub, { channels });
    return sub;
  }

  // ─── Send ────────────────────────────────────────────────

  /**
   * Send a push notification to one or more members.
   *
   * @param payload - Notification content
   * @param options - Target: `to` (member ID or array), `channel` filter
   *
   * @example
   * ```ts
   * // Send to one member
   * await client.push.send({ title: 'Hello' }, { to: 'user-123' });
   *
   * // Send to a channel
   * await client.push.send({ title: 'News!' }, { to: 'user-123', channel: 'news' });
   *
   * // Send to multiple members
   * await client.push.send({ title: 'Alert' }, { to: ['user-1', 'user-2'] });
   * ```
   */
  async send(payload: PushPayload, options?: { to?: string | string[]; channel?: string }): Promise<PushSendResult> {
    const body: any = { payload };
    if (options?.channel) body.channel = options.channel;

    if (options?.to) {
      if (Array.isArray(options.to)) {
        body.memberIds = options.to;
      } else {
        body.memberId = options.to;
      }
    }

    return this.api('POST', '/api/push/send', body);
  }

  /**
   * Broadcast a push notification to all subscribers.
   *
   * @param payload - Notification content
   * @param channel - Optional channel filter
   *
   * @example
   * ```ts
   * // Broadcast to everyone
   * await client.push.broadcast({ title: 'Maintenance in 1h' });
   *
   * // Broadcast to a specific channel
   * await client.push.broadcast({ title: 'Breaking!' }, 'news');
   * ```
   */
  async broadcast(payload: PushPayload, channel?: string): Promise<PushSendResult> {
    const body: any = { payload };
    if (channel) body.channel = channel;
    return this.api('POST', '/api/push/broadcast', body);
  }

  // ─── Channels ────────────────────────────────────────────

  /**
   * Add a channel to a member's push subscriptions.
   *
   * @example
   * ```ts
   * await client.push.addChannel('user-123', 'sports');
   * ```
   */
  async addChannel(memberId: string, channel: string): Promise<{ updated: number }> {
    return this.api('POST', '/api/push/channels/add', { memberId, channel });
  }

  /**
   * Remove a channel from a member's push subscriptions.
   *
   * @example
   * ```ts
   * await client.push.removeChannel('user-123', 'sports');
   * ```
   */
  async removeChannel(memberId: string, channel: string): Promise<{ updated: number }> {
    return this.api('POST', '/api/push/channels/remove', { memberId, channel });
  }

  // ─── Registration (low-level) ────────────────────────────

  /**
   * Register a device for push notifications.
   * Prefer `subscribe()` for browser Web Push.
   *
   * @param platform - 'web', 'fcm', or 'apns'
   * @param credential - Web Push subscription object, or device token string
   * @param options - Optional memberId and channels
   *
   * @example
   * ```ts
   * // FCM
   * await client.push.register('fcm', deviceToken, { memberId: 'user-1', channels: ['alerts'] });
   *
   * // APNs
   * await client.push.register('apns', deviceToken, { memberId: 'user-1' });
   * ```
   */
  async register(
    platform: 'web' | 'fcm' | 'apns',
    credential: any,
    options?: { memberId?: string; channels?: string[] },
  ): Promise<string> {
    const body: any = {
      provider: platform,
      memberId: options?.memberId || 'anonymous',
    };

    if (platform === 'web') {
      const json = typeof credential.toJSON === 'function' ? credential.toJSON() : credential;
      body.webPush = { endpoint: json.endpoint, keys: json.keys };
    } else {
      body.deviceToken = credential;
    }

    if (options?.channels) body.channels = options.channels;

    // Collect browser metadata when running in a browser environment
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      body.metadata = {
        language: navigator.language || undefined,
        timezone: typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined,
      };
    }

    const res = await this.api('POST', '/api/push/register', body);
    return res.subscriptionId;
  }

  /**
   * Unregister a member's push subscriptions.
   *
   * @example
   * ```ts
   * await client.push.unregister('user-123');
   * await client.push.unregister('user-123', 'web'); // only web
   * ```
   */
  async unregister(memberId: string, platform?: 'web' | 'fcm' | 'apns'): Promise<number> {
    const res = await this.api('DELETE', '/api/push/unregister', { memberId, platform });
    return res.unregistered;
  }

  /**
   * Delete a specific subscription by its ID.
   *
   * @example
   * ```ts
   * await client.push.deleteSubscription('sub_abc123');
   * ```
   */
  async deleteSubscription(subscriptionId: string): Promise<boolean> {
    const res = await this.api('DELETE', `/api/push/subscriptions/${encodeURIComponent(subscriptionId)}`);
    return res.deleted;
  }

  /**
   * Get the VAPID public key for this app.
   *
   * @returns The VAPID public key string, or `null` if not configured
   */
  async getVapidKey(): Promise<string | null> {
    const qs = this.appId ? `?appId=${this.appId}` : '';
    const res = await this.api('GET', `/api/push/vapid-key${qs}`);
    return res.vapidPublicKey || null;
  }

  /**
   * List push subscriptions, optionally filtered by member and/or platform.
   *
   * @param options - Filter options
   * @param options.memberId - Return only subscriptions for this member
   * @param options.platform - Return only subscriptions for this platform
   * @param options.limit - Maximum number of subscriptions to return
   * @returns Matching subscriptions and total count
   */
  async listSubscriptions(options?: {
    memberId?: string;
    platform?: 'web' | 'fcm' | 'apns';
    limit?: number;
  }): Promise<PushSubscriptionsResult> {
    const params = new URLSearchParams();
    if (options?.memberId) params.set('memberId', options.memberId);
    if (options?.platform) params.set('platform', options.platform);
    if (options?.limit) params.set('limit', String(options.limit));
    const qs = params.toString();
    return this.api('GET', `/api/push/subscriptions${qs ? '?' + qs : ''}`);
  }

  // ─── Internal ────────────────────────────────────────────

  private async api(method: string, path: string, body?: unknown): Promise<any> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Push API error ${res.status}: ${text}`);
    }
    return res.json();
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
