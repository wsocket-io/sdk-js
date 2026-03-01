# wSocket JavaScript SDK

Official JavaScript/TypeScript SDK for [wSocket](https://wsocket.io) — Realtime Pub/Sub over WebSockets.

[![npm](https://img.shields.io/npm/v/@wsocket-io/sdk)](https://www.npmjs.com/package/@wsocket-io/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Installation

```bash
npm install @wsocket-io/sdk
```

## Quick Start

```typescript
import { createClient } from '@wsocket-io/sdk';

const client = createClient('wss://your-server.com', 'your-api-key');
client.connect();

const chat = client.channel('chat:general');

chat.subscribe((data, meta) => {
  console.log(`[${meta.channel}]`, data);
});

chat.publish({ text: 'Hello from JavaScript!' });
```

## Features

- **Pub/Sub** — Subscribe and publish to channels in real-time
- **Presence** — Track who is online in a channel
- **History** — Retrieve past messages
- **Push Notifications** — Web Push via Service Workers
- **Connection Recovery** — Automatic reconnection with message replay
- **TypeScript** — Full type definitions included

## Presence

```typescript
const chat = client.channel('chat:general');

chat.presence.onEnter((member) => {
  console.log(`Joined: ${member.clientId}`);
});

chat.presence.onLeave((member) => {
  console.log(`Left: ${member.clientId}`);
});

chat.presence.enter({ name: 'Alice' });
const members = chat.presence.get();
```

## History

```typescript
chat.onHistory((result) => {
  result.messages.forEach((msg) => {
    console.log(`[${msg.timestamp}] ${JSON.stringify(msg.data)}`);
  });
});

chat.history({ limit: 50 });
```

## Push Notifications

```typescript
client.configurePush({
  vapidPublicKey: 'your-vapid-public-key',
  serviceWorkerPath: '/sw.js',
});

await client.push?.subscribe('alerts');
```

## Requirements

- Node.js >= 18 or modern browsers
- `ws >= 8.0` (Node.js only)

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
