# wSocket JavaScript SDK

Official JavaScript/TypeScript SDK for [wSocket](https://wsocket.io) — Realtime Pub/Sub, Push Notifications & Support Chat over WebSockets.

[![npm version](https://img.shields.io/npm/v/@wsocket-io/sdk?color=cb3837&logo=npm)](https://www.npmjs.com/package/@wsocket-io/sdk)
[![npm downloads](https://img.shields.io/npm/dm/@wsocket-io/sdk?color=blue&logo=npm)](https://www.npmjs.com/package/@wsocket-io/sdk)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@wsocket-io/sdk?color=green&label=bundle%20size)](https://bundlephobia.com/package/@wsocket-io/sdk)
[![CI](https://img.shields.io/github/actions/workflow/status/wsocket-io/sdk-js/ci.yml?branch=main&logo=github&label=CI)](https://github.com/wsocket-io/sdk-js/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![jsDelivr](https://data.jsdelivr.com/v1/package/npm/@wsocket-io/sdk/badge)](https://www.jsdelivr.com/package/npm/@wsocket-io/sdk)
[![Node.js](https://img.shields.io/node/v/@wsocket-io/sdk?color=339933&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![GitHub stars](https://img.shields.io/github/stars/wsocket-io/sdk-js?style=social)](https://github.com/wsocket-io/sdk-js)

## Installation

```bash
npm install @wsocket-io/sdk
```

### CDN (Browser)

```html
<script src="https://cdn.jsdelivr.net/npm/@wsocket-io/sdk@0.3.2/dist/wsocket.min.js"></script>
```

## Quick Start

```typescript
import { createClient } from '@wsocket-io/sdk';

const client = createClient('wss://node00.wsocket.online', 'your-api-key');
await client.connect();

// Subscribe to a channel
const chat = client.channel('chat:general');
chat.subscribe((data, meta) => {
  console.log(`[${meta.channel}]`, data);
});

// Publish a message
chat.publish({ user: 'Alice', text: 'Hello!' });
```

## Features

- **Pub/Sub** — Subscribe and publish to channels in real-time
- **Presence** — Track who is online in a channel with custom state
- **History** — Retrieve past messages with pagination
- **Push Notifications** — Web Push (VAPID), FCM, and APNs support
- **Connection Recovery** — Automatic reconnection with message replay
- **TypeScript** — Full type definitions included
- **Isomorphic** — Works in Node.js and browsers

## API Reference

### Creating a Client

```typescript
import { createClient, WSocket } from '@wsocket-io/sdk';

// Factory function
const client = createClient('wss://node00.wsocket.online', 'your-api-key');

// Or constructor directly
const client = new WSocket('wss://node00.wsocket.online', 'your-api-key', {
  autoReconnect: true,        // default: true
  maxReconnectAttempts: 10,    // default: 10
  reconnectDelay: 1000,        // default: 1000ms
  recover: true,               // resume missed messages on reconnect
});

await client.connect();
```

### Connection Events

```typescript
client.on('connected', () => console.log('Connected'));
client.on('disconnected', (code) => console.log('Disconnected:', code));
client.on('reconnecting', () => console.log('Reconnecting...'));
client.on('error', (err) => console.error('Error:', err));
client.on('state', (newState, prevState) => {
  console.log(`${prevState} → ${newState}`);
});

// Check current state
console.log(client.connectionState); // 'connected' | 'connecting' | 'disconnected' | 'reconnecting'

// Disconnect
client.disconnect();
```

---

## Pub/Sub

### Channels

```typescript
const channel = client.channel('chat:general');

// Subscribe to messages
channel.subscribe((data, meta) => {
  console.log(data);         // message payload
  console.log(meta.channel); // 'chat:general'
  console.log(meta.id);      // message ID
  console.log(meta.timestamp); // unix timestamp
});

// Publish a message
channel.publish({ user: 'Alice', text: 'Hello!' });

// Unsubscribe
channel.unsubscribe();
```

### Namespaced API

```typescript
// Alternative namespaced access
const channel = client.pubsub.channel('chat:general');
channel.subscribe((data) => console.log(data));
channel.publish({ text: 'Hello!' });
```

---

## Presence

Track who is online in a channel with custom state data.

```typescript
const channel = client.channel('room:lobby');

// Listen for members joining/leaving
channel.presence.onEnter((member) => {
  console.log(`${member.clientId} joined`, member.data);
});

channel.presence.onLeave((member) => {
  console.log(`${member.clientId} left`);
});

channel.presence.onUpdate((member) => {
  console.log(`${member.clientId} updated state`, member.data);
});

// Enter the channel with custom state
channel.presence.enter({ name: 'Alice', status: 'online' });

// Update your state
channel.presence.update({ name: 'Alice', status: 'away' });

// Leave the channel
channel.presence.leave();

// Get current member list
const members = channel.presence.get();
```

---

## History

Retrieve past messages from a channel.

```typescript
const channel = client.channel('chat:general');

// Listen for history results
channel.onHistory((result) => {
  console.log(`Got ${result.messages.length} messages`);
  result.messages.forEach((msg) => {
    console.log(`[${new Date(msg.timestamp).toISOString()}]`, msg.data);
  });
});

// Fetch history
channel.history({ limit: 50 });
```

---

## Push Notifications

The SDK includes a full push notification client supporting **Web Push (VAPID)**, **FCM**, and **APNs**.

### Auto-configured Push

The push client is auto-configured from your connection — no extra setup needed:

```typescript
const client = createClient('wss://node00.wsocket.online', 'your-api-key');

// Push client is ready immediately (uses same server URL + API key)
const push = client.push;
```

### Custom Push Configuration

Override the auto-config if needed:

```typescript
const push = client.configurePush({
  baseUrl: 'https://node00.wsocket.online',
  token: 'your-api-key',
  appId: 'your-app-id',  // optional
});
```

### Browser Subscribe (Web Push)

Subscribe the current browser to push notifications:

```typescript
// Subscribe to channels (requests notification permission + registers service worker)
const subscription = await client.push.subscribe(['news', 'alerts']);

// With custom service worker path
const subscription = await client.push.subscribe(['news'], '/custom-sw.js');
```

### Send Notifications

```typescript
// Send to a specific member
await client.push.send(
  { title: 'New Message', body: 'You have a new message!' },
  { to: 'user-123' }
);

// Send to a specific channel
await client.push.send(
  { title: 'Breaking News', body: 'Something happened!' },
  { to: 'user-123', channel: 'news' }
);

// Send to multiple members
await client.push.send(
  { title: 'Alert', body: 'System maintenance in 1h' },
  { to: ['user-1', 'user-2', 'user-3'] }
);

// Broadcast to all subscribers
await client.push.broadcast({ title: 'Hello everyone!' });

// Broadcast to a channel
await client.push.broadcast({ title: 'Sports update!' }, 'sports');
```

### Channel Management

```typescript
// Add a channel to a member's subscriptions
await client.push.addChannel('user-123', 'sports');

// Remove a channel
await client.push.removeChannel('user-123', 'sports');
```

### Registration (Low-Level)

For FCM/APNs or advanced use cases:

```typescript
// Register a web push subscription manually
await client.push.register('web', pushSubscription, {
  memberId: 'user-123',
  channels: ['alerts', 'news'],
});

// Register FCM device
await client.push.register('fcm', 'fcm-device-token', {
  memberId: 'user-123',
  channels: ['alerts'],
});

// Register APNs device
await client.push.register('apns', 'apns-device-token', {
  memberId: 'user-123',
});

// Unregister all subscriptions for a member
await client.push.unregister('user-123');

// Unregister only web push
await client.push.unregister('user-123', 'web');
```

### Subscription Management

```typescript
// Get VAPID public key
const vapidKey = await client.push.getVapidKey();

// List subscriptions
const subs = await client.push.listSubscriptions({
  memberId: 'user-123',
  platform: 'web',
  limit: 50,
});

// Delete a specific subscription
await client.push.deleteSubscription('subscription-id');
```

### Push Payload Options

```typescript
await client.push.send({
  title: 'Notification Title',    // required
  body: 'Message body text',      // optional
  icon: '/icon-192.png',          // optional
  image: '/hero-image.jpg',       // optional
  badge: '/badge-72.png',         // optional
  url: 'https://example.com',     // click action URL
  data: { orderId: '12345' },     // custom data
  ttl: 3600,                      // time-to-live in seconds
  urgency: 'high',                // 'very-low' | 'low' | 'normal' | 'high'
}, { to: 'user-123' });
```

---

## Service Worker

Create a `sw.js` in your public directory for Web Push:

```javascript
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', {
      body: data.body,
      icon: data.icon || '/icon-192.png',
      badge: data.badge,
      image: data.image,
      data: { url: data.url, ...data.data },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (url) {
    event.waitUntil(clients.openWindow(url));
  }
});
```

---

## Requirements

- Node.js >= 18 or modern browsers
- `ws >= 8.0` (Node.js only — browsers use native WebSocket)

## Development

```bash
npm install
npm run build        # TypeScript compilation
npm run build:cdn    # Browser UMD bundle → dist/wsocket.min.js
npm run build:all    # All outputs
npm test             # Run tests
```

## License

MIT
