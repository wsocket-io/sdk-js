/**
 * PubSub namespace — provides a scoped API surface for pub/sub operations.
 *
 * Usage:
 *   client.pubsub.channel('chat').subscribe(cb);
 *   client.pubsub.channel('chat').publish({ text: 'Hello!' });
 *
 * This is a lightweight proxy that delegates to the main WSocket instance.
 */

import type { Channel } from './channel.js';

export { Channel } from './channel.js';
export { Presence } from './presence.js';

export class PubSubNamespace {
  constructor(
    private channelFn: (name: string) => Channel,
  ) {}

  /** Get or create a channel (same as client.channel()) */
  channel(name: string): Channel {
    return this.channelFn(name);
  }
}
