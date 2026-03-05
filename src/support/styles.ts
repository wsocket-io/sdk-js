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
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ─── Bubble Button ─────────────────────────── */
    .ws-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: ${t.primaryColor};
      color: ${t.textOnPrimary};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background 0.2s;
      z-index: 2147483647;
    }
    .ws-bubble:hover { background: ${t.primaryHover}; transform: scale(1.08); }
    .ws-bubble svg { width: 24px; height: 24px; fill: currentColor; }
    .ws-bubble .ws-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      min-width: 18px;
      height: 18px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 4px;
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
      box-shadow: 0 12px 40px rgba(0,0,0,0.18);
      display: none;
      flex-direction: column;
      overflow: hidden;
      z-index: 2147483646;
      animation: ws-slide-up 0.25s ease-out;
    }
    .ws-window.open { display: flex; }
    @keyframes ws-slide-up {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 480px) {
      .ws-window {
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        max-height: 100vh;
        max-width: 100vw;
        border-radius: 0;
      }
      .ws-bubble { bottom: 16px; right: 16px; }
    }

    /* ─── Header ────────────────────────────────── */
    .ws-header {
      background: ${t.primaryColor};
      color: ${t.textOnPrimary};
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }
    .ws-header-info { flex: 1; }
    .ws-header-title { font-size: 15px; font-weight: 600; }
    .ws-header-status { font-size: 12px; opacity: 0.85; display: flex; align-items: center; gap: 4px; }
    .ws-header-status .ws-dot {
      width: 7px; height: 7px; border-radius: 50%; display: inline-block;
    }
    .ws-dot.online { background: #34d399; }
    .ws-dot.offline { background: #fbbf24; }
    .ws-header-close {
      background: none;
      border: none;
      color: ${t.textOnPrimary};
      cursor: pointer;
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .ws-header-close:hover { background: rgba(255,255,255,0.15); }
    .ws-header-close svg { width: 16px; height: 16px; fill: currentColor; }

    /* ─── Pre-chat Form ─────────────────────────── */
    .ws-prechat {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 32px 24px;
      gap: 16px;
    }
    .ws-prechat h3 { font-size: 18px; font-weight: 600; text-align: center; color: ${t.textColor}; }
    .ws-prechat p { font-size: 13px; color: ${t.mutedColor}; text-align: center; }
    .ws-prechat input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${t.borderColor};
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      background: ${t.inputBg};
      color: ${t.textColor};
      outline: none;
      transition: border-color 0.15s;
    }
    .ws-prechat input:focus { border-color: ${t.primaryColor}; }
    .ws-prechat button {
      width: 100%;
      padding: 10px;
      background: ${t.primaryColor};
      color: ${t.textOnPrimary};
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .ws-prechat button:hover { background: ${t.primaryHover}; }
    .ws-prechat button:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ─── Messages ──────────────────────────────── */
    .ws-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      scroll-behavior: smooth;
    }
    .ws-messages::-webkit-scrollbar { width: 4px; }
    .ws-messages::-webkit-scrollbar-thumb { background: ${t.borderColor}; border-radius: 2px; }

    .ws-msg {
      max-width: 80%;
      padding: 8px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.45;
      word-wrap: break-word;
      animation: ws-msg-in 0.2s ease-out;
    }
    @keyframes ws-msg-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .ws-msg.visitor {
      align-self: flex-end;
      background: ${t.visitorBubble};
      color: ${t.textOnPrimary};
      border-bottom-right-radius: 4px;
    }
    .ws-msg.agent, .ws-msg.bot {
      align-self: flex-start;
      background: ${t.agentBubble};
      color: ${t.textColor};
      border-bottom-left-radius: 4px;
    }
    .ws-msg.system {
      align-self: center;
      background: transparent;
      color: ${t.systemColor};
      font-size: 12px;
      padding: 4px 0;
    }
    .ws-msg-time {
      font-size: 10px;
      opacity: 0.6;
      margin-top: 2px;
    }
    .ws-msg.visitor .ws-msg-time { text-align: right; }

    .ws-typing {
      align-self: flex-start;
      padding: 8px 14px;
      color: ${t.mutedColor};
      font-size: 13px;
      font-style: italic;
      display: none;
    }
    .ws-typing.show { display: block; }
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
      padding: 12px 16px;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      flex-shrink: 0;
    }
    .ws-textarea {
      flex: 1;
      resize: none;
      border: 1px solid ${t.borderColor};
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 14px;
      font-family: inherit;
      line-height: 1.4;
      max-height: 80px;
      background: ${t.inputBg};
      color: ${t.textColor};
      outline: none;
      transition: border-color 0.15s;
    }
    .ws-textarea:focus { border-color: ${t.primaryColor}; }
    .ws-textarea::placeholder { color: ${t.mutedColor}; }
    .ws-send-btn {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: ${t.primaryColor};
      color: ${t.textOnPrimary};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background 0.15s;
    }
    .ws-send-btn:hover { background: ${t.primaryHover}; }
    .ws-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .ws-send-btn svg { width: 16px; height: 16px; fill: currentColor; }

    /* ─── Powered By ────────────────────────────── */
    .ws-powered {
      text-align: center;
      padding: 6px;
      font-size: 10px;
      color: ${t.mutedColor};
      border-top: 1px solid ${t.borderColor};
      flex-shrink: 0;
    }
    .ws-powered a { color: ${t.primaryColor}; text-decoration: none; font-weight: 600; }
    .ws-powered a:hover { text-decoration: underline; }

    /* ─── Closed Conversation Banner ────────────── */
    .ws-closed-banner {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px 20px;
      border-top: 1px solid ${t.borderColor};
      background: ${t.inputBg};
      flex-shrink: 0;
      gap: 8px;
    }
    .ws-closed-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: #10b98115;
      color: #10b981;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }
    .ws-closed-title {
      font-size: 15px;
      font-weight: 700;
      color: ${t.textColor};
    }
    .ws-closed-desc {
      font-size: 12px;
      color: ${t.mutedColor};
      line-height: 1.5;
      max-width: 250px;
    }
    .ws-closed-btn {
      margin-top: 8px;
      padding: 10px 24px;
      border-radius: 10px;
      border: none;
      background: ${t.primaryColor};
      color: ${t.textOnPrimary};
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, transform 0.1s;
      font-family: inherit;
    }
    .ws-closed-btn:hover { background: ${t.primaryHover}; transform: scale(1.02); }
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
      transition: color 0.15s, transform 0.1s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .ws-csat-star svg { fill: currentColor; }
    .ws-csat-star.active { color: #f59e0b; }
    .ws-csat-star.hover { color: #fbbf24; transform: scale(1.15); }
    .ws-csat-star:active { transform: scale(0.9); }
    .ws-csat-comment {
      width: 100%;
      max-width: 260px;
      padding: 8px 10px;
      border: 1px solid ${t.borderColor};
      border-radius: 8px;
      background: ${t.bgColor};
      color: ${t.textColor};
      font-size: 12px;
      font-family: inherit;
      resize: none;
      outline: none;
      transition: border-color 0.15s;
    }
    .ws-csat-comment:focus { border-color: ${t.primaryColor}; }
    .ws-csat-comment::placeholder { color: ${t.mutedColor}; }
    .ws-csat-submit {
      padding: 8px 20px;
      border-radius: 8px;
      border: none;
      background: ${t.primaryColor};
      color: ${t.textOnPrimary};
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      font-family: inherit;
    }
    .ws-csat-submit:hover:not(:disabled) { background: ${t.primaryHover}; }
    .ws-csat-submit:disabled { cursor: not-allowed; }
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
      padding: 8px 12px;
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
      gap: 2px;
      padding: 10px 12px;
      border: 1px solid ${t.borderColor};
      border-radius: 10px;
      background: ${t.bgColor};
      cursor: pointer;
      text-align: left;
      transition: border-color 0.15s, background 0.15s;
      font-family: inherit;
    }
    .ws-kb-card:hover {
      border-color: ${t.primaryColor};
      background: ${t.inputBg};
    }
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
