/**
 * Integration tests using a real ws WebSocket server.
 * These tests verify the full message-passing protocol end-to-end.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocketServer, WebSocket as WsWebSocket } from 'ws';
import { WSocket } from '../src/index.js';

// ─── Helpers ────────────────────────────────────────────────

function startServer(port: number): { wss: WebSocketServer; clients: WsWebSocket[] } {
  const clients: WsWebSocket[] = [];
  const wss = new WebSocketServer({ port });
  wss.on('connection', (ws) => {
    clients.push(ws);
  });
  return { wss, clients };
}

function stopServer(wss: WebSocketServer): Promise<void> {
  return new Promise((resolve) => wss.close(() => resolve()));
}

function waitForEvent<T = unknown>(emitter: { on: (e: string, cb: (...args: any[]) => void) => void }, event: string): Promise<T> {
  return new Promise((resolve) => emitter.on(event, (...args: unknown[]) => resolve(args[0] as T)));
}

// ─── Tests ──────────────────────────────────────────────────

describe('WSocket integration', () => {
  let wss: WebSocketServer;
  let serverClients: WsWebSocket[];
  const PORT = 19001;

  beforeEach(() => {
    const s = startServer(PORT);
    wss = s.wss;
    serverClients = s.clients;
  });

  afterEach(async () => {
    await stopServer(wss);
  });

  // ─── connect / disconnect ──────────────────────────────────

  it('connects and reaches connected state', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');
    await client.connect();
    expect(client.connectionState).toBe('connected');
    client.disconnect();
  });

  it('emits connected event on successful connection', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');
    const onConnected = new Promise<void>((resolve) => client.on('connected', () => resolve()));
    client.connect();
    await onConnected;
    client.disconnect();
  });

  it('emits disconnected event when disconnect() is called', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');
    await client.connect();
    const onDisconnected = new Promise<void>((resolve) => client.on('disconnected', () => resolve()));
    client.disconnect();
    await onDisconnected;
    expect(client.connectionState).toBe('disconnected');
  });

  it('transitions through connecting → connected states', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');
    const states: string[] = [];
    client.on('state', (s) => states.push(s as string));
    await client.connect();
    expect(states).toContain('connecting');
    expect(states).toContain('connected');
    client.disconnect();
  });

  // ─── message routing ──────────────────────────────────────

  it('routes a server-sent message to the correct channel callback', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');
    await client.connect();

    const received: unknown[] = [];
    client.channel('chat').subscribe((data) => received.push(data));

    // Wait for server to see our client
    await new Promise((r) => setTimeout(r, 20));
    const serverWs = serverClients[serverClients.length - 1];

    serverWs.send(JSON.stringify({
      action: 'message',
      channel: 'chat',
      data: { text: 'hello' },
      id: 'msg-1',
      timestamp: Date.now(),
    }));

    await new Promise((r) => setTimeout(r, 20));
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ text: 'hello' });

    client.disconnect();
  });

  it('client sends subscribe message to server on channel.subscribe()', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');

    const serverMessages: unknown[] = [];
    wss.on('connection', (ws) => {
      ws.on('message', (raw) => serverMessages.push(JSON.parse(raw.toString())));
    });

    await client.connect();
    client.channel('news').subscribe(() => {});

    await new Promise((r) => setTimeout(r, 20));
    const subMsg = serverMessages.find((m: any) => m.action === 'subscribe' && m.channel === 'news');
    expect(subMsg).toBeDefined();

    client.disconnect();
  });

  it('client sends publish message to server', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');

    const serverMessages: unknown[] = [];
    wss.on('connection', (ws) => {
      ws.on('message', (raw) => serverMessages.push(JSON.parse(raw.toString())));
    });

    await client.connect();
    client.channel('chat').publish({ text: 'hi server' });

    await new Promise((r) => setTimeout(r, 20));
    const pubMsg = serverMessages.find((m: any) => m.action === 'publish' && m.channel === 'chat');
    expect(pubMsg).toBeDefined();
    expect((pubMsg as any).data).toEqual({ text: 'hi server' });

    client.disconnect();
  });

  // ─── subscribed / unsubscribed events ─────────────────────

  it('emits subscribed event when server sends subscribed action', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');
    await client.connect();

    const subEvents: string[] = [];
    client.on('subscribed', (ch) => subEvents.push(ch as string));

    await new Promise((r) => setTimeout(r, 20));
    const serverWs = serverClients[serverClients.length - 1];

    serverWs.send(JSON.stringify({ action: 'subscribed', channel: 'chat' }));
    await new Promise((r) => setTimeout(r, 20));

    expect(subEvents).toContain('chat');
    client.disconnect();
  });

  // ─── presence routing ────────────────────────────────────

  it('routes presence.enter to channel presence', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');
    await client.connect();

    const members: unknown[] = [];
    client.channel('room').presence.onEnter((m) => members.push(m));

    await new Promise((r) => setTimeout(r, 20));
    const serverWs = serverClients[serverClients.length - 1];

    serverWs.send(JSON.stringify({
      action: 'presence.enter',
      channel: 'room',
      data: { clientId: 'u1', joinedAt: Date.now() },
    }));

    await new Promise((r) => setTimeout(r, 20));
    expect(members).toHaveLength(1);
    expect((members[0] as any).clientId).toBe('u1');

    client.disconnect();
  });

  it('routes presence.members to channel presence', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');
    await client.connect();

    let memberList: unknown[] = [];
    client.channel('room').presence.onMembers((m) => { memberList = m; });

    await new Promise((r) => setTimeout(r, 20));
    const serverWs = serverClients[serverClients.length - 1];

    serverWs.send(JSON.stringify({
      action: 'presence.members',
      channel: 'room',
      data: [
        { clientId: 'u1', joinedAt: 1000 },
        { clientId: 'u2', joinedAt: 2000 },
      ],
    }));

    await new Promise((r) => setTimeout(r, 20));
    expect(memberList).toHaveLength(2);

    client.disconnect();
  });

  // ─── history routing ──────────────────────────────────────

  it('routes history results to channel onHistory callback', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');
    await client.connect();

    const historyResults: unknown[] = [];
    client.channel('chat').onHistory((r) => historyResults.push(r));

    await new Promise((r) => setTimeout(r, 20));
    const serverWs = serverClients[serverClients.length - 1];

    serverWs.send(JSON.stringify({
      action: 'history',
      channel: 'chat',
      data: {
        channel: 'chat',
        messages: [{ id: 'm1', channel: 'chat', data: 'hi', publisherId: 'u1', timestamp: 1000, sequence: 1 }],
        hasMore: false,
      },
    }));

    await new Promise((r) => setTimeout(r, 20));
    expect(historyResults).toHaveLength(1);

    client.disconnect();
  });

  // ─── error handling ──────────────────────────────────────

  it('emits error event when server sends error message', async () => {
    const client = new WSocket(`ws://localhost:${PORT}`, 'key');
    await client.connect();

    const errors: Error[] = [];
    client.on('error', (e) => errors.push(e as Error));

    await new Promise((r) => setTimeout(r, 20));
    const serverWs = serverClients[serverClients.length - 1];

    serverWs.send(JSON.stringify({ action: 'error', error: 'Channel not found' }));
    await new Promise((r) => setTimeout(r, 20));

    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Channel not found');

    client.disconnect();
  });

  it('rejects connect() when server is not available', async () => {
    const client = new WSocket('ws://localhost:19999', 'key', { autoReconnect: false });
    await expect(client.connect()).rejects.toThrow();
  });
});
