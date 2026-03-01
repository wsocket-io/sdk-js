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
  /** App ID to register push for */
  appId: string;
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

export class PushClient {
  private baseUrl: string;
  private token: string;
  private appId: string;

  constructor(options: PushClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.token = options.token;
    this.appId = options.appId;
  }

  /** Get the VAPID public key for Web Push subscription */
  async getVapidKey(): Promise<string | null> {
    const res = await this.api('GET', `/api/admin/apps/${this.appId}/push/config`);
    return res.vapidPublicKey || null;
  }

  /** Register a Web Push subscription (browser) */
  async registerWebPush(subscription: any, memberId?: string): Promise<string> {
    const json = typeof subscription.toJSON === 'function' ? subscription.toJSON() : subscription;
    const res = await this.api('POST', `/api/push/register`, {
      provider: 'web',
      memberId: memberId || 'anonymous',
      webPush: {
        endpoint: json.endpoint,
        keys: json.keys,
      },
    });
    return res.subscriptionId;
  }

  /** Register an FCM device token (Android) */
  async registerFCM(deviceToken: string, memberId?: string): Promise<string> {
    const res = await this.api('POST', `/api/push/register`, {
      provider: 'fcm',
      memberId: memberId || 'anonymous',
      deviceToken,
    });
    return res.subscriptionId;
  }

  /** Register an APNs device token (iOS) */
  async registerAPNs(deviceToken: string, memberId?: string): Promise<string> {
    const res = await this.api('POST', `/api/push/register`, {
      provider: 'apns',
      memberId: memberId || 'anonymous',
      deviceToken,
    });
    return res.subscriptionId;
  }

  /** Unregister push notifications */
  async unregister(memberId: string, platform?: 'web' | 'fcm' | 'apns'): Promise<number> {
    const res = await this.api('DELETE', `/api/push/unregister`, {
      memberId,
      platform,
    });
    return res.unregistered;
  }

  /** Send a push notification to a specific member */
  async sendToMember(memberId: string, payload: PushPayload): Promise<unknown> {
    return this.api('POST', `/api/push/send`, {
      memberId,
      payload,
    });
  }

  /** Send a push notification to multiple members */
  async sendToMembers(memberIds: string[], payload: PushPayload): Promise<unknown> {
    return this.api('POST', `/api/push/send`, {
      memberIds,
      payload,
    });
  }

  /** Broadcast a push notification to all subscribers of the app */
  async broadcast(payload: PushPayload): Promise<unknown> {
    return this.api('POST', `/api/push/broadcast`, {
      payload,
    });
  }

  /** List push subscriptions for the app */
  async listSubscriptions(options?: {
    memberId?: string;
    platform?: 'web' | 'fcm' | 'apns';
    limit?: number;
  }): Promise<unknown> {
    const params = new URLSearchParams();
    if (options?.memberId) params.set('memberId', options.memberId);
    if (options?.platform) params.set('platform', options.platform);
    if (options?.limit) params.set('limit', String(options.limit));
    const qs = params.toString();
    return this.api('GET', `/api/push/subscriptions${qs ? '?' + qs : ''}`);
  }

  /**
   * Request browser permission and subscribe to Web Push.
   * Returns the PushSubscription or null if denied/unsupported.
   * Only works in browser environments.
   */
  async subscribeBrowser(serviceWorkerPath = '/sw.js'): Promise<any | null> {
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

    await this.registerWebPush(sub);
    return sub;
  }

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
