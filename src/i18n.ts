// Website localization foundation (Pole² 1.0.26).
//
// Architecture (approved): Italian is canonical at the root URLs; English lives
// under /en/. There is no server redirect. A visible IT/EN selector is on every
// page and the choice is remembered in localStorage; first-visit detection (see
// Base.astro) only ever runs client-side, only from `/`, and only when there is
// no saved choice and the browser language is non-Italian.

export type Locale = 'it' | 'en';
export const LOCALES: Locale[] = ['it', 'en'];
export const DEFAULT_LOCALE: Locale = 'it';

/** The locale a request path belongs to (English is the `/en` subtree). */
export function localeFromPath(pathname: string): Locale {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'it';
}

/** Strip the `/en` prefix, giving the shared "logical" path both locales share
 *  (always starts with `/`). `/en/guida` and `/guida` both → `/guida`. */
export function basePath(pathname: string): string {
  let p = pathname;
  if (p === '/en') p = '/';
  else if (p.startsWith('/en/')) p = p.slice(3);
  // normalise a trailing slash away except for the root
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p || '/';
}

/** The URL for a logical path in a given locale. */
export function localizedPath(base: string, locale: Locale): string {
  const b = base === '/' ? '' : base;
  return locale === 'en' ? `/en${b || '/'}` : b || '/';
}

// Stable topic keys for the support form. The <option> VALUE is the key; the
// server validates the key; the visible label is localized; a human-readable
// label is what we store/notify. Never submit a translated label as the value.
export const SUPPORT_TOPICS = ['question', 'technical', 'suggestion', 'privacy', 'other'] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

export const SUPPORT_TOPIC_LABELS: Record<Locale, Record<SupportTopic, string>> = {
  it: {
    question: 'Domanda',
    technical: 'Problema tecnico',
    suggestion: 'Suggerimento',
    privacy: 'Privacy e dati',
    other: 'Altro',
  },
  en: {
    question: 'Question',
    technical: 'Technical issue',
    suggestion: 'Suggestion',
    privacy: 'Privacy & data',
    other: 'Other',
  },
};

// Shared "chrome" strings: everything outside the long-form page bodies.
export interface Strings {
  htmlLang: string;
  ogLocale: string;
  skip: string;
  nav: { guide: string; support: string; privacy: string; news: string; pagesLabel: string };
  footerLine: string;
  langLabel: string;
  langOther: { code: Locale; label: string };
  waitlist: {
    label: string;
    placeholder: string;
    submit: string;
    hpLabel: string;
    consent: string; // {privacy} is a link
    privacyLink: string;
    note: string;
    checkEmail: string;
    needConsent: string;
    success: string;
    fail: string;
  };
  support: {
    emailLabel: string;
    topicLabel: string;
    messageLabel: string;
    messagePlaceholder: string;
    versionLabel: string;
    buildLabel: string;
    hpLabel: string;
    consent: string;
    privacyLink: string;
    submit: string;
    checkEmail: string;
    tooShort: string;
    success: string;
    fail: string;
  };
}

export const STRINGS: Record<Locale, Strings> = {
  it: {
    htmlLang: 'it',
    ogLocale: 'it_IT',
    skip: 'Vai al contenuto',
    nav: { guide: 'Guida', support: 'Supporto', privacy: 'Privacy', news: 'Novità', pagesLabel: 'Pagine' },
    footerLine: 'Tutto resta sul tuo dispositivo.',
    langLabel: 'Lingua',
    langOther: { code: 'en', label: 'English' },
    waitlist: {
      label: 'La tua email',
      placeholder: 'tu@esempio.it',
      submit: 'Tienimi un posto',
      hpLabel: 'Lascia vuoto questo campo',
      consent: 'Acconsento a ricevere una sola email quando Pole² sarà pronto. Vedi la',
      privacyLink: 'informativa privacy',
      note: 'Solo per avvisarti quando Pole² sarà pronto. Niente pubblicità, nessun altro invio.',
      checkEmail: 'Controlla l’indirizzo email e riprova.',
      needConsent: 'Serve il tuo consenso per tenerti un posto.',
      success: 'Il tuo posto è tenuto. Ti scriveremo appena Pole² sarà pronto.',
      fail: 'Non è andato perso nulla. Riprova quando vuoi.',
    },
    support: {
      emailLabel: 'La tua email (per risponderti)',
      topicLabel: 'Argomento',
      messageLabel: 'Messaggio',
      messagePlaceholder: 'Raccontaci con calma cosa succede.',
      versionLabel: 'Versione app (facoltativa)',
      buildLabel: 'Build (facoltativa)',
      hpLabel: 'Lascia vuoto questo campo',
      consent: 'Ho letto l’',
      privacyLink: 'informativa privacy',
      submit: 'Invia',
      checkEmail: 'Controlla l’indirizzo email e riprova.',
      tooShort: 'Scrivi qualche parola in più, così possiamo aiutarti.',
      success: 'Grazie. Abbiamo ricevuto il tuo messaggio: ti risponderemo via email.',
      fail: 'Non è andato perso nulla. Riprova quando vuoi.',
    },
  },
  en: {
    htmlLang: 'en',
    ogLocale: 'en_US',
    skip: 'Skip to content',
    nav: { guide: 'Guide', support: 'Support', privacy: 'Privacy', news: 'What’s new', pagesLabel: 'Pages' },
    footerLine: 'Everything stays on your device.',
    langLabel: 'Language',
    langOther: { code: 'it', label: 'Italiano' },
    waitlist: {
      label: 'Your email',
      placeholder: 'you@example.com',
      submit: 'Save me a spot',
      hpLabel: 'Leave this field empty',
      consent: 'I agree to receive a single email when Pole² is ready. See the',
      privacyLink: 'privacy notice',
      note: 'Only to let you know when Pole² is ready. No ads, nothing else.',
      checkEmail: 'Check the email address and try again.',
      needConsent: 'We need your consent to save you a spot.',
      success: 'Your spot is saved. We’ll write as soon as Pole² is ready.',
      fail: 'Nothing was lost. Try again whenever you like.',
    },
    support: {
      emailLabel: 'Your email (so we can reply)',
      topicLabel: 'Topic',
      messageLabel: 'Message',
      messagePlaceholder: 'Tell us calmly what’s going on.',
      versionLabel: 'App version (optional)',
      buildLabel: 'Build (optional)',
      hpLabel: 'Leave this field empty',
      consent: 'I’ve read the',
      privacyLink: 'privacy notice',
      submit: 'Send',
      checkEmail: 'Check the email address and try again.',
      tooShort: 'Write a few more words so we can help.',
      success: 'Thank you. We’ve received your message and will reply by email.',
      fail: 'Nothing was lost. Try again whenever you like.',
    },
  },
};
