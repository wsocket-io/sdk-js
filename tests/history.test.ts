import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Channel } from '../src/pubsub/channel.js';
import type { ClientMessage, HistoryResult, HistoryMessage } from '../src/types.js';

function makeChannel(name = 'chat') {
  const sendFn = vi.fn<[ClientMessage], void>();
  const ch = new Channel(name, sendFn);
  return { ch, sendFn };
}

const SAMPLE_MESSAGE: HistoryMessage = {
  id: 'msg-1',
  channel: 'chat',
  data: { text: 'hello' },
  publisherId: 'user-1',
  timestamp: 1000,
  sequence: 1,
};

const HISTORY_RESULT: HistoryResult = {
  channel: 'chat',
  messages: [SAMPLE_MESSAGE],
  hasMore: false,
};

describe('Channel History', () => {
  // ─── history() ──────────────────────────────────────────────

  describe('history()', () => {
    it('sends a history message with channel name', () => {
      const { ch, sendFn } = makeChannel('news');
      ch.history();
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'history',
        channel: 'news',
      }));
    });

    it('returns this for chaining', () => {
      const { ch } = makeChannel();
      expect(ch.history()).toBe(ch);
    });

    it('includes limit option when specified', () => {
      const { ch, sendFn } = makeChannel();
      ch.history({ limit: 50 });
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
    });

    it('includes before option when specified', () => {
      const { ch, sendFn } = makeChannel();
      ch.history({ before: 9999 });
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({ before: 9999 }));
    });

    it('includes after option when specified', () => {
      const { ch, sendFn } = makeChannel();
      ch.history({ after: 1111 });
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({ after: 1111 }));
    });

    it('includes direction option when specified', () => {
      const { ch, sendFn } = makeChannel();
      ch.history({ direction: 'forward' });
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({ direction: 'forward' }));
    });

    it('includes all options together', () => {
      const { ch, sendFn } = makeChannel();
      ch.history({ limit: 20, before: 5000, after: 1000, direction: 'backward' });
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'history',
        limit: 20,
        before: 5000,
        after: 1000,
        direction: 'backward',
      }));
    });

    it('omits undefined options', () => {
      const { ch, sendFn } = makeChannel();
      ch.history({});
      const call = sendFn.mock.calls[0][0];
      expect(call.limit).toBeUndefined();
      expect(call.before).toBeUndefined();
      expect(call.after).toBeUndefined();
      expect(call.direction).toBeUndefined();
    });
  });

  // ─── onHistory() ────────────────────────────────────────────

  describe('onHistory()', () => {
    it('returns this for chaining', () => {
      const { ch } = makeChannel();
      expect(ch.onHistory(() => {})).toBe(ch);
    });

    it('callback is called when _emitHistory is called', () => {
      const { ch } = makeChannel();
      const cb = vi.fn();
      ch.onHistory(cb);
      ch._emitHistory(HISTORY_RESULT);
      expect(cb).toHaveBeenCalledWith(HISTORY_RESULT);
    });

    it('multiple callbacks all receive the result', () => {
      const { ch } = makeChannel();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      ch.onHistory(cb1);
      ch.onHistory(cb2);
      ch._emitHistory(HISTORY_RESULT);
      expect(cb1).toHaveBeenCalledWith(HISTORY_RESULT);
      expect(cb2).toHaveBeenCalledWith(HISTORY_RESULT);
    });

    it('does not throw if callback throws', () => {
      const { ch } = makeChannel();
      ch.onHistory(() => { throw new Error('bad'); });
      expect(() => ch._emitHistory(HISTORY_RESULT)).not.toThrow();
    });

    it('is a no-op when no listeners registered', () => {
      const { ch } = makeChannel();
      expect(() => ch._emitHistory(HISTORY_RESULT)).not.toThrow();
    });
  });

  // ─── pagination ─────────────────────────────────────────────

  describe('pagination', () => {
    it('delivers hasMore=true result correctly', () => {
      const { ch } = makeChannel();
      const results: HistoryResult[] = [];
      ch.onHistory((r) => results.push(r));

      const pageOne: HistoryResult = {
        channel: 'chat',
        messages: [SAMPLE_MESSAGE],
        hasMore: true,
      };
      ch._emitHistory(pageOne);
      expect(results[0].hasMore).toBe(true);
    });

    it('delivers multiple pages in order', () => {
      const { ch } = makeChannel();
      const pages: HistoryResult[] = [];
      ch.onHistory((r) => pages.push(r));

      const msg2: HistoryMessage = { ...SAMPLE_MESSAGE, id: 'msg-2', sequence: 2 };
      const msg3: HistoryMessage = { ...SAMPLE_MESSAGE, id: 'msg-3', sequence: 3 };

      ch._emitHistory({ channel: 'chat', messages: [SAMPLE_MESSAGE, msg2], hasMore: true });
      ch._emitHistory({ channel: 'chat', messages: [msg3], hasMore: false });

      expect(pages).toHaveLength(2);
      expect(pages[0].messages).toHaveLength(2);
      expect(pages[1].messages).toHaveLength(1);
      expect(pages[1].hasMore).toBe(false);
    });

    it('delivers empty message list', () => {
      const { ch } = makeChannel();
      const cb = vi.fn();
      ch.onHistory(cb);
      ch._emitHistory({ channel: 'chat', messages: [], hasMore: false });
      expect(cb).toHaveBeenCalledWith({ channel: 'chat', messages: [], hasMore: false });
    });
  });

  // ─── replay via subscribe with rewind ────────────────────────

  describe('replay via subscribe rewind', () => {
    it('sends rewind count when subscribing with rewind option', () => {
      const { ch, sendFn } = makeChannel('replay-ch');
      ch.subscribe(() => {}, { rewind: 5 });
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'subscribe',
        channel: 'replay-ch',
        rewind: 5,
      }));
    });
  });
});
