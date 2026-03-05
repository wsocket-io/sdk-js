/**
 * wSocket Support Widget — i18n
 *
 * Auto-detects browser locale (EN/PT/ES).
 */

export interface WidgetStrings {
  headerTitle: string;
  headerOnline: string;
  headerOffline: string;
  prechatTitle: string;
  prechatSubtitle: string;
  prechatName: string;
  prechatEmail: string;
  prechatStart: string;
  inputPlaceholder: string;
  typing: string;
  justNow: string;
  minutesAgo: string;
  hoursAgo: string;
  poweredBy: string;
  conversationClosed: string;
  conversationEndedDesc: string;
  startNewConversation: string;
  rateExperience: string;
  ratingSent: string;
  addComment: string;
  submitRating: string;
  conversationClosedMsg: string;
  kbSuggestionsTitle: string;
}

const EN: WidgetStrings = {
  headerTitle: 'Support',
  headerOnline: 'Online',
  headerOffline: 'Offline',
  prechatTitle: 'Hi there! 👋',
  prechatSubtitle: 'How can we help you today?',
  prechatName: 'Your name',
  prechatEmail: 'Email (optional)',
  prechatStart: 'Start conversation',
  inputPlaceholder: 'Type a message...',
  typing: 'Agent is typing',
  justNow: 'Just now',
  minutesAgo: '{n}m ago',
  hoursAgo: '{n}h ago',
  poweredBy: 'Powered by',
  conversationClosed: 'Conversation ended',
  conversationEndedDesc: 'This conversation has been closed. Thank you for reaching out!',
  startNewConversation: 'Start new conversation',
  rateExperience: 'How was your experience?',
  ratingSent: 'Thank you for your feedback!',
  addComment: 'Add a comment (optional)',
  submitRating: 'Submit',
  conversationClosedMsg: 'Conversation closed.',
  kbSuggestionsTitle: 'Helpful articles',
};

const PT: WidgetStrings = {
  headerTitle: 'Suporte',
  headerOnline: 'Online',
  headerOffline: 'Offline',
  prechatTitle: 'Olá! 👋',
  prechatSubtitle: 'Como podemos ajudar?',
  prechatName: 'Seu nome',
  prechatEmail: 'Email (opcional)',
  prechatStart: 'Iniciar conversa',
  inputPlaceholder: 'Digite uma mensagem...',
  typing: 'Agente digitando',
  justNow: 'Agora',
  minutesAgo: '{n}min atrás',
  hoursAgo: '{n}h atrás',
  poweredBy: 'Powered by',
  conversationClosed: 'Conversa encerrada',
  conversationEndedDesc: 'Esta conversa foi encerrada. Obrigado pelo contato!',
  startNewConversation: 'Iniciar nova conversa',
  rateExperience: 'Como foi sua experiência?',
  ratingSent: 'Obrigado pelo seu feedback!',
  addComment: 'Adicionar comentário (opcional)',
  submitRating: 'Enviar',
  conversationClosedMsg: 'Conversation closed.',
  kbSuggestionsTitle: 'Artigos úteis',
};

const ES: WidgetStrings = {
  headerTitle: 'Soporte',
  headerOnline: 'En línea',
  headerOffline: 'Desconectado',
  prechatTitle: '¡Hola! 👋',
  prechatSubtitle: '¿Cómo podemos ayudarte?',
  prechatName: 'Tu nombre',
  prechatEmail: 'Email (opcional)',
  prechatStart: 'Iniciar conversación',
  inputPlaceholder: 'Escribe un mensaje...',
  typing: 'Agente escribiendo',
  justNow: 'Ahora',
  minutesAgo: 'hace {n}min',
  hoursAgo: 'hace {n}h',
  poweredBy: 'Powered by',
  conversationClosed: 'Conversación finalizada',
  conversationEndedDesc: 'Esta conversación ha sido cerrada. ¡Gracias por contactarnos!',
  startNewConversation: 'Iniciar nueva conversación',
  rateExperience: '¿Cómo fue tu experiencia?',
  ratingSent: '¡Gracias por tu valoración!',
  addComment: 'Agregar comentario (opcional)',
  submitRating: 'Enviar',
  conversationClosedMsg: 'Conversation closed.',
  kbSuggestionsTitle: 'Artículos útiles',
};

const locales: Record<string, WidgetStrings> = { en: EN, pt: PT, es: ES };

export function detectLocale(): string {
  if (typeof navigator === 'undefined') return 'en';
  const lang = (navigator.language || '').toLowerCase().split('-')[0];
  return locales[lang] ? lang : 'en';
}

export function getStrings(locale?: string): WidgetStrings {
  const key = locale || detectLocale();
  return locales[key] || EN;
}

export function relativeTime(date: Date, strings: WidgetStrings): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return strings.justNow;
  if (mins < 60) return strings.minutesAgo.replace('{n}', String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return strings.hoursAgo.replace('{n}', String(hours));
  return date.toLocaleDateString();
}
