// ─── Browser WebSocket shim ─────────────────────────────────
// Wraps the native browser WebSocket with a Node-style .on() API
// so the same WSocket client code works in both Node.js and browsers.

type Listener = (...args: any[]) => void;

class BrowserWebSocket {
  private _ws: WebSocket;
  private _listeners = new Map<string, Set<Listener>>();

  /** Matches ws.readyState constants */
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  constructor(url: string) {
    this._ws = new WebSocket(url);

    this._ws.onopen = () => this._emit('open');
    this._ws.onmessage = (ev) => this._emit('message', ev.data);
    this._ws.onclose = (ev) => this._emit('close', ev.code);
    this._ws.onerror = (ev) => this._emit('error', new Error('WebSocket error'));
  }

  get readyState(): number {
    return this._ws.readyState;
  }

  on(event: string, fn: Listener): this {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event)!.add(fn);
    return this;
  }

  send(data: string): void {
    this._ws.send(data);
  }

  close(code?: number, reason?: string): void {
    this._ws.close(code, reason);
  }

  private _emit(event: string, ...args: any[]): void {
    const set = this._listeners.get(event);
    if (set) for (const fn of set) fn(...args);
  }
}

export default BrowserWebSocket;
