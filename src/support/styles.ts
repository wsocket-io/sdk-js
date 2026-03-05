/**
 * wSocket Support Widget — CSS-in-JS Styles
 *
 * All styles are injected inside Shadow DOM for isolation.
 * Theme colors can be customized via SupportWidgetConfig.
 */

export interface WidgetTheme {
  primaryColor: string;
  primaryHover: string;
  textOnPrimary: string;
  bgColor: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  inputBg: string;
  visitorBubble: string;
  agentBubble: string;
  systemColor: string;
  fontFamily: string;
  borderRadius: string;
}

export const DEFAULT_THEME: WidgetTheme = {
  primaryColor: '#6366f1',
  primaryHover: '#4f46e5',
  textOnPrimary: '#ffffff',
  bgColor: '#ffffff',
  textColor: '#1f2937',
  mutedColor: '#6b7280',
  borderColor: '#e5e7eb',
  inputBg: '#f9fafb',
  visitorBubble: '#6366f1',
  agentBubble: '#f3f4f6',
  systemColor: '#9ca3af',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  borderRadius: '16px',
};

export function buildStyles(t: WidgetTheme): string {
  return `
    :host {
      all: initial;
      font-family: ${t.fontFamily};
      font-size: 14px;
      color: ${t.textColor};
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ─── Bubble Button ─────────────────────────── */
    .ws-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: linear-gradient(135deg, ${t.primaryColor}, ${t.primaryHover});
      color: ${t.textOnPrimary};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(99,102,241,0.35), 0 2px 6px rgba(0,0,0,0.12);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s;
      z-index: 2147483647;
    }
    .ws-bubble:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 28px rgba(99,102,241,0.45), 0 3px 10px rgba(0,0,0,0.15);
    }
    .ws-bubble:active { transform: scale(0.95); }
    .ws-bubble svg { width: 26px; height: 26px; fill: currentColor; }
    .ws-bubble .ws-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      min-width: 20px;
      height: 20px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 5px;
      box-shadow: 0 2px 6px rgba(239,68,68,0.4);
      animation: ws-badge-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes ws-badge-pop {
      from { transform: scale(0); }
      to { transform: scale(1); }
    }

    /* ─── Chat Window ───────────────────────────── */
    .ws-window {
      position: fixed;
      bottom: 88px;
      right: 20px;
      width: 380px;
      max-width: calc(100vw - 32px);
      height: 520px;
      max-height: calc(100vh - 104px);
      background: ${t.bgColor};
      border-radius: ${t.borderRadius};
      box-shadow: 0 16px 48px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483646;
      animation: ws-slide-up 0.3s cubic-bezier(0.34,1.56,0.64,1);
      transition: box-shadow 0.2s;
    }
    .ws-window.open { display: flex; }
    .ws-window.ws-dragging {
      box-shadow: 0 24px 64px rgba(0,0,0,0.22), 0 8px 20px rgba(0,0,0,0.12);
      opacity: 0.96;
      transition: none;
    }
    .ws-window.ws-resizing { transition: none; }
    @keyframes ws-slide-up {
      from { opacity: 0; transform: translateY(16px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (max-width: 480px) {
      .ws-window {
        bottom: 0;
        right: 0;
        width: 100vw !important;
        height: 100vh !important;
        max-height: 100vh;
        max-width: 100vw;
        border-radius: 0;
      }
      .ws-bubble { bottom: 16px; right: 16px; }
      .ws-resize-grip { display: none !important; }
    }

    /* ─── Header ────────────────────────────────── */
    .ws-header {
      background: linear-gradient(135deg, ${t.primaryColor} 0%, ${t.primaryHover} 100%);
      color: ${t.textOnPrimary};
      padding: 16px 16px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      position: relative;
    }
    .ws-header::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
    }
    .ws-header:active { cursor: grabbing; }
    .ws-header-info { flex: 1; pointer-events: none; }
    .ws-header-title { font-size: 15px; font-weight: 700; letter-spacing: -0.01em; }
    .ws-header-status {
      font-size: 12px;
      opacity: 0.9;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 1px;
    }
    .ws-header-status .ws-dot {
      width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex-shrink: 0;
    }
    .ws-dot.online { background: #34d399; box-shadow: 0 0 6px rgba(52,211,153,0.6); }
    .ws-dot.offline { background: #fbbf24; box-shadow: 0 0 6px rgba(251,191,36,0.5); }
    .ws-header-close {
      background: rgba(255,255,255,0.1);
      border: none;
      color: ${t.textOnPrimary};
      cursor: pointer;
      width: 30px; height: 30px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      pointer-events: all;
      flex-shrink: 0;
    }
    .ws-header-close:hover { background: rgba(255,255,255,0.22); }
    .ws-header-close svg { width: 16px; height: 16px; fill: currentColor; }

    /* ─── Pre-chat Form ─────────────────────────── */
    .ws-prechat {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 32px 24px;
      gap: 14px;
    }
    .ws-prechat h3 {
      font-size: 20px;
      font-weight: 700;
      text-align: center;
      color: ${t.textColor};
      letter-spacing: -0.02em;
    }
    .ws-prechat p {
      font-size: 13px;
      color: ${t.mutedColor};
      text-align: center;
      line-height: 1.5;
    }
    .ws-prechat input {
      width: 100%;
      padding: 11px 14px;
      border: 1.5px solid ${t.borderColor};
      border-radius: 10px;
      font-size: 14px;
      font-family: inherit;
      background: ${t.inputBg};
      color: ${t.textColor};
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .ws-prechat input:focus {
      border-color: ${t.primaryColor};
      box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
    }
    .ws-prechat input::placeholder { color: ${t.mutedColor}; }
    .ws-prechat button {
      width: 100%;
      padding: 11px;
      background: linear-gradient(135deg, ${t.primaryColor}, ${t.primaryHover});
      color: ${t.textOnPrimary};
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 2px 8px rgba(99,102,241,0.25);
    }
    .ws-prechat button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(99,102,241,0.35);
    }
    .ws-prechat button:active { transform: translateY(0); }
    .ws-prechat button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

    /* ─── Messages ──────────────────────────────── */
    .ws-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      scroll-behavior: smooth;
      overscroll-behavior: contain;
    }
    .ws-messages::-webkit-scrollbar { width: 5px; }
    .ws-messages::-webkit-scrollbar-track { background: transparent; }
    .ws-messages::-webkit-scrollbar-thumb {
      background: ${t.borderColor};
      border-radius: 3px;
    }
    .ws-messages::-webkit-scrollbar-thumb:hover { background: ${t.mutedColor}; }

    /* ─── Message Rows ──────────────────────────── */
    .ws-msg-row {
      display: flex;
      align-items: flex-end;
      gap: 8px;
      max-width: 88%;
      animation: ws-msg-in 0.25s ease-out;
    }
    .ws-msg-row.visitor {
      align-self: flex-end;
      flex-direction: row-reverse;
    }
    .ws-msg-row.agent, .ws-msg-row.bot {
      align-self: flex-start;
    }
    .ws-msg-row.system {
      align-self: center;
      max-width: 100%;
    }
    @keyframes ws-msg-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ─── Avatar ─────────────────────────────────── */
    .ws-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-bottom: 2px;
    }
    .ws-avatar.agent {
      background: ${t.primaryColor};
      color: ${t.textOnPrimary};
    }
    .ws-avatar.bot {
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      color: ${t.textOnPrimary};
    }
    .ws-avatar svg { width: 16px; height: 16px; }

    /* ─── Message Bubble ─────────────────────────── */
    .ws-msg {
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 14px;
      line-height: 1.5;
      word-wrap: break-word;
      overflow-wrap: break-word;
      position: relative;
    }
    .ws-msg.visitor {
      background: linear-gradient(135deg, ${t.visitorBubble}, ${t.primaryHover});
      color: ${t.textOnPrimary};
      border-bottom-right-radius: 4px;
      box-shadow: 0 1px 3px rgba(99,102,241,0.2);
    }
    .ws-msg.agent, .ws-msg.bot {
      background: ${t.agentBubble};
      color: ${t.textColor};
      border-bottom-left-radius: 4px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .ws-msg.system {
      background: transparent;
      color: ${t.systemColor};
      font-size: 12px;
      padding: 4px 0;
      text-align: center;
    }
    .ws-msg-content { word-break: break-word; }
    .ws-msg-time {
      font-size: 10px;
      opacity: 0.55;
      margin-top: 4px;
      line-height: 1;
    }
    .ws-msg.visitor .ws-msg-time { text-align: right; }

    /* ─── Formatted Content ─────────────────────── */
    .ws-msg-content strong { font-weight: 700; }
    .ws-msg-content em { font-style: italic; }
    .ws-msg-content .ws-link {
      color: inherit;
      text-decoration: underline;
      text-underline-offset: 2px;
      word-break: break-all;
    }
    .ws-msg.visitor .ws-link { color: rgba(255,255,255,0.9); }
    .ws-msg-content .ws-code-inline {
      background: rgba(0,0,0,0.06);
      padding: 1px 5px;
      border-radius: 4px;
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 12.5px;
    }
    .ws-msg.visitor .ws-code-inline {
      background: rgba(255,255,255,0.18);
    }
    .ws-msg-content .ws-code-block {
      background: rgba(0,0,0,0.06);
      padding: 8px 10px;
      border-radius: 6px;
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      margin: 6px 0;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .ws-msg.visitor .ws-code-block {
      background: rgba(255,255,255,0.12);
    }
    .ws-msg-content .ws-code-block code {
      font-family: inherit;
      font-size: inherit;
    }
    .ws-msg-content .ws-list {
      margin: 4px 0;
      padding-left: 18px;
      list-style: disc;
    }
    .ws-msg-content .ws-list li {
      margin: 2px 0;
      line-height: 1.45;
    }

    /* ─── Typing Indicator ──────────────────────── */
    .ws-typing {
      align-self: flex-start;
      padding: 8px 14px;
      color: ${t.mutedColor};
      font-size: 13px;
      font-style: italic;
      display: none;
      align-items: center;
      gap: 4px;
    }
    .ws-typing.show { display: flex; }
    .ws-typing-dots {
      display: inline-flex; gap: 3px; margin-left: 4px; vertical-align: middle;
    }
    .ws-typing-dots span {
      width: 5px; height: 5px; border-radius: 50%; background: ${t.mutedColor};
      animation: ws-dot-bounce 1.2s infinite;
    }
    .ws-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .ws-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes ws-dot-bounce {
      0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
      40% { opacity: 1; transform: translateY(-3px); }
    }

    /* ─── Input Area ────────────────────────────── */
    .ws-input-area {
      border-top: 1px solid ${t.borderColor};
      padding: 10px 12px;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      flex-shrink: 0;
      background: ${t.bgColor};
    }
    .ws-textarea {
      flex: 1;
      resize: none;
      border: 1.5px solid ${t.borderColor};
      border-radius: 12px;
      padding: 9px 14px;
      font-size: 14px;
      font-family: inherit;
      line-height: 1.4;
      max-height: 80px;
      background: ${t.inputBg};
      color: ${t.textColor};
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .ws-textarea:focus {
      border-color: ${t.primaryColor};
      box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
    }
    .ws-textarea::placeholder { color: ${t.mutedColor}; }
    .ws-send-btn {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      border: none;
      background: linear-gradient(135deg, ${t.primaryColor}, ${t.primaryHover});
      color: ${t.textOnPrimary};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 2px 6px rgba(99,102,241,0.25);
    }
    .ws-send-btn:hover {
      transform: scale(1.06);
      box-shadow: 0 3px 10px rgba(99,102,241,0.35);
    }
    .ws-send-btn:active { transform: scale(0.95); }
    .ws-send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
    .ws-send-btn svg { width: 16px; height: 16px; fill: currentColor; }

    /* ─── Resize Grip ───────────────────────────── */
    .ws-resize-grip {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 20px;
      height: 20px;
      cursor: nwse-resize;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s;
      z-index: 10;
      border-radius: 0 0 ${t.borderRadius} 0;
    }
    .ws-window:hover .ws-resize-grip { opacity: 0.6; }
    .ws-resize-grip:hover { opacity: 1 !important; }

    /* ─── Powered By ────────────────────────────── */
    .ws-powered {
      text-align: center;
      padding: 5px;
      font-size: 10px;
      color: ${t.mutedColor};
      border-top: 1px solid ${t.borderColor};
      flex-shrink: 0;
      background: ${t.bgColor};
    }
    .ws-powered a {
      color: ${t.primaryColor};
      text-decoration: none;
      font-weight: 700;
    }
    .ws-powered a:hover { text-decoration: underline; }

    /* ─── Closed Conversation Banner ────────────── */
    .ws-closed-banner {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px 20px;
      border-top: 1px solid ${t.borderColor};
      background: linear-gradient(to bottom, ${t.inputBg}, ${t.bgColor});
      flex-shrink: 0;
      gap: 8px;
    }
    .ws-closed-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(16,185,129,0.08);
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }
    .ws-closed-title {
      font-size: 16px;
      font-weight: 700;
      color: ${t.textColor};
      letter-spacing: -0.01em;
    }
    .ws-closed-desc {
      font-size: 13px;
      color: ${t.mutedColor};
      line-height: 1.5;
      max-width: 260px;
    }
    .ws-closed-btn {
      margin-top: 8px;
      padding: 10px 24px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, ${t.primaryColor}, ${t.primaryHover});
      color: ${t.textOnPrimary};
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      font-family: inherit;
      box-shadow: 0 2px 8px rgba(99,102,241,0.25);
    }
    .ws-closed-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(99,102,241,0.35);
    }
    .ws-closed-btn:active { transform: scale(0.98); }

    /* ─── CSAT Rating ──────────────────────────── */
    .ws-csat-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      width: 100%;
    }
    .ws-csat-label {
      font-size: 13px;
      font-weight: 600;
      color: ${t.textColor};
    }
    .ws-csat-stars {
      display: flex;
      gap: 4px;
    }
    .ws-csat-star {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      color: ${t.borderColor};
      transition: color 0.15s, transform 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ws-csat-star svg { fill: currentColor; }
    .ws-csat-star.active { color: #f59e0b; }
    .ws-csat-star.hover { color: #fbbf24; transform: scale(1.2); }
    .ws-csat-star:active { transform: scale(0.9); }
    .ws-csat-comment {
      width: 100%;
      max-width: 260px;
      padding: 8px 10px;
      border: 1.5px solid ${t.borderColor};
      border-radius: 8px;
      background: ${t.bgColor};
      color: ${t.textColor};
      font-size: 12px;
      font-family: inherit;
      resize: none;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .ws-csat-comment:focus {
      border-color: ${t.primaryColor};
      box-shadow: 0 0 0 3px rgba(99,102,241,0.08);
    }
    .ws-csat-comment::placeholder { color: ${t.mutedColor}; }
    .ws-csat-submit {
      padding: 8px 22px;
      border-radius: 8px;
      border: none;
      background: linear-gradient(135deg, ${t.primaryColor}, ${t.primaryHover});
      color: ${t.textOnPrimary};
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      font-family: inherit;
      box-shadow: 0 2px 6px rgba(99,102,241,0.2);
    }
    .ws-csat-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 3px 10px rgba(99,102,241,0.3);
    }
    .ws-csat-submit:disabled { cursor: not-allowed; opacity: 0.5; }
    .ws-csat-thanks {
      font-size: 13px;
      font-weight: 600;
      color: #10b981;
      padding: 8px 0;
    }

    /* ─── KB Suggestions ───────────────────────── */
    .ws-kb-suggestions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px 6px;
      margin-bottom: 4px;
    }
    .ws-kb-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${t.mutedColor};
      margin-bottom: 2px;
    }
    .ws-kb-card {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 10px 12px;
      border: 1.5px solid ${t.borderColor};
      border-radius: 10px;
      background: ${t.bgColor};
      cursor: pointer;
      text-align: left;
      transition: border-color 0.2s, background 0.2s, transform 0.15s;
      font-family: inherit;
    }
    .ws-kb-card:hover {
      border-color: ${t.primaryColor};
      background: ${t.inputBg};
      transform: translateY(-1px);
    }
    .ws-kb-card:active { transform: translateY(0); }
    .ws-kb-card-title {
      font-size: 13px;
      font-weight: 600;
      color: ${t.textColor};
      line-height: 1.3;
    }
    .ws-kb-card-desc {
      font-size: 11px;
      color: ${t.mutedColor};
      line-height: 1.4;
    }
  `;
}
