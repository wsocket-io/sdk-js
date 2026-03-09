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

  /**
   * Enter the presence set with optional custom state data.
   *
   * @param data - Optional key/value state to associate with this member
   * @returns `this` for chaining
   */
  enter(data?: Record<string, unknown>): this {
    this.sendFn({ action: 'presence.enter', channel: this.channelName, data });
    return this;
  }

  /**
   * Leave the presence set.
   *
   * @returns `this` for chaining
   */
  leave(): this {
    this.sendFn({ action: 'presence.leave', channel: this.channelName });
    return this;
  }

  /**
   * Update your presence state data.
   *
   * @param data - New key/value state to associate with this member
   * @returns `this` for chaining
   */
  update(data: Record<string, unknown>): this {
    this.sendFn({ action: 'presence.update', channel: this.channelName, data });
    return this;
  }

  /**
   * Request the current member list for this channel.
   * Listen for the result with {@link onMembers}.
   *
   * @returns `this` for chaining
   */
  get(): this {
    this.sendFn({ action: 'presence.get', channel: this.channelName });
    return this;
  }

  /**
   * Listen for members entering the presence set.
   *
   * @param cb - Called with the entering member's data
   * @returns `this` for chaining
   */
  onEnter(cb: (member: PresenceMember) => void): this {
    this.enterListeners.add(cb);
    return this;
  }

  /**
   * Listen for members leaving the presence set.
   *
   * @param cb - Called with the leaving member's data
   * @returns `this` for chaining
   */
  onLeave(cb: (member: PresenceMember) => void): this {
    this.leaveListeners.add(cb);
    return this;
  }

  /**
   * Listen for presence state updates from members.
   *
   * @param cb - Called with the updated member's data
   * @returns `this` for chaining
   */
  onUpdate(cb: (member: PresenceMember) => void): this {
    this.updateListeners.add(cb);
    return this;
  }

  /**
   * Listen for the current member list (response to {@link get}).
   *
   * @param cb - Called with the full list of present members
   * @returns `this` for chaining
   */
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
