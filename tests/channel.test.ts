import { vi, describe, it, expect } from 'vitest';
import { Channel } from '../src/pubsub/channel.js';
import type { ClientMessage, MessageMeta } from '../src/types.js';

function makeChannel(name = 'test-channel') {
  const sendFn = vi.fn<[ClientMessage], void>();
  const ch = new Channel(name, sendFn);
  return { ch, sendFn };
}

describe('Channel', () => {
  // ─── subscribe() ────────────────────────────────────────────

  describe('subscribe()', () => {
    it('sends a subscribe message to the server', () => {
      const { ch, sendFn } = makeChannel();
      ch.subscribe(() => {});
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'subscribe',
        channel: 'test-channel',
      }));
    });

    it('returns this for chaining', () => {
      const { ch } = makeChannel();
      expect(ch.subscribe(() => {})).toBe(ch);
    });

    it('sets isSubscribed to true after first subscribe', () => {
      const { ch } = makeChannel();
      expect(ch.isSubscribed).toBe(false);
      ch.subscribe(() => {});
      expect(ch.isSubscribed).toBe(true);
    });

    it('only sends subscribe message once for multiple callbacks', () => {
      const { ch, sendFn } = makeChannel('chat');
      ch.subscribe(() => {});
      ch.subscribe(() => {});
      const subscribeCalls = sendFn.mock.calls.filter(
        ([msg]) => msg.action === 'subscribe',
      );
      expect(subscribeCalls).toHaveLength(1);
    });

    it('includes rewind option when specified', () => {
      const { ch, sendFn } = makeChannel();
      ch.subscribe(() => {}, { rewind: 10 });
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'subscribe',
        rewind: 10,
      }));
    });

    it('does not include rewind when not specified', () => {
      const { ch, sendFn } = makeChannel();
      ch.subscribe(() => {});
      const call = sendFn.mock.calls[0][0];
      expect(call.rewind).toBeUndefined();
    });
  });

  // ─── publish() ──────────────────────────────────────────────

  describe('publish()', () => {
    it('sends a publish message with data', () => {
      const { ch, sendFn } = makeChannel('chat');
      ch.publish({ text: 'hello' });
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'publish',
        channel: 'chat',
        data: { text: 'hello' },
      }));
    });

    it('returns this for chaining', () => {
      const { ch } = makeChannel();
      expect(ch.publish('data')).toBe(ch);
    });

    it('includes a generated message id', () => {
      const { ch, sendFn } = makeChannel();
      ch.publish('test');
      const call = sendFn.mock.calls[0][0];
      expect(typeof call.id).toBe('string');
      expect(call.id!.length).toBeGreaterThan(0);
    });

    it('sets persist=false when specified', () => {
      const { ch, sendFn } = makeChannel();
      ch.publish('data', { persist: false });
      const call = sendFn.mock.calls[0][0];
      expect(call.persist).toBe(false);
    });

    it('does not set persist when not specified', () => {
      const { ch, sendFn } = makeChannel();
      ch.publish('data');
      const call = sendFn.mock.calls[0][0];
      expect(call.persist).toBeUndefined();
    });
  });

  // ─── unsubscribe() ──────────────────────────────────────────

  describe('unsubscribe()', () => {
    it('sends an unsubscribe message', () => {
      const { ch, sendFn } = makeChannel('news');
      ch.subscribe(() => {});
      sendFn.mockClear();

      ch.unsubscribe();
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'unsubscribe',
        channel: 'news',
      }));
    });

    it('sets isSubscribed to false', () => {
      const { ch } = makeChannel();
      ch.subscribe(() => {});
      ch.unsubscribe();
      expect(ch.isSubscribed).toBe(false);
    });

    it('removes all message listeners', () => {
      const { ch } = makeChannel();
      const cb = vi.fn();
      ch.subscribe(cb);
      ch.unsubscribe();

      // _emit should no longer call cb
      const meta: MessageMeta = { id: 'm1', channel: 'test-channel', timestamp: 1000 };
      ch._emit('data', meta);
      expect(cb).not.toHaveBeenCalled();
    });

    it('allows re-subscribing after unsubscribe', () => {
      const { ch, sendFn } = makeChannel();
      ch.subscribe(() => {});
      ch.unsubscribe();
      sendFn.mockClear();

      ch.subscribe(() => {});
      const subscribeCalls = sendFn.mock.calls.filter(([m]) => m.action === 'subscribe');
      expect(subscribeCalls).toHaveLength(1);
    });
  });

  // ─── _emit() ────────────────────────────────────────────────

  describe('_emit()', () => {
    it('calls registered callbacks with data and meta', () => {
      const { ch } = makeChannel('chat');
      const cb = vi.fn();
      ch.subscribe(cb);

      const meta: MessageMeta = { id: 'msg-1', channel: 'chat', timestamp: 1234 };
      ch._emit({ text: 'hi' }, meta);

      expect(cb).toHaveBeenCalledWith({ text: 'hi' }, meta);
    });

    it('calls all registered callbacks', () => {
      const { ch } = makeChannel();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      ch.subscribe(cb1);
      ch.subscribe(cb2);

      const meta: MessageMeta = { id: 'm', channel: 'test-channel', timestamp: 0 };
      ch._emit('payload', meta);

      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it('does not throw if a callback throws', () => {
      const { ch } = makeChannel();
      ch.subscribe(() => { throw new Error('oops'); });

      const meta: MessageMeta = { id: 'm', channel: 'test-channel', timestamp: 0 };
      expect(() => ch._emit('data', meta)).not.toThrow();
    });

    it('does nothing when no listeners', () => {
      const { ch } = makeChannel();
      const meta: MessageMeta = { id: 'm', channel: 'test-channel', timestamp: 0 };
      expect(() => ch._emit('data', meta)).not.toThrow();
    });
  });

  // ─── _hasListeners ──────────────────────────────────────────

  describe('_hasListeners', () => {
    it('is false before subscribing', () => {
      const { ch } = makeChannel();
      expect(ch._hasListeners).toBe(false);
    });

    it('is true after subscribing', () => {
      const { ch } = makeChannel();
      ch.subscribe(() => {});
      expect(ch._hasListeners).toBe(true);
    });

    it('is false after unsubscribing', () => {
      const { ch } = makeChannel();
      ch.subscribe(() => {});
      ch.unsubscribe();
      expect(ch._hasListeners).toBe(false);
    });
  });

  // ─── _markForResubscribe() ──────────────────────────────────

  describe('_markForResubscribe()', () => {
    it('sets isSubscribed to false', () => {
      const { ch } = makeChannel();
      ch.subscribe(() => {});
      expect(ch.isSubscribed).toBe(true);

      ch._markForResubscribe();
      expect(ch.isSubscribed).toBe(false);
    });

    it('keeps listeners intact', () => {
      const { ch } = makeChannel();
      const cb = vi.fn();
      ch.subscribe(cb);
      ch._markForResubscribe();

      expect(ch._hasListeners).toBe(true);
    });
  });

  // ─── presence ───────────────────────────────────────────────

  describe('presence', () => {
    it('channel.presence is a Presence instance', async () => {
      const { ch } = makeChannel();
      const { Presence } = await import('../src/pubsub/presence.js');
      expect(ch.presence).toBeInstanceOf(Presence);
    });

    it('presence uses the same channel name', () => {
      const { ch, sendFn } = makeChannel('room-1');
      ch.presence.enter();
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'presence.enter',
        channel: 'room-1',
      }));
    });
  });
});
