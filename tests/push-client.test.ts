import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PushClient } from '../src/push/index.js';

// ─── Mock fetch ─────────────────────────────────────────────

function mockFetch(response: unknown, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
}

describe('PushClient', () => {
  let client: PushClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new PushClient({ baseUrl: 'http://localhost:9001', token: 'test-token', appId: 'app-1' });
    fetchMock = mockFetch({});
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ─── Constructor ────────────────────────────────────────────

  describe('constructor', () => {
    it('strips trailing slash from baseUrl', () => {
      const c = new PushClient({ baseUrl: 'http://example.com/', token: 'tok' });
      expect(c).toBeInstanceOf(PushClient);
    });

    it('accepts options without appId', () => {
      const c = new PushClient({ baseUrl: 'http://example.com', token: 'tok' });
      expect(c).toBeInstanceOf(PushClient);
    });
  });

  // ─── getVapidKey() ──────────────────────────────────────────

  describe('getVapidKey()', () => {
    it('calls GET /api/push/vapid-key with appId query param', async () => {
      fetchMock = mockFetch({ vapidPublicKey: 'key-abc' });
      vi.stubGlobal('fetch', fetchMock);

      const key = await client.getVapidKey();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:9001/api/push/vapid-key?appId=app-1',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(key).toBe('key-abc');
    });

    it('returns null when vapidPublicKey not present', async () => {
      fetchMock = mockFetch({});
      vi.stubGlobal('fetch', fetchMock);

      const key = await client.getVapidKey();
      expect(key).toBeNull();
    });

    it('omits appId query param when not configured', async () => {
      const c = new PushClient({ baseUrl: 'http://localhost:9001', token: 'tok' });
      fetchMock = mockFetch({ vapidPublicKey: 'key-xyz' });
      vi.stubGlobal('fetch', fetchMock);

      await c.getVapidKey();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:9001/api/push/vapid-key',
        expect.anything(),
      );
    });
  });

  // ─── register() ─────────────────────────────────────────────

  describe('register()', () => {
    it('registers a web push subscription', async () => {
      fetchMock = mockFetch({ subscriptionId: 'sub-1' });
      vi.stubGlobal('fetch', fetchMock);

      const credential = {
        toJSON: () => ({ endpoint: 'https://push.example.com/sub', keys: { p256dh: 'k1', auth: 'k2' } }),
      };
      const id = await client.register('web', credential, { memberId: 'user-1', channels: ['news'] });

      expect(id).toBe('sub-1');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:9001/api/push/register',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"provider":"web"'),
        }),
      );
    });

    it('registers an FCM token', async () => {
      fetchMock = mockFetch({ subscriptionId: 'sub-fcm' });
      vi.stubGlobal('fetch', fetchMock);

      const id = await client.register('fcm', 'device-token-xyz', { memberId: 'user-2' });

      expect(id).toBe('sub-fcm');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.provider).toBe('fcm');
      expect(body.deviceToken).toBe('device-token-xyz');
    });

    it('registers an APNs token', async () => {
      fetchMock = mockFetch({ subscriptionId: 'sub-apns' });
      vi.stubGlobal('fetch', fetchMock);

      const id = await client.register('apns', 'apns-device-token', { memberId: 'user-3' });

      expect(id).toBe('sub-apns');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.provider).toBe('apns');
      expect(body.deviceToken).toBe('apns-device-token');
    });

    it('uses anonymous memberId when not provided', async () => {
      fetchMock = mockFetch({ subscriptionId: 'sub-anon' });
      vi.stubGlobal('fetch', fetchMock);

      await client.register('fcm', 'token', {});
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.memberId).toBe('anonymous');
    });

    it('handles web credential without toJSON method', async () => {
      fetchMock = mockFetch({ subscriptionId: 'sub-plain' });
      vi.stubGlobal('fetch', fetchMock);

      const credential = { endpoint: 'https://push.example.com/sub', keys: { p256dh: 'k', auth: 'a' } };
      const id = await client.register('web', credential, { memberId: 'u1' });
      expect(id).toBe('sub-plain');
    });

    it('includes channels in request body when provided', async () => {
      fetchMock = mockFetch({ subscriptionId: 'sub-ch' });
      vi.stubGlobal('fetch', fetchMock);

      await client.register('fcm', 'tok', { channels: ['alerts', 'sports'] });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.channels).toEqual(['alerts', 'sports']);
    });
  });

  // ─── unregister() ───────────────────────────────────────────

  describe('unregister()', () => {
    it('calls DELETE /api/push/unregister', async () => {
      fetchMock = mockFetch({ unregistered: 2 });
      vi.stubGlobal('fetch', fetchMock);

      const count = await client.unregister('user-1');

      expect(count).toBe(2);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:9001/api/push/unregister',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('includes platform filter when provided', async () => {
      fetchMock = mockFetch({ unregistered: 1 });
      vi.stubGlobal('fetch', fetchMock);

      await client.unregister('user-1', 'web');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.platform).toBe('web');
    });
  });

  // ─── deleteSubscription() ───────────────────────────────────

  describe('deleteSubscription()', () => {
    it('calls DELETE /api/push/subscriptions/:id', async () => {
      fetchMock = mockFetch({ deleted: true });
      vi.stubGlobal('fetch', fetchMock);

      const result = await client.deleteSubscription('sub-abc');

      expect(result).toBe(true);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:9001/api/push/subscriptions/sub-abc',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });

    it('URL-encodes the subscription ID', async () => {
      fetchMock = mockFetch({ deleted: true });
      vi.stubGlobal('fetch', fetchMock);

      await client.deleteSubscription('sub/with/slashes');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:9001/api/push/subscriptions/sub%2Fwith%2Fslashes',
        expect.anything(),
      );
    });
  });

  // ─── send() ─────────────────────────────────────────────────

  describe('send()', () => {
    it('sends to a single member', async () => {
      fetchMock = mockFetch({ sent: 1, results: [] });
      vi.stubGlobal('fetch', fetchMock);

      await client.send({ title: 'Hello' }, { to: 'user-1' });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.memberId).toBe('user-1');
      expect(body.payload).toEqual({ title: 'Hello' });
    });

    it('sends to multiple members', async () => {
      fetchMock = mockFetch({ sent: 2, results: [] });
      vi.stubGlobal('fetch', fetchMock);

      await client.send({ title: 'Alert' }, { to: ['user-1', 'user-2'] });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.memberIds).toEqual(['user-1', 'user-2']);
    });

    it('includes channel filter when provided', async () => {
      fetchMock = mockFetch({ sent: 1, results: [] });
      vi.stubGlobal('fetch', fetchMock);

      await client.send({ title: 'News' }, { to: 'user-1', channel: 'news' });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.channel).toBe('news');
    });

    it('sends without to option', async () => {
      fetchMock = mockFetch({ sent: 0, results: [] });
      vi.stubGlobal('fetch', fetchMock);

      await client.send({ title: 'Test' });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.memberId).toBeUndefined();
      expect(body.memberIds).toBeUndefined();
    });
  });

  // ─── broadcast() ────────────────────────────────────────────

  describe('broadcast()', () => {
    it('calls POST /api/push/broadcast', async () => {
      fetchMock = mockFetch({ sent: 10, results: [] });
      vi.stubGlobal('fetch', fetchMock);

      const result = await client.broadcast({ title: 'Maintenance' });

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:9001/api/push/broadcast',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.sent).toBe(10);
    });

    it('includes channel when provided', async () => {
      fetchMock = mockFetch({ sent: 5, results: [] });
      vi.stubGlobal('fetch', fetchMock);

      await client.broadcast({ title: 'Breaking' }, 'news');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.channel).toBe('news');
    });

    it('omits channel when not provided', async () => {
      fetchMock = mockFetch({ sent: 5, results: [] });
      vi.stubGlobal('fetch', fetchMock);

      await client.broadcast({ title: 'All' });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.channel).toBeUndefined();
    });
  });

  // ─── addChannel() ───────────────────────────────────────────

  describe('addChannel()', () => {
    it('calls POST /api/push/channels/add', async () => {
      fetchMock = mockFetch({ updated: 1 });
      vi.stubGlobal('fetch', fetchMock);

      const result = await client.addChannel('user-1', 'sports');

      expect(result.updated).toBe(1);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.memberId).toBe('user-1');
      expect(body.channel).toBe('sports');
    });
  });

  // ─── removeChannel() ────────────────────────────────────────

  describe('removeChannel()', () => {
    it('calls POST /api/push/channels/remove', async () => {
      fetchMock = mockFetch({ updated: 1 });
      vi.stubGlobal('fetch', fetchMock);

      const result = await client.removeChannel('user-1', 'sports');

      expect(result.updated).toBe(1);
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:9001/api/push/channels/remove',
        expect.anything(),
      );
    });
  });

  // ─── listSubscriptions() ────────────────────────────────────

  describe('listSubscriptions()', () => {
    it('calls GET /api/push/subscriptions', async () => {
      fetchMock = mockFetch({ subscriptions: [], total: 0 });
      vi.stubGlobal('fetch', fetchMock);

      const result = await client.listSubscriptions();

      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:9001/api/push/subscriptions',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result.total).toBe(0);
    });

    it('includes memberId filter', async () => {
      fetchMock = mockFetch({ subscriptions: [], total: 0 });
      vi.stubGlobal('fetch', fetchMock);

      await client.listSubscriptions({ memberId: 'user-1' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('memberId=user-1'),
        expect.anything(),
      );
    });

    it('includes platform filter', async () => {
      fetchMock = mockFetch({ subscriptions: [], total: 0 });
      vi.stubGlobal('fetch', fetchMock);

      await client.listSubscriptions({ platform: 'fcm' });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('platform=fcm'),
        expect.anything(),
      );
    });

    it('includes limit filter', async () => {
      fetchMock = mockFetch({ subscriptions: [], total: 0 });
      vi.stubGlobal('fetch', fetchMock);

      await client.listSubscriptions({ limit: 25 });
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('limit=25'),
        expect.anything(),
      );
    });

    it('includes all filters combined', async () => {
      fetchMock = mockFetch({ subscriptions: [], total: 0 });
      vi.stubGlobal('fetch', fetchMock);

      await client.listSubscriptions({ memberId: 'u1', platform: 'web', limit: 10 });
      const url: string = fetchMock.mock.calls[0][0];
      expect(url).toContain('memberId=u1');
      expect(url).toContain('platform=web');
      expect(url).toContain('limit=10');
    });
  });

  // ─── Authorization header ────────────────────────────────────

  describe('authorization header', () => {
    it('sends Bearer token in Authorization header', async () => {
      fetchMock = mockFetch({ subscriptions: [], total: 0 });
      vi.stubGlobal('fetch', fetchMock);

      await client.listSubscriptions();
      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer test-token');
    });
  });

  // ─── Error handling ──────────────────────────────────────────

  describe('error handling', () => {
    it('throws on non-ok response', async () => {
      fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(client.listSubscriptions()).rejects.toThrow('Push API error 401: Unauthorized');
    });

    it('throws on 500 server error', async () => {
      fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
        json: () => Promise.resolve({}),
      });
      vi.stubGlobal('fetch', fetchMock);

      await expect(client.broadcast({ title: 'Test' })).rejects.toThrow('Push API error 500');
    });
  });

  // ─── subscribe() (browser) ──────────────────────────────────

  describe('subscribe() - browser guard', () => {
    it('returns null in Node.js (no window)', async () => {
      const result = await client.subscribe(['news']);
      expect(result).toBeNull();
    });
  });
});
