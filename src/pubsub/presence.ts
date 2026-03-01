import type { ClientMessage, PresenceMember } from '../types.js';

/** Presence API for a channel */
export class Presence {
  private enterListeners = new Set<(member: PresenceMember) => void>();
  private leaveListeners = new Set<(member: PresenceMember) => void>();
  private updateListeners = new Set<(member: PresenceMember) => void>();
  private membersListeners = new Set<(members: PresenceMember[]) => void>();

  constructor(
    private channelName: string,
    private sendFn: (msg: ClientMessage) => void,
  ) {}

  /** Enter presence set with optional data */
  enter(data?: Record<string, unknown>): this {
    this.sendFn({ action: 'presence.enter', channel: this.channelName, data });
    return this;
  }

  /** Leave presence set */
  leave(): this {
    this.sendFn({ action: 'presence.leave', channel: this.channelName });
    return this;
  }

  /** Update presence data */
  update(data: Record<string, unknown>): this {
    this.sendFn({ action: 'presence.update', channel: this.channelName, data });
    return this;
  }

  /** Get current members */
  get(): this {
    this.sendFn({ action: 'presence.get', channel: this.channelName });
    return this;
  }

  /** Listen for members entering */
  onEnter(cb: (member: PresenceMember) => void): this {
    this.enterListeners.add(cb);
    return this;
  }

  /** Listen for members leaving */
  onLeave(cb: (member: PresenceMember) => void): this {
    this.leaveListeners.add(cb);
    return this;
  }

  /** Listen for presence data updates */
  onUpdate(cb: (member: PresenceMember) => void): this {
    this.updateListeners.add(cb);
    return this;
  }

  /** Listen for member list response */
  onMembers(cb: (members: PresenceMember[]) => void): this {
    this.membersListeners.add(cb);
    return this;
  }

  /** @internal */
  _emitEnter(member: PresenceMember): void {
    for (const cb of this.enterListeners) { try { cb(member); } catch {} }
  }

  /** @internal */
  _emitLeave(member: PresenceMember): void {
    for (const cb of this.leaveListeners) { try { cb(member); } catch {} }
  }

  /** @internal */
  _emitUpdate(member: PresenceMember): void {
    for (const cb of this.updateListeners) { try { cb(member); } catch {} }
  }

  /** @internal */
  _emitMembers(members: PresenceMember[]): void {
    for (const cb of this.membersListeners) { try { cb(members); } catch {} }
  }
}
