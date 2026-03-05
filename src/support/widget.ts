/**
 * wSocket Support Widget
 *
 * Embeddable chat widget using Shadow DOM for CSS isolation.
 * No framework dependency — pure DOM manipulation for minimal bundle.
 *
 * Usage:
 *   <script src="https://cdn.wsocket.io/support.js" data-org="ORG_ID"></script>
 *
 * Or programmatic:
 *   const widget = new SupportWidget({ serverUrl: '...', orgId: '...' });
 *   widget.mount();
 */

import { buildStyles, DEFAULT_THEME, type WidgetTheme } from './styles.js';
import { getStrings, relativeTime, type WidgetStrings } from './i18n.js';

// ─── Icons (inline SVG) ────────────────────────────────────

const ICON_CHAT = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.2L4 17.2V4h16v12z"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
const ICON_SEND = '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>';
const ICON_AVATAR = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.73 0-5.16-1.39-6.57-3.5C6.95 14.56 10 13.5 12 13.5s5.05 1.06 6.57 2.99C17.16 18.61 14.73 20 12 20z"/></svg>';
const ICON_BOT = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 110 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 110-2h1a7 7 0 017-7h1V5.73A2 2 0 0112 2zM9.5 14a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm5 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z"/></svg>';
const ICON_RESIZE = '<svg viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" opacity="0.4" d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14ZM14 6H12V4H14V6ZM10 10H8V8H10V10ZM6 14H4V12H6V14Z"/></svg>';

// ─── Types ──────────────────────────────────────────────────

export interface SupportWidgetConfig {
  serverUrl: string;
  orgId: string;
  apiKey: string;
  theme?: Partial<WidgetTheme>;
  locale?: string;
  position?: 'right' | 'left';
  headerTitle?: string;
  preChatFields?: ('name' | 'email')[];
  agentOnline?: boolean;
}

interface Message {
  messageId: string;
  sender: 'visitor' | 'agent' | 'bot' | 'system';
  content: string;
  createdAt: Date;
}

const STORAGE_KEY = 'wsocket_support';

interface StoredSession {
  visitorId: string;
  conversationId: string | null;
  visitorName: string;
  visitorEmail: string;
}

// ─── Widget Class ───────────────────────────────────────────

export class SupportWidget {
  private config: SupportWidgetConfig;
  private theme: WidgetTheme;
  private strings: WidgetStrings;
  private host: HTMLElement | null = null;
  private shadow: ShadowRoot | null = null;

  // DOM refs
  private bubble: HTMLElement | null = null;
  private badge: HTMLElement | null = null;
  private window: HTMLElement | null = null;
  private prechatView: HTMLElement | null = null;
  private chatView: HTMLElement | null = null;
  private messageList: HTMLElement | null = null;
  private typingIndicator: HTMLElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private sendBtn: HTMLButtonElement | null = null;
  private inputArea: HTMLElement | null = null;
  private closedBanner: HTMLElement | null = null;

  // State
  private isOpen = false;
  private visitorId: string;
  private visitorName = '';
  private visitorEmail = '';
  private conversationId: string | null = null;
  private conversationClosed = false;
  private messages: Message[] = [];
  private unreadCount = 0;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private audioCtx: AudioContext | null = null;

  // Drag state
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private windowX = 0;
  private windowY = 0;
  private hasDragMoved = false;
  private dragBound: { move: (e: MouseEvent | TouchEvent) => void; end: (e: MouseEvent | TouchEvent) => void } | null = null;

  // Resize state
  private isResizing = false;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartW = 380;
  private resizeStartH = 520;
  private currentW = 380;
  private currentH = 520;
  private resizeBound: { move: (e: MouseEvent | TouchEvent) => void; end: (e: MouseEvent | TouchEvent) => void } | null = null;

