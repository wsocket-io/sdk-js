import { vi, describe, it, expect } from 'vitest';
import { Presence } from '../src/pubsub/presence.js';
import type { ClientMessage, PresenceMember } from '../src/types.js';

function makePresence(channel = 'room') {
  const sendFn = vi.fn<[ClientMessage], void>();
  const presence = new Presence(channel, sendFn);
  return { presence, sendFn };
}

const MEMBER: PresenceMember = { clientId: 'user-1', joinedAt: 1000 };
const MEMBER2: PresenceMember = { clientId: 'user-2', joinedAt: 2000, data: { status: 'online' } };

describe('Presence', () => {
  // ─── enter() ────────────────────────────────────────────────

  describe('enter()', () => {
    it('sends presence.enter message', () => {
      const { presence, sendFn } = makePresence('chat');
      presence.enter();
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'presence.enter',
        channel: 'chat',
      }));
    });

    it('sends presence.enter with data', () => {
      const { presence, sendFn } = makePresence();
      presence.enter({ status: 'online' });
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'presence.enter',
        data: { status: 'online' },
      }));
    });

    it('returns this for chaining', () => {
      const { presence } = makePresence();
      expect(presence.enter()).toBe(presence);
    });

    it('sends enter without data when called with no args', () => {
      const { presence, sendFn } = makePresence();
      presence.enter();
      const call = sendFn.mock.calls[0][0];
      expect(call.data).toBeUndefined();
    });
  });

  // ─── leave() ────────────────────────────────────────────────

  describe('leave()', () => {
    it('sends presence.leave message', () => {
      const { presence, sendFn } = makePresence('chat');
      presence.leave();
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'presence.leave',
        channel: 'chat',
      }));
    });

    it('returns this for chaining', () => {
      const { presence } = makePresence();
      expect(presence.leave()).toBe(presence);
    });
  });

  // ─── update() ───────────────────────────────────────────────

  describe('update()', () => {
    it('sends presence.update message with data', () => {
      const { presence, sendFn } = makePresence('chat');
      presence.update({ status: 'away' });
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'presence.update',
        channel: 'chat',
        data: { status: 'away' },
      }));
    });

    it('returns this for chaining', () => {
      const { presence } = makePresence();
      expect(presence.update({ x: 1 })).toBe(presence);
    });
  });

  // ─── get() ──────────────────────────────────────────────────

  describe('get()', () => {
    it('sends presence.get message', () => {
      const { presence, sendFn } = makePresence('chat');
      presence.get();
      expect(sendFn).toHaveBeenCalledWith(expect.objectContaining({
        action: 'presence.get',
        channel: 'chat',
      }));
    });

    it('returns this for chaining', () => {
      const { presence } = makePresence();
      expect(presence.get()).toBe(presence);
    });
  });

  // ─── onEnter() ──────────────────────────────────────────────

  describe('onEnter()', () => {
    it('returns this for chaining', () => {
      const { presence } = makePresence();
      expect(presence.onEnter(() => {})).toBe(presence);
    });

    it('callback is called when _emitEnter is called', () => {
      const { presence } = makePresence();
      const cb = vi.fn();
      presence.onEnter(cb);
      presence._emitEnter(MEMBER);
      expect(cb).toHaveBeenCalledWith(MEMBER);
    });

    it('multiple callbacks all receive the event', () => {
      const { presence } = makePresence();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      presence.onEnter(cb1).onEnter(cb2);
      presence._emitEnter(MEMBER);
      expect(cb1).toHaveBeenCalledWith(MEMBER);
      expect(cb2).toHaveBeenCalledWith(MEMBER);
    });

    it('does not throw if callback throws', () => {
      const { presence } = makePresence();
      presence.onEnter(() => { throw new Error('bang'); });
      expect(() => presence._emitEnter(MEMBER)).not.toThrow();
    });
  });

  // ─── onLeave() ──────────────────────────────────────────────

  describe('onLeave()', () => {
    it('returns this for chaining', () => {
      const { presence } = makePresence();
      expect(presence.onLeave(() => {})).toBe(presence);
    });

    it('callback is called when _emitLeave is called', () => {
      const { presence } = makePresence();
      const cb = vi.fn();
      presence.onLeave(cb);
      presence._emitLeave(MEMBER);
      expect(cb).toHaveBeenCalledWith(MEMBER);
    });

    it('does not throw if callback throws', () => {
      const { presence } = makePresence();
      presence.onLeave(() => { throw new Error('bang'); });
      expect(() => presence._emitLeave(MEMBER)).not.toThrow();
    });
  });

  // ─── onUpdate() ─────────────────────────────────────────────

  describe('onUpdate()', () => {
    it('returns this for chaining', () => {
      const { presence } = makePresence();
      expect(presence.onUpdate(() => {})).toBe(presence);
    });

    it('callback is called when _emitUpdate is called', () => {
      const { presence } = makePresence();
      const cb = vi.fn();
      presence.onUpdate(cb);
      presence._emitUpdate(MEMBER2);
      expect(cb).toHaveBeenCalledWith(MEMBER2);
    });

    it('does not throw if callback throws', () => {
      const { presence } = makePresence();
      presence.onUpdate(() => { throw new Error('bang'); });
      expect(() => presence._emitUpdate(MEMBER)).not.toThrow();
    });
  });

  // ─── onMembers() ────────────────────────────────────────────

  describe('onMembers()', () => {
    it('returns this for chaining', () => {
      const { presence } = makePresence();
      expect(presence.onMembers(() => {})).toBe(presence);
    });

    it('callback is called with full member list', () => {
      const { presence } = makePresence();
      const cb = vi.fn();
      presence.onMembers(cb);
      presence._emitMembers([MEMBER, MEMBER2]);
      expect(cb).toHaveBeenCalledWith([MEMBER, MEMBER2]);
    });

    it('multiple callbacks all receive the member list', () => {
      const { presence } = makePresence();
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      presence.onMembers(cb1).onMembers(cb2);
      presence._emitMembers([MEMBER]);
      expect(cb1).toHaveBeenCalledWith([MEMBER]);
      expect(cb2).toHaveBeenCalledWith([MEMBER]);
    });

    it('does not throw if callback throws', () => {
      const { presence } = makePresence();
      presence.onMembers(() => { throw new Error('bang'); });
      expect(() => presence._emitMembers([MEMBER])).not.toThrow();
    });
  });

  // ─── chaining ───────────────────────────────────────────────

  describe('full chaining', () => {
    it('all methods are chainable', () => {
      const { presence } = makePresence();
      const cb = vi.fn();
      const result = presence
        .onEnter(cb)
        .onLeave(cb)
        .onUpdate(cb)
        .onMembers(vi.fn())
        .enter({ x: 1 })
        .update({ x: 2 })
        .get()
        .leave();
      expect(result).toBe(presence);
    });
  });

  // ─── state sync (members list) ───────────────────────────────

  describe('state sync', () => {
    it('delivers member list to onMembers listener', () => {
      const { presence } = makePresence();
      const received: PresenceMember[][] = [];
      presence.onMembers((members) => received.push(members));

      presence._emitMembers([MEMBER]);
      presence._emitMembers([MEMBER, MEMBER2]);

      expect(received).toHaveLength(2);
      expect(received[0]).toHaveLength(1);
      expect(received[1]).toHaveLength(2);
    });

    it('delivers individual events to respective listeners', () => {
      const { presence } = makePresence();
      const enters: PresenceMember[] = [];
      const leaves: PresenceMember[] = [];
      const updates: PresenceMember[] = [];

      presence
        .onEnter((m) => enters.push(m))
        .onLeave((m) => leaves.push(m))
        .onUpdate((m) => updates.push(m));

      presence._emitEnter(MEMBER);
      presence._emitLeave(MEMBER);
      presence._emitUpdate(MEMBER2);

      expect(enters).toEqual([MEMBER]);
      expect(leaves).toEqual([MEMBER]);
      expect(updates).toEqual([MEMBER2]);
    });
  });
});
