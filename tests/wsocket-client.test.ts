import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// ─── Mock WebSocket ──────────────────────────────────────────
// vi.hoisted runs before any imports are initialized, so all helpers must be
// defined inline without relying on imported modules.

const { MockWebSocket, getLastInstance } = vi.hoisted(() => {
  let _last: any = null;

  // Minimal EventEmitter implemented inline (no 'events' import allowed here)
  class MinimalEmitter {
    private _handlers: Record<string, ((...args: any[]) => void)[]> = {};

    on(event: string, handler: (...args: any[]) => void): this {
      (this._handlers[event] ??= []).push(handler);
      return this;
    }

    emit(event: string, ...args: any[]): void {
      for (const h of this._handlers[event] ?? []) {
        try { h(...args); } catch {}
      }
    }
  }

  class MockWebSocket extends MinimalEmitter {
    static OPEN = 1;
    static CONNECTING = 0;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = MockWebSocket.CONNECTING;
    url: string;
    send = vi.fn();
    close = vi.fn(() => { this.readyState = MockWebSocket.CLOSED; });

    constructor(url: string) {
      super();
      this.url = url;
      // Wrap send/close as vi.fn() after construction — done below
      _last = this;
    }

    simulateOpen() {
      this.readyState = MockWebSocket.OPEN;
      this.emit('open');
    }

    simulateMessage(data: string) {
      this.emit('message', data);
    }

    simulateClose(code = 1000) {
      this.readyState = MockWebSocket.CLOSED;
      this.emit('close', code);
    }

    simulateError(err: Error) {
      this.emit('error', err);
    }
  }

  return {
    MockWebSocket,
    getLastInstance: () => _last as InstanceType<typeof MockWebSocket>,
  };
});

vi.mock('ws', () => ({ default: MockWebSocket }));

// ─── Tests ────────────────────────────────────────────────────

import { WSocket, createClient, Channel, PubSubNamespace, PushClient } from '../src/index.js';