  constructor(config: SupportWidgetConfig) {
    this.config = config;
    this.theme = { ...DEFAULT_THEME, ...(config.theme || {}) };
    this.strings = getStrings(config.locale);
    if (config.headerTitle) this.strings.headerTitle = config.headerTitle;

    // Restore or create visitor session
    const stored = this.loadSession();
    this.visitorId = stored?.visitorId || this.generateVisitorId();
    this.conversationId = stored?.conversationId || null;
    this.visitorName = stored?.visitorName || '';
    this.visitorEmail = stored?.visitorEmail || '';
  }

  // ─── Lifecycle ────────────────────────────────────────────

  mount(container?: HTMLElement): void {
    const parent = container || document.body;

    this.host = document.createElement('div');
    this.host.id = 'wsocket-support-widget';
    parent.appendChild(this.host);

    this.shadow = this.host.attachShadow({ mode: 'open' });

    // Inject styles
    const style = document.createElement('style');
    style.textContent = buildStyles(this.theme);
    this.shadow.appendChild(style);

    // Build DOM
    this.buildBubble();
    this.buildWindow();

    // If we have an existing conversation, go straight to chat
    if (this.conversationId) {
      this.showChat();
      this.loadMessages();
    }

    // Connect WebSocket for realtime
    this.connectWs();
  }

  destroy(): void {
    this.disconnectWs();
    if (this.host) {
      this.host.remove();
      this.host = null;
      this.shadow = null;
    }
  }

  // ─── DOM Construction ─────────────────────────────────────

  private buildBubble(): void {
    this.bubble = document.createElement('button');
    this.bubble.className = 'ws-bubble';
    this.bubble.setAttribute('aria-label', this.strings.headerTitle);
    this.bubble.innerHTML = ICON_CHAT;
    this.bubble.addEventListener('click', () => this.toggle());

    this.badge = document.createElement('span');
    this.badge.className = 'ws-badge';
    this.badge.style.display = 'none';
    this.bubble.appendChild(this.badge);

    if (this.config.position === 'left') {
      this.bubble.style.left = '20px';
      this.bubble.style.right = 'auto';
    }

    this.shadow!.appendChild(this.bubble);
  }

  private buildWindow(): void {
    this.window = document.createElement('div');
    this.window.className = 'ws-window';
    this.window.setAttribute('role', 'dialog');
    this.window.setAttribute('aria-label', this.strings.headerTitle);

    if (this.config.position === 'left') {
      this.window.style.left = '20px';
      this.window.style.right = 'auto';
    }

    // Header
    const header = document.createElement('div');
    header.className = 'ws-header';

    // Drag handle area
    header.addEventListener('mousedown', (e) => this.initDrag(e));
    header.addEventListener('touchstart', (e) => this.initDrag(e), { passive: false });

    const headerInfo = document.createElement('div');
    headerInfo.className = 'ws-header-info';

    const title = document.createElement('div');
    title.className = 'ws-header-title';
    title.textContent = this.strings.headerTitle;

    const status = document.createElement('div');
    status.className = 'ws-header-status';
    const online = this.config.agentOnline !== false;
    status.innerHTML = `<span class="ws-dot ${online ? 'online' : 'offline'}"></span> ${online ? this.strings.headerOnline : this.strings.headerOffline}`;

    headerInfo.appendChild(title);
    headerInfo.appendChild(status);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ws-header-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = ICON_CLOSE;
    closeBtn.addEventListener('click', () => this.toggle());

    header.appendChild(headerInfo);
    header.appendChild(closeBtn);
    this.window.appendChild(header);

    // Pre-chat form
    this.prechatView = this.buildPrechat();
    this.window.appendChild(this.prechatView);

    // Chat view (messages + input)
    this.chatView = this.buildChatView();
    this.chatView.style.display = 'none';
    this.window.appendChild(this.chatView);

    // Resize grip
    const resizeGrip = document.createElement('div');
    resizeGrip.className = 'ws-resize-grip';
    resizeGrip.innerHTML = ICON_RESIZE;
    resizeGrip.addEventListener('mousedown', (e) => this.initResize(e));
    resizeGrip.addEventListener('touchstart', (e) => this.initResize(e), { passive: false });
    this.window.appendChild(resizeGrip);

    // Powered by
    const powered = document.createElement('div');
    powered.className = 'ws-powered';
    powered.innerHTML = `${this.strings.poweredBy} <a href="https://wsocket.io" target="_blank" rel="noopener">wSocket</a>`;
    this.window.appendChild(powered);

    this.shadow!.appendChild(this.window);
  }

