/**
 * wSocket Support Widget — Auto-init Embed Script
 *
 * This file is the entry point for the CDN bundle (support.js).
 * When loaded via script tag, it auto-initializes the widget:
 *
 *   <script
 *     src="https://cdn.wsocket.io/support.js"
 *     data-server="https://node00.wsocket.online"
 *     data-org="your-org-id"
 *     data-key="your-api-key"
 *     data-color="#6366f1"
 *     data-position="right"
 *     data-locale="en"
 *     data-title="Support"
 *   ></script>
 */

import { SupportWidget, type SupportWidgetConfig } from './widget.js';

// Export for programmatic usage
export { SupportWidget, type SupportWidgetConfig };
export type { WidgetTheme } from './styles.js';
export type { WidgetStrings } from './i18n.js';

// Auto-init when loaded via script tag
function autoInit(): void {
  if (typeof document === 'undefined') return;

  // Find our script tag
  const script =
    document.currentScript ||
    document.querySelector('script[data-org][src*="support"]');

  if (!script) return;

  const serverUrl = script.getAttribute('data-server') || 'https://node00.wsocket.online';
  const orgId = script.getAttribute('data-org');
  const apiKey = script.getAttribute('data-key') || '';

  if (!orgId) {
    console.warn('[wSocket Support] Missing data-org attribute on script tag');
    return;
  }

  const config: SupportWidgetConfig = {
    serverUrl,
    orgId,
    apiKey,
  };

  // Optional attributes
  const color = script.getAttribute('data-color');
  if (color) config.theme = { primaryColor: color };

  const position = script.getAttribute('data-position');
  if (position === 'left' || position === 'right') config.position = position;

  const locale = script.getAttribute('data-locale');
  if (locale) config.locale = locale;

  const title = script.getAttribute('data-title');
  if (title) config.headerTitle = title;

  const widget = new SupportWidget(config);

  // Mount when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => widget.mount());
  } else {
    widget.mount();
  }

  // Expose globally for programmatic control
  (window as any).wSocketSupport = widget;
}

autoInit();