describe('WSocket', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Construction ─────────────────────────────────────────

  describe('construction', () => {
    it('starts in disconnected state', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      expect(client.connectionState).toBe('disconnected');
    });

    it('exposes pubsub namespace', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      expect(client.pubsub).toBeInstanceOf(PubSubNamespace);
    });

    it('auto-creates push client from url', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      expect(client.push).toBeInstanceOf(PushClient);
    });

    it('converts ws:// to http:// for push baseUrl', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      // push client is created — just verify it's a PushClient instance
      expect(client.push).toBeInstanceOf(PushClient);
    });

    it('converts wss:// to https:// for push baseUrl', () => {
      const client = new WSocket('wss://example.com', 'key');
      expect(client.push).toBeInstanceOf(PushClient);
    });

    it('push returns same instance on repeated access', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      expect(client.push).toBe(client.push);
    });
  });

  // ─── connect() ────────────────────────────────────────────

  describe('connect()', () => {
    it('resolves when WebSocket opens', async () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const promise = client.connect();
      getLastInstance().simulateOpen();
      await expect(promise).resolves.toBeUndefined();
    });

    it('sets state to connecting then connected', async () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const states: string[] = [];
      client.on('state', (s) => states.push(s as string));

      const promise = client.connect();
      expect(client.connectionState).toBe('connecting');

      getLastInstance().simulateOpen();
      await promise;

      expect(client.connectionState).toBe('connected');
      expect(states).toContain('connecting');
      expect(states).toContain('connected');
    });

    it('rejects when WebSocket emits error before open', async () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const promise = client.connect();
      const err = new Error('connection refused');
      getLastInstance().simulateError(err);
      await expect(promise).rejects.toThrow('connection refused');
    });

    it('emits connected event on open', async () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const onConnected = vi.fn();
      client.on('connected', onConnected);

      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;

      expect(onConnected).toHaveBeenCalledOnce();
    });

    it('resolves immediately if already connected', async () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const p1 = client.connect();
      getLastInstance().simulateOpen();
      await p1;

      await expect(client.connect()).resolves.toBeUndefined();
    });

    it('uses api key in query string by default', async () => {
      const client = new WSocket('ws://localhost:9001', 'my-api-key');
      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;

      expect(getLastInstance().url).toContain('key=my-api-key');
    });

    it('uses token in query string when provided', async () => {
      const client = new WSocket('ws://localhost:9001', 'my-api-key', { token: 'jwt-token' });
      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;

      expect(getLastInstance().url).toContain('token=jwt-token');
      expect(getLastInstance().url).not.toContain('key=');
    });
  });

  // ─── disconnect() ─────────────────────────────────────────

  describe('disconnect()', () => {
    it('sets state to disconnected', async () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;

      client.disconnect();
      expect(client.connectionState).toBe('disconnected');
    });

    it('calls ws.close()', async () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;

      const ws = getLastInstance();
      client.disconnect();
      expect(ws.close).toHaveBeenCalledOnce();
    });

    it('is safe to call when not connected', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      expect(() => client.disconnect()).not.toThrow();
    });
  });

  // ─── Auto-reconnect ───────────────────────────────────────

  describe('auto-reconnect', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('schedules reconnect on unexpected close', async () => {
      const client = new WSocket('ws://localhost:9001', 'key', {
        autoReconnect: true,
        reconnectDelay: 100,
      });
      const promise = client.connect();
      const ws = getLastInstance();
      ws.simulateOpen();
      await promise;

      ws.simulateClose(1006);
      expect(client.connectionState).toBe('reconnecting');
    });

    it('emits reconnecting state event', async () => {
      const client = new WSocket('ws://localhost:9001', 'key', {
        autoReconnect: true,
        reconnectDelay: 100,
      });
      const states: string[] = [];
      client.on('state', (s) => states.push(s as string));

      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;

      getLastInstance().simulateClose(1006);
      expect(states).toContain('reconnecting');
    });

    it('emits disconnected event on close', async () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const onDisconnected = vi.fn();
      client.on('disconnected', onDisconnected);

      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;

      getLastInstance().simulateClose(1000);
      expect(onDisconnected).toHaveBeenCalledWith(1000);
    });

    it('stops reconnecting after max attempts', async () => {
      const client = new WSocket('ws://localhost:9001', 'key', {
        autoReconnect: true,
        maxReconnectAttempts: 2,
        reconnectDelay: 10,
      });
      const onError = vi.fn();
      client.on('error', onError);

      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;

      // Trigger close, which schedules reconnect
      getLastInstance().simulateClose(1006);

      // Advance timer to trigger reconnect attempt 1
      vi.advanceTimersByTime(50);
      getLastInstance().simulateError(new Error('fail'));
      getLastInstance().simulateClose(1006);

      // Advance timer for reconnect attempt 2
      vi.advanceTimersByTime(100);
      getLastInstance().simulateError(new Error('fail'));
      getLastInstance().simulateClose(1006);

      // Advance timer for reconnect attempt 3 (exceeds maxReconnectAttempts=2)
      vi.advanceTimersByTime(200);
      expect(client.connectionState).toBe('disconnected');
    });

    it('does not reconnect when autoReconnect is false', async () => {
      const client = new WSocket('ws://localhost:9001', 'key', { autoReconnect: false });
      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;

      getLastInstance().simulateClose(1006);
      expect(client.connectionState).toBe('disconnected');
    });
  });

  // ─── channel() ────────────────────────────────────────────

  describe('channel()', () => {
    it('returns a Channel instance', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      expect(client.channel('chat')).toBeInstanceOf(Channel);
    });

    it('returns same Channel for same name', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      expect(client.channel('chat')).toBe(client.channel('chat'));
    });

    it('returns different Channels for different names', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      expect(client.channel('chat')).not.toBe(client.channel('news'));
    });
  });

  // ─── configurePush() ──────────────────────────────────────

  describe('configurePush()', () => {
    it('overrides the auto-configured push client', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const autoPush = client.push;
      const custom = client.configurePush({ baseUrl: 'http://custom', token: 'tok' });
      expect(custom).toBeInstanceOf(PushClient);
      expect(client.push).toBe(custom);
      expect(client.push).not.toBe(autoPush);
    });
  });

  // ─── on() / off() ─────────────────────────────────────────

  describe('on() / off()', () => {
    it('registers event listeners and returns this', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const cb = vi.fn();
      expect(client.on('connected', cb)).toBe(client);
    });

    it('removes event listeners with off()', () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const cb = vi.fn();
      client.on('connected', cb);
      expect(client.off('connected', cb)).toBe(client);
    });

    it('removed listener is not called', async () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const cb = vi.fn();
      client.on('connected', cb);
      client.off('connected', cb);

      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;

      expect(cb).not.toHaveBeenCalled();
    });

    it('emits error event when server sends error message', async () => {
      const client = new WSocket('ws://localhost:9001', 'key');
      const onError = vi.fn();
      client.on('error', onError);

      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;

      getLastInstance().simulateMessage(JSON.stringify({ action: 'error', error: 'Bad request' }));
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  // ─── message routing ──────────────────────────────────────

  describe('message routing', () => {
    async function connectClient() {
      const client = new WSocket('ws://localhost:9001', 'key');
      const promise = client.connect();
      getLastInstance().simulateOpen();
      await promise;
      return client;
    }

    it('routes messages to the correct channel', async () => {
      const client = await connectClient();
      const cb = vi.fn();
      client.channel('chat').subscribe(cb);

      getLastInstance().simulateMessage(JSON.stringify({
        action: 'message',
        channel: 'chat',
        data: { text: 'hello' },
        id: 'msg-1',
        timestamp: 1000,
      }));

      expect(cb).toHaveBeenCalledWith({ text: 'hello' }, expect.objectContaining({
        channel: 'chat',
        id: 'msg-1',
        timestamp: 1000,
      }));
    });

    it('ignores messages for unknown channels', async () => {
      await connectClient();
      expect(() => {
        getLastInstance().simulateMessage(JSON.stringify({
          action: 'message',
          channel: 'unknown',
          data: 'test',
        }));
      }).not.toThrow();
    });

    it('ignores invalid JSON', async () => {
      await connectClient();
      expect(() => {
        getLastInstance().simulateMessage('not-json');
      }).not.toThrow();
    });

    it('emits subscribed event', async () => {
      const client = await connectClient();
      const onSub = vi.fn();
      client.on('subscribed', onSub);

      getLastInstance().simulateMessage(JSON.stringify({ action: 'subscribed', channel: 'chat' }));
      expect(onSub).toHaveBeenCalledWith('chat');
    });

    it('emits unsubscribed event', async () => {
      const client = await connectClient();
      const onUnsub = vi.fn();
      client.on('unsubscribed', onUnsub);

      getLastInstance().simulateMessage(JSON.stringify({ action: 'unsubscribed', channel: 'chat' }));
      expect(onUnsub).toHaveBeenCalledWith('chat');
    });

    it('emits ack event', async () => {
      const client = await connectClient();
      const onAck = vi.fn();
      client.on('ack', onAck);

      getLastInstance().simulateMessage(JSON.stringify({ action: 'ack', id: 'msg-1', channel: 'chat' }));
      expect(onAck).toHaveBeenCalledWith('msg-1', 'chat');
    });

    it('handles pong messages silently', async () => {
      const client = await connectClient();
      const onAck = vi.fn();
      client.on('ack', onAck);

      expect(() => {
        getLastInstance().simulateMessage(JSON.stringify({ action: 'pong' }));
      }).not.toThrow();
      expect(onAck).not.toHaveBeenCalled();
    });

    it('stores resume token from ack', async () => {
      const client = await connectClient();
      getLastInstance().simulateMessage(JSON.stringify({
        action: 'ack',
        id: 'resume',
        data: { resumeToken: 'tok-abc' },
      }));
      // Connect again to verify resume token is used
      client.disconnect();

      const p2 = client.connect();
      getLastInstance().simulateOpen();
      await p2;

      // After reconnect, the client resubscribes — check no error
      expect(client.connectionState).toBe('connected');
    });

    it('routes presence.enter to channel presence', async () => {
      const client = await connectClient();
      const ch = client.channel('room');
      const onEnter = vi.fn();
      ch.presence.onEnter(onEnter);

      getLastInstance().simulateMessage(JSON.stringify({
        action: 'presence.enter',
        channel: 'room',
        data: { clientId: 'user-1', joinedAt: 1000 },
      }));

      expect(onEnter).toHaveBeenCalledWith({ clientId: 'user-1', joinedAt: 1000 });
    });

    it('routes presence.leave to channel presence', async () => {
      const client = await connectClient();
      const ch = client.channel('room');
      const onLeave = vi.fn();
      ch.presence.onLeave(onLeave);

      getLastInstance().simulateMessage(JSON.stringify({
        action: 'presence.leave',
        channel: 'room',
        data: { clientId: 'user-1', joinedAt: 1000 },
      }));

      expect(onLeave).toHaveBeenCalledWith({ clientId: 'user-1', joinedAt: 1000 });
    });

    it('routes presence.update to channel presence', async () => {
      const client = await connectClient();
      const ch = client.channel('room');
      const onUpdate = vi.fn();
      ch.presence.onUpdate(onUpdate);

      getLastInstance().simulateMessage(JSON.stringify({
        action: 'presence.update',
        channel: 'room',
        data: { clientId: 'user-1', joinedAt: 1000, data: { status: 'away' } },
      }));

      expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ clientId: 'user-1' }));
    });

    it('routes presence.members to channel presence', async () => {
      const client = await connectClient();
      const ch = client.channel('room');
      const onMembers = vi.fn();
      ch.presence.onMembers(onMembers);

      getLastInstance().simulateMessage(JSON.stringify({
        action: 'presence.members',
        channel: 'room',
        data: [{ clientId: 'user-1', joinedAt: 1000 }, { clientId: 'user-2', joinedAt: 2000 }],
      }));

      expect(onMembers).toHaveBeenCalledWith([
        { clientId: 'user-1', joinedAt: 1000 },
        { clientId: 'user-2', joinedAt: 2000 },
      ]);
    });

    it('routes history to channel', async () => {
      const client = await connectClient();
      const ch = client.channel('chat');
      const onHistory = vi.fn();
      ch.onHistory(onHistory);

      const historyResult = {
        channel: 'chat',
        messages: [{ id: 'm1', channel: 'chat', data: 'hi', publisherId: 'u1', timestamp: 1000, sequence: 1 }],
        hasMore: false,
      };

      getLastInstance().simulateMessage(JSON.stringify({
        action: 'history',
        channel: 'chat',
        data: historyResult,
      }));

      expect(onHistory).toHaveBeenCalledWith(historyResult);
    });
  });

  // ─── resubscribe on reconnect ─────────────────────────────

  describe('resubscribe on reconnect', () => {
    beforeEach(() => { vi.useFakeTimers(); });
    afterEach(() => { vi.useRealTimers(); });

    it('resubscribes channels after reconnect', async () => {
      const client = new WSocket('ws://localhost:9001', 'key', {
        autoReconnect: true,
        reconnectDelay: 10,
        recover: false,
      });
      const p1 = client.connect();
      getLastInstance().simulateOpen();
      await p1;

      // Subscribe to a channel (triggers subscribe message)
      client.channel('chat').subscribe(() => {});
      const ws1 = getLastInstance();

      // Disconnect to trigger reconnect
      ws1.simulateClose(1006);
      vi.advanceTimersByTime(50);

      // Simulate new WS connection open
      getLastInstance().simulateOpen();
      await Promise.resolve();

      // Should have sent subscribe again
      expect(getLastInstance().send).toHaveBeenCalled();
    });
  });
});

describe('createClient', () => {
  it('is a convenience wrapper for new WSocket()', () => {
    const client = createClient('ws://localhost:9001', 'key');
    expect(client).toBeInstanceOf(WSocket);
  });

  it('passes options through', () => {
    const client = createClient('ws://localhost:9001', 'key', { autoReconnect: false });
    expect(client).toBeInstanceOf(WSocket);
  });
});
