import type { UiManualTranslationsPayload } from './ui-translation.constants';
import { SIDEBAR_NAV_KEYS, UI_CHROME_KEYS } from './ui-translation.constants';

/** شكل ملف لغة واحدة (ar.json / tr.json / zh-Hans.json) */
export interface UiLocaleFilePayload {
  sidebarNav?: Record<string, string>;
  brandSubtitle?: string;
  chrome?: Record<string, string>;
  screenCopy?: Record<string, Record<string, string>>;
}

export function extractLocaleFile(
  payload: UiManualTranslationsPayload,
  locale: string,
): UiLocaleFilePayload {
  const file: UiLocaleFilePayload = {};
  const nav = payload.sidebarNav?.[locale];
  if (nav && Object.keys(nav).length > 0) {
    file.sidebarNav = { ...nav };
  }
  const sub = payload.brandSubtitle?.[locale];
  if (sub?.trim()) {
    file.brandSubtitle = sub;
  }
  const chrome = payload.chrome?.[locale];
  if (chrome && Object.keys(chrome).length > 0) {
    file.chrome = { ...chrome };
  }
  const screens = payload.screenCopy?.[locale];
  if (screens && Object.keys(screens).length > 0) {
    file.screenCopy = JSON.parse(JSON.stringify(screens)) as Record<
      string,
      Record<string, string>
    >;
  }
  return file;
}

export function mergeLocaleFileIntoPayload(
  payload: UiManualTranslationsPayload,
  locale: string,
  file: UiLocaleFilePayload,
): UiManualTranslationsPayload {
  const next = structuredClone(payload) as UiManualTranslationsPayload;

  if (!next.sidebarNav) {
    next.sidebarNav = {};
  }
  if (!next.brandSubtitle) {
    next.brandSubtitle = {};
  }
  if (!next.chrome) {
    next.chrome = {};
  }
  if (!next.screenCopy) {
    next.screenCopy = {};
  }

  if (file.sidebarNav) {
    next.sidebarNav[locale] = file.sidebarNav;
  }
  if (file.brandSubtitle !== undefined) {
    next.brandSubtitle[locale] = file.brandSubtitle;
  }
  if (file.chrome) {
    next.chrome[locale] = file.chrome;
  }
  if (file.screenCopy) {
    next.screenCopy[locale] = file.screenCopy;
  }

  return next;
}

export function localeFileToJson(file: UiLocaleFilePayload, indent = 2): string {
  return JSON.stringify(file, null, indent);
}

export function parseLocaleFileJson(json: string): UiLocaleFilePayload {
  const parsed = JSON.parse(json) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new SyntaxError('Locale JSON must be an object');
  }
  return parsed as UiLocaleFilePayload;
}

/** نموذج تحرير: كل المفاتيح المعروفة + الموجودة في الملف المرجعي (عادة ar) */
export function prepareLocaleFileForForm(
  file: UiLocaleFilePayload,
  reference?: UiLocaleFilePayload,
): UiLocaleFilePayload {
  const sidebarNav: Record<string, string> = {};
  const chrome: Record<string, string> = {};
  const screenCopy: Record<string, Record<string, string>> = {};

  const navKeys = new Set<string>([
    ...SIDEBAR_NAV_KEYS.map((k) => k.routeKey),
    ...Object.keys(file.sidebarNav ?? {}),
    ...Object.keys(reference?.sidebarNav ?? {}),
  ]);
  for (const k of navKeys) {
    sidebarNav[k] = file.sidebarNav?.[k] ?? '';
  }

  const chromeKeys = new Set<string>([
    ...UI_CHROME_KEYS.map((k) => k.key),
    ...Object.keys(file.chrome ?? {}),
    ...Object.keys(reference?.chrome ?? {}),
  ]);
  for (const k of chromeKeys) {
    chrome[k] = file.chrome?.[k] ?? '';
  }

  const screenIds = new Set<string>([
    ...Object.keys(file.screenCopy ?? {}),
    ...Object.keys(reference?.screenCopy ?? {}),
  ]);
  for (const screenId of screenIds) {
    const msgKeys = new Set<string>([
      ...Object.keys(file.screenCopy?.[screenId] ?? {}),
      ...Object.keys(reference?.screenCopy?.[screenId] ?? {}),
    ]);
    screenCopy[screenId] = {};
    for (const mk of msgKeys) {
      screenCopy[screenId][mk] = file.screenCopy?.[screenId]?.[mk] ?? '';
    }
  }

  return {
    brandSubtitle: file.brandSubtitle ?? '',
    sidebarNav,
    chrome,
    screenCopy,
  };
}

export function normalizeLocaleFileForSave(file: UiLocaleFilePayload): UiLocaleFilePayload {
  const sidebarNav: Record<string, string> = {};
  for (const [k, v] of Object.entries(file.sidebarNav ?? {})) {
    sidebarNav[k] = (v ?? '').trim();
  }

  const chrome: Record<string, string> = {};
  for (const [k, v] of Object.entries(file.chrome ?? {})) {
    chrome[k] = (v ?? '').trim();
  }

  const screenCopy: Record<string, Record<string, string>> = {};
  for (const [screenId, msgs] of Object.entries(file.screenCopy ?? {})) {
    screenCopy[screenId] = {};
    for (const [mk, v] of Object.entries(msgs ?? {})) {
      screenCopy[screenId][mk] = (v ?? '').trim();
    }
  }

  return {
    brandSubtitle: (file.brandSubtitle ?? '').trim(),
    sidebarNav,
    chrome,
    screenCopy,
  };
}
