import { describe, it, expect } from 'vitest';
import {
  WSocket,
  createClient,
  Channel,
  Presence,
  PubSubNamespace,
  PushClient,
} from '../src/index.js';

describe('JS SDK', () => {
  describe('createClient', () => {
    it('should create an WSocket instance', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      expect(client).toBeInstanceOf(WSocket);
    });

    it('should have pubsub namespace', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      expect(client.pubsub).toBeInstanceOf(PubSubNamespace);
    });

    it('should have push as null by default', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      expect(client.push).toBeNull();
    });

    it('should start disconnected', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      expect(client.connectionState).toBe('disconnected');
    });
  });

  describe('backward compatibility', () => {
    it('client.channel() should return a Channel instance', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      const ch = client.channel('test');
      expect(ch).toBeInstanceOf(Channel);
      expect(ch.name).toBe('test');
    });

    it('client.channel() should return same Channel on repeated calls', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      const ch1 = client.channel('test');
      const ch2 = client.channel('test');
      expect(ch1).toBe(ch2);
    });
  });

  describe('pubsub namespace', () => {
    it('client.pubsub.channel() should return same Channel as client.channel()', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      const ch1 = client.channel('chat');
      const ch2 = client.pubsub.channel('chat');
      expect(ch1).toBe(ch2);
    });

    it('channel should have presence property', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      const ch = client.pubsub.channel('room');
      expect(ch.presence).toBeInstanceOf(Presence);
    });
  });

  describe('push namespace', () => {
    it('configurePush() should set client.push', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      expect(client.push).toBeNull();

      const push = client.configurePush({
        baseUrl: 'http://localhost:9001',
        token: 'admin-token',
        appId: 'app-1',
      });

      expect(push).toBeInstanceOf(PushClient);
      expect(client.push).toBe(push);
    });
  });

  describe('Channel', () => {
    it('should start unsubscribed', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      const ch = client.channel('test');
      expect(ch.isSubscribed).toBe(false);
    });

    it('should have chainable subscribe', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      const ch = client.channel('test');
      const result = ch.subscribe(() => {});
      expect(result).toBe(ch);
    });
  });

  describe('events', () => {
    it('should register and remove event listeners', () => {
      const client = createClient('ws://localhost:9001', 'test-key');
      const cb = () => {};
      const result = client.on('connected', cb);
      expect(result).toBe(client);
      client.off('connected', cb);
    });
  });

  describe('re-exports', () => {
    it('should export all public types and classes', () => {
      expect(WSocket).toBeDefined();
      expect(Channel).toBeDefined();
      expect(Presence).toBeDefined();
      expect(PubSubNamespace).toBeDefined();
      expect(PushClient).toBeDefined();
      expect(createClient).toBeDefined();
    });
  });
});