  private buildPrechat(): HTMLElement {
    const form = document.createElement('div');
    form.className = 'ws-prechat';

    const h3 = document.createElement('h3');
    h3.textContent = this.strings.prechatTitle;
    form.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = this.strings.prechatSubtitle;
    form.appendChild(p);

    const fields = this.config.preChatFields || ['name', 'email'];

    let nameInput: HTMLInputElement | null = null;
    let emailInput: HTMLInputElement | null = null;

    if (fields.includes('name')) {
      nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.placeholder = this.strings.prechatName;
      nameInput.value = this.visitorName;
      nameInput.setAttribute('aria-label', this.strings.prechatName);
      form.appendChild(nameInput);
    }

    if (fields.includes('email')) {
      emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.placeholder = this.strings.prechatEmail;
      emailInput.value = this.visitorEmail;
      emailInput.setAttribute('aria-label', this.strings.prechatEmail);
      form.appendChild(emailInput);
    }

    const btn = document.createElement('button');
    btn.textContent = this.strings.prechatStart;
    btn.addEventListener('click', async () => {
      this.visitorName = nameInput?.value.trim() || 'Visitor';
      this.visitorEmail = emailInput?.value.trim() || '';
      btn.disabled = true;
      btn.textContent = '...';
      try {
        await this.startConversation();
        this.showChat();
        // Load messages (includes chatbot greeting sent by server)
        await this.loadMessages();
        // Subscribe to realtime updates for this conversation
        this.subscribeToConversation();
      } catch (e: any) {
        btn.disabled = false;
        btn.textContent = this.strings.prechatStart;
        console.error('[wSocket Support] Failed to start conversation:', e);
      }
    });
    form.appendChild(btn);

    // Enter key on inputs triggers start
    [nameInput, emailInput].forEach((input) => {
      if (!input) return;
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btn.click();
      });
    });

    return form;
  }

  private buildChatView(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.flex = '1';
    wrapper.style.overflow = 'hidden';

    // Messages
    this.messageList = document.createElement('div');
    this.messageList.className = 'ws-messages';
    this.messageList.setAttribute('role', 'log');
    this.messageList.setAttribute('aria-live', 'polite');
    wrapper.appendChild(this.messageList);

    // Typing indicator
    this.typingIndicator = document.createElement('div');
    this.typingIndicator.className = 'ws-typing';
    this.typingIndicator.innerHTML = `${this.strings.typing}<span class="ws-typing-dots"><span></span><span></span><span></span></span>`;
    this.messageList.appendChild(this.typingIndicator);

    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'ws-input-area';
    this.inputArea = inputArea;

    this.textarea = document.createElement('textarea');
    this.textarea.className = 'ws-textarea';
    this.textarea.rows = 1;
    this.textarea.placeholder = this.strings.inputPlaceholder;
    this.textarea.setAttribute('aria-label', this.strings.inputPlaceholder);
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });
    this.textarea.addEventListener('input', () => this.autoGrow());

    this.sendBtn = document.createElement('button') as HTMLButtonElement;
    this.sendBtn.className = 'ws-send-btn';
    this.sendBtn.setAttribute('aria-label', 'Send');
    this.sendBtn.innerHTML = ICON_SEND;
    this.sendBtn.addEventListener('click', () => this.sendMessage());

    inputArea.appendChild(this.textarea);
    inputArea.appendChild(this.sendBtn);
    wrapper.appendChild(inputArea);

    return wrapper;
  }

  // ─── UI Actions ───────────────────────────────────────────

  private toggle(): void {
    this.isOpen = !this.isOpen;
    this.window?.classList.toggle('open', this.isOpen);
    if (this.isOpen) {
      this.unreadCount = 0;
      this.updateBadge();
      this.scrollToBottom();
      setTimeout(() => this.textarea?.focus(), 200);
    }
  }

  private showChat(): void {
    if (this.prechatView) this.prechatView.style.display = 'none';
    if (this.chatView) this.chatView.style.display = 'flex';
  }

  private autoGrow(): void {
    if (!this.textarea) return;
    this.textarea.style.height = 'auto';
    this.textarea.style.height = Math.min(this.textarea.scrollHeight, 80) + 'px';
  }

  private scrollToBottom(): void {
    if (!this.messageList) return;
    requestAnimationFrame(() => {
      this.messageList!.scrollTop = this.messageList!.scrollHeight;
    });
  }

  private updateBadge(): void {
    if (!this.badge) return;
    if (this.unreadCount > 0 && !this.isOpen) {
      this.badge.textContent = String(this.unreadCount);
      this.badge.style.display = 'flex';
    } else {
      this.badge.style.display = 'none';
    }
  }

  private appendMessage(msg: Message): void {
    if (!this.messageList || !this.typingIndicator) return;

    const row = document.createElement('div');
    row.className = `ws-msg-row ${msg.sender}`;

    // Avatar for agent/bot
    if (msg.sender === 'agent' || msg.sender === 'bot') {
      const avatar = document.createElement('div');
      avatar.className = `ws-avatar ${msg.sender}`;
      avatar.innerHTML = msg.sender === 'bot' ? ICON_BOT : ICON_AVATAR;
      row.appendChild(avatar);
    }

    const el = document.createElement('div');
    el.className = `ws-msg ${msg.sender}`;

    const content = document.createElement('div');
    content.className = 'ws-msg-content';
    content.innerHTML = this.formatMessage(msg.content);
    el.appendChild(content);

    if (msg.sender !== 'system') {
      const time = document.createElement('div');
      time.className = 'ws-msg-time';
      time.textContent = relativeTime(msg.createdAt, this.strings);
      el.appendChild(time);
    }

    row.appendChild(el);

    // Insert before typing indicator
    this.messageList.insertBefore(row, this.typingIndicator);
    this.scrollToBottom();
  }

  // ─── Message Formatting ───────────────────────────────────

  private formatMessage(text: string): string {
    // Escape HTML
    let s = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // Code blocks (```...```)
    s = s.replace(/```([\s\S]*?)```/g, '<pre class="ws-code-block"><code>$1</code></pre>');

    // Inline code (`...`)
    s = s.replace(/`([^`]+)`/g, '<code class="ws-code-inline">$1</code>');

    // Bold (**...**)
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Italic (*...*) — but not inside ** pairs
    s = s.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

    // Auto-link URLs
    s = s.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener" class="ws-link">$1</a>'
    );

    // Bullet lists (lines starting with - or • or *)
    s = s.replace(/^[•\-\*]\s+(.+)$/gm, '<li>$1</li>');
    s = s.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul class="ws-list">${match}</ul>`);

    // Line breaks
    s = s.replace(/\n/g, '<br>');

    return s;
  }

  // ─── API Calls ────────────────────────────────────────────

  private async apiCall(method: string, path: string, body?: unknown): Promise<any> {
    const url = `${this.config.serverUrl}/api/support${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  private async startConversation(): Promise<void> {
    const data = await this.apiCall('POST', '/conversations', {
      visitorId: this.visitorId,
      channel: 'web',
      metadata: {
        name: this.visitorName,
        email: this.visitorEmail || undefined,
        currentPage: window.location.href,
        browser: navigator.userAgent,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    this.conversationId = data.conversation.conversationId;
    this.saveSession();
  }

  private async loadMessages(): Promise<void> {
    if (!this.conversationId) return;
    try {
      const data = await this.apiCall('GET', `/conversations/${this.conversationId}/messages?limit=50&excludeInternalNotes=true`);
      for (const msg of (data.messages || [])) {
        const m: Message = {
          messageId: msg.messageId,
          sender: msg.sender,
          content: msg.content,
          createdAt: new Date(msg.createdAt),
        };
        this.messages.push(m);
        this.appendMessage(m);
      }

      // Check if conversation is already closed/resolved
      try {
        const convData = await this.apiCall('GET', `/conversations/${this.conversationId}`);
        const status = convData?.conversation?.status;
        if (status === 'closed' || status === 'resolved') {
          this.showConversationClosed();
          return;
        }
      } catch { /* ignore — conversation status check is best-effort */ }

      // Show KB article suggestions if this is a fresh conversation (few messages)
      if (this.messages.length <= 3) {
        this.loadKBSuggestions();
      }
    } catch (e) {
      console.error('[wSocket Support] Failed to load messages:', e);
    }
  }

  private async loadKBSuggestions(): Promise<void> {
    try {
      const data = await this.apiCall('GET', '/kb/articles?status=published&limit=4');
      const articles = data?.articles || [];
      if (articles.length === 0) return;

      this.renderKBSuggestions(articles);
    } catch {
      /* KB not available — skip */
    }
  }

  private renderKBSuggestions(articles: { articleId: string; title: string; excerpt?: string }[]): void {
    if (!this.messageList || !this.typingIndicator) return;

    const container = document.createElement('div');
    container.className = 'ws-kb-suggestions';

    const label = document.createElement('div');
    label.className = 'ws-kb-label';
    label.textContent = this.strings.kbSuggestionsTitle;
    container.appendChild(label);

    for (const article of articles) {
      const card = document.createElement('button');
      card.className = 'ws-kb-card';
      card.addEventListener('click', () => {
        // Send the article title as a visitor message
        if (this.textarea) {
          this.textarea.value = article.title;
          this.sendMessage();
        }
        // Remove suggestions after selection
        container.remove();
      });

      const cardTitle = document.createElement('div');
      cardTitle.className = 'ws-kb-card-title';
      cardTitle.textContent = article.title;
      card.appendChild(cardTitle);

      if (article.excerpt) {
        const cardDesc = document.createElement('div');
        cardDesc.className = 'ws-kb-card-desc';
        cardDesc.textContent = article.excerpt.substring(0, 80) + (article.excerpt.length > 80 ? '...' : '');
        card.appendChild(cardDesc);
      }

      container.appendChild(card);
    }

    this.messageList.insertBefore(container, this.typingIndicator);
    this.scrollToBottom();
  }

  private async sendMessage(): Promise<void> {
    if (!this.textarea || !this.conversationId) return;
    const content = this.textarea.value.trim();
    if (!content) return;

    this.textarea.value = '';
    this.autoGrow();

    // Optimistic append
    const tempMsg: Message = {
      messageId: 'temp_' + Date.now(),
      sender: 'visitor',
      content,
      createdAt: new Date(),
    };
    this.messages.push(tempMsg);
    this.appendMessage(tempMsg);

    try {
      await this.apiCall('POST', `/conversations/${this.conversationId}/messages`, {
        sender: 'visitor',
        senderId: this.visitorId,
        content,
      });
    } catch (e) {
      console.error('[wSocket Support] Failed to send message:', e);
    }
  }

  // ─── WebSocket (Realtime) ─────────────────────────────────

  private connectWs(): void {
    if (!this.config.serverUrl) return;
    try {
      const wsUrl = this.config.serverUrl
        .replace(/^http/, 'ws')
        + `/?key=${encodeURIComponent(this.config.apiKey)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Subscribe to conversation channel if we have one
        if (this.conversationId) {
          this.subscribeToConversation();
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWsMessage(data);
        } catch { /* ignore parse errors */ }
      };

      this.ws.onclose = () => {
        // Reconnect after 3s
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connectWs(), 3000);
      };

      this.ws.onerror = () => {
        /* onclose will fire next */
      };
    } catch {
      // WebSocket not available
    }
  }

  private disconnectWs(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private subscribeToConversation(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.conversationId) return;
    const channel = `support:${this.config.orgId}:conv:${this.conversationId}`;
    this.ws.send(JSON.stringify({
      action: 'subscribe',
      channel,
    }));
  }

  private handleWsMessage(data: any): void {
    // Handle pubsub messages on the conversation channel
    if (data.action === 'message' && data.data?.event === 'message.new') {
      const msg = data.data.message;
      if (!msg || msg.sender === 'visitor') return; // don't duplicate our own messages

      const newMsg: Message = {
        messageId: msg.messageId,
        sender: msg.sender,
        content: msg.content,
        createdAt: new Date(msg.createdAt),
      };
      this.messages.push(newMsg);
      this.appendMessage(newMsg);

      if (!this.isOpen) {
        this.unreadCount++;
        this.updateBadge();
      }

      // Play notification sound for agent messages
      this.playNotificationSound();
    }

    // Typing indicator
    if (data.action === 'message' && data.data?.event === 'typing.start') {
      this.showTyping(true);
    }
    if (data.action === 'message' && data.data?.event === 'typing.stop') {
      this.showTyping(false);
    }

    // Conversation closed
    if (data.action === 'message' && data.data?.event === 'conversation.closed') {
      this.showConversationClosed();
    }
  }

  private showConversationClosed(): void {
    this.conversationClosed = true;

    // Hide input area
    if (this.inputArea) this.inputArea.style.display = 'none';

    // Remove any existing banner
    if (this.closedBanner) this.closedBanner.remove();

    // Create closed conversation banner
    this.closedBanner = document.createElement('div');
    this.closedBanner.className = 'ws-closed-banner';

    const icon = document.createElement('div');
    icon.className = 'ws-closed-icon';
    icon.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

    const title = document.createElement('div');
    title.className = 'ws-closed-title';
    title.textContent = this.strings.conversationClosed;

    const desc = document.createElement('div');
    desc.className = 'ws-closed-desc';
    desc.textContent = this.strings.conversationEndedDesc;

    // ─── CSAT Rating ──────────────────────────────────────
    const csatSection = document.createElement('div');
    csatSection.className = 'ws-csat-section';

    const csatLabel = document.createElement('div');
    csatLabel.className = 'ws-csat-label';
    csatLabel.textContent = this.strings.rateExperience;
    csatSection.appendChild(csatLabel);

    const starsContainer = document.createElement('div');
    starsContainer.className = 'ws-csat-stars';
    let selectedRating = 0;
    const starSvg = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>';
    const starButtons: HTMLButtonElement[] = [];
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement('button');
      star.className = 'ws-csat-star';
      star.innerHTML = starSvg;
      star.dataset.value = String(i);
      star.addEventListener('mouseenter', () => {
        starButtons.forEach((s, idx) => {
          s.classList.toggle('hover', idx < i);
        });
      });
      star.addEventListener('mouseleave', () => {
        starButtons.forEach((s) => s.classList.remove('hover'));
      });
      star.addEventListener('click', () => {
        selectedRating = i;
        starButtons.forEach((s, idx) => {
          s.classList.toggle('active', idx < i);
        });
      });
      starButtons.push(star);
      starsContainer.appendChild(star);
    }
    csatSection.appendChild(starsContainer);

    const commentArea = document.createElement('textarea');
    commentArea.className = 'ws-csat-comment';
    commentArea.placeholder = this.strings.addComment;
    commentArea.rows = 2;
    csatSection.appendChild(commentArea);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'ws-csat-submit';
    submitBtn.textContent = this.strings.submitRating;
    submitBtn.addEventListener('click', async () => {
      if (selectedRating === 0) return;
      submitBtn.disabled = true;
      submitBtn.textContent = '...';
      try {
        await this.submitCSAT(selectedRating, commentArea.value.trim());
        // Replace CSAT section with thanks message
        csatSection.innerHTML = '';
        const thanks = document.createElement('div');
        thanks.className = 'ws-csat-thanks';
        thanks.textContent = this.strings.ratingSent;
        csatSection.appendChild(thanks);
      } catch {
        submitBtn.disabled = false;
        submitBtn.textContent = this.strings.submitRating;
      }
    });
    csatSection.appendChild(submitBtn);

    const btn = document.createElement('button');
    btn.className = 'ws-closed-btn';
    btn.textContent = this.strings.startNewConversation;
    btn.addEventListener('click', () => this.startNewConversationFlow());

    this.closedBanner.appendChild(icon);
    this.closedBanner.appendChild(title);
    this.closedBanner.appendChild(desc);
    this.closedBanner.appendChild(csatSection);
    this.closedBanner.appendChild(btn);

    // Insert banner at the end of the chat view
    if (this.chatView) this.chatView.appendChild(this.closedBanner);
    this.scrollToBottom();
  }

  private async submitCSAT(rating: number, comment: string): Promise<void> {
    if (!this.conversationId) return;
    await this.apiCall('POST', `/conversations/${this.conversationId}/csat`, { rating, comment });
  }

  private startNewConversationFlow(): void {
    // Reset conversation state
    this.conversationId = null;
    this.conversationClosed = false;
    this.messages = [];
    this.saveSession();

    // Clear message list
    if (this.messageList) {
      while (this.messageList.firstChild) {
        this.messageList.removeChild(this.messageList.firstChild);
      }
      // Re-add typing indicator
      if (this.typingIndicator) this.messageList.appendChild(this.typingIndicator);
    }

    // Remove closed banner
    if (this.closedBanner) {
      this.closedBanner.remove();
      this.closedBanner = null;
    }

    // Show input area again
    if (this.inputArea) this.inputArea.style.display = '';

    // Show pre-chat form
    if (this.prechatView) this.prechatView.style.display = '';
    if (this.chatView) this.chatView.style.display = 'none';
  }

  private showTyping(show: boolean): void {
    if (this.typingIndicator) {
      this.typingIndicator.classList.toggle('show', show);
      if (show) this.scrollToBottom();
    }
  }

  // ─── Drag & Drop ───────────────────────────────────────

  private initDrag(e: MouseEvent | TouchEvent): void {
    // Don't drag if clicking on buttons
    const target = e.target as HTMLElement;
    if (target.closest('.ws-header-close') || target.closest('button')) return;

    e.preventDefault();
    this.isDragging = true;
    this.hasDragMoved = false;

    const pos = 'touches' in e ? e.touches[0] : e;
    this.dragStartX = pos.clientX;
    this.dragStartY = pos.clientY;

    // Get current window position
    if (!this.windowX && !this.windowY && this.window) {
      const rect = this.window.getBoundingClientRect();
      this.windowX = rect.left;
      this.windowY = rect.top;
    }

    this.dragBound = {
      move: (ev: MouseEvent | TouchEvent) => this.onDrag(ev),
      end: (ev: MouseEvent | TouchEvent) => this.endDrag(ev),
    };

    document.addEventListener('mousemove', this.dragBound.move);
    document.addEventListener('mouseup', this.dragBound.end);
    document.addEventListener('touchmove', this.dragBound.move, { passive: false });
    document.addEventListener('touchend', this.dragBound.end);

    this.window?.classList.add('ws-dragging');
  }

  private onDrag(e: MouseEvent | TouchEvent): void {
    if (!this.isDragging || !this.window) return;
    e.preventDefault();

    const pos = 'touches' in e ? e.touches[0] : e;
    const dx = pos.clientX - this.dragStartX;
    const dy = pos.clientY - this.dragStartY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) this.hasDragMoved = true;
    if (!this.hasDragMoved) return;

    const newX = this.windowX + dx;
    const newY = this.windowY + dy;

    // Clamp to viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = this.window.offsetWidth;
    const h = this.window.offsetHeight;
    const clampX = Math.max(0, Math.min(newX, vw - w));
    const clampY = Math.max(0, Math.min(newY, vh - h));

    this.window.style.left = clampX + 'px';
    this.window.style.top = clampY + 'px';
    this.window.style.right = 'auto';
    this.window.style.bottom = 'auto';
  }

  private endDrag(_e: MouseEvent | TouchEvent): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.window) {
      const rect = this.window.getBoundingClientRect();
      this.windowX = rect.left;
      this.windowY = rect.top;
      this.window.classList.remove('ws-dragging');
    }

    if (this.dragBound) {
      document.removeEventListener('mousemove', this.dragBound.move);
      document.removeEventListener('mouseup', this.dragBound.end);
      document.removeEventListener('touchmove', this.dragBound.move);
      document.removeEventListener('touchend', this.dragBound.end);
      this.dragBound = null;
    }
  }

  // ─── Resize ──────────────────────────────────────────

  private initResize(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isResizing = true;

    const pos = 'touches' in e ? e.touches[0] : e;
    this.resizeStartX = pos.clientX;
    this.resizeStartY = pos.clientY;
    this.resizeStartW = this.currentW;
    this.resizeStartH = this.currentH;

    this.resizeBound = {
      move: (ev: MouseEvent | TouchEvent) => this.onResize(ev),
      end: (ev: MouseEvent | TouchEvent) => this.endResize(ev),
    };

    document.addEventListener('mousemove', this.resizeBound.move);
    document.addEventListener('mouseup', this.resizeBound.end);
    document.addEventListener('touchmove', this.resizeBound.move, { passive: false });
    document.addEventListener('touchend', this.resizeBound.end);

    this.window?.classList.add('ws-resizing');
  }

  private onResize(e: MouseEvent | TouchEvent): void {
    if (!this.isResizing || !this.window) return;
    e.preventDefault();

    const pos = 'touches' in e ? e.touches[0] : e;
    // Resize from bottom-right: dragging right = wider, dragging down = taller
    const dx = pos.clientX - this.resizeStartX;
    const dy = pos.clientY - this.resizeStartY;

    const newW = Math.max(320, Math.min(this.resizeStartW + dx, window.innerWidth - 40));
    const newH = Math.max(400, Math.min(this.resizeStartH + dy, window.innerHeight - 40));

    this.currentW = newW;
    this.currentH = newH;
    this.window.style.width = newW + 'px';
    this.window.style.height = newH + 'px';
  }

  private endResize(_e: MouseEvent | TouchEvent): void {
    if (!this.isResizing) return;
    this.isResizing = false;

    this.window?.classList.remove('ws-resizing');

    if (this.resizeBound) {
      document.removeEventListener('mousemove', this.resizeBound.move);
      document.removeEventListener('mouseup', this.resizeBound.end);
      document.removeEventListener('touchmove', this.resizeBound.move);
      document.removeEventListener('touchend', this.resizeBound.end);
      this.resizeBound = null;
    }
  }

  private playNotificationSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const ctx = this.audioCtx;
      const duration = 0.15;
      const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / ctx.sampleRate;
        const freq = t < 0.07 ? 880 : 660;
        data[i] = Math.sin(2 * Math.PI * freq * t) * Math.max(0, 1 - t / duration) * 0.3;
      }
      const source = ctx.createBufferSource();
      source.buffer = buf;
      source.connect(ctx.destination);
      source.start();
    } catch { /* AudioContext not supported */ }
  }

  // ─── Persistence ──────────────────────────────────────────

  private loadSession(): StoredSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private saveSession(): void {
    try {
      const data: StoredSession = {
        visitorId: this.visitorId,
        conversationId: this.conversationId,
        visitorName: this.visitorName,
        visitorEmail: this.visitorEmail,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* localStorage unavailable */ }
  }

  private generateVisitorId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = 'vis_';
    for (let i = 0; i < 16; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }
}
