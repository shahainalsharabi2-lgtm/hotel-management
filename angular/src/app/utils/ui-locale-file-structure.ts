/**
 * هيكل ملف ترجمة لغة واحدة (ar.json / tr.json / zh-Hans.json)
 * وشبكة محرر الترجمة (app-account-locale-editor).
 *
 * JSON per locale:
 * {
 *   brandSubtitle: string,
 *   sidebarNav:    Record<routeKey, string>,
 *   chrome:        Record<chromeKey, string>,
 *   screenCopy:    Record<screenId, Record<msgKey, string>>
 * }
 *
 * API combined payload wraps each section: section[locale] = ...
 */
import type { LocaleEditorSectionId } from './ui-locale-editor-labels';

/** أقسام الملف = تبويبات المحرر */
export const UI_LOCALE_FILE_SECTIONS: readonly {
  id: LocaleEditorSectionId;
  jsonKey: LocaleEditorSectionId;
  depth: 0 | 1 | 2;
  description: string;
}[] = [
  {
    id: 'brandSubtitle',
    jsonKey: 'brandSubtitle',
    depth: 0,
    description: 'نص واحد تحت اسم الفندق في الشريط الجانبي',
  },
  {
    id: 'sidebarNav',
    jsonKey: 'sidebarNav',
    depth: 1,
    description: 'عناوين روابط القائمة اليسرى (dashboard, booking, …)',
  },
  {
    id: 'chrome',
    jsonKey: 'chrome',
    depth: 1,
    description: 'شريط الحساب، اللغة، الإشعارات، قوالب الإشعارات',
  },
  {
    id: 'screenCopy',
    jsonKey: 'screenCopy',
    depth: 2,
    description: 'نصوص كل صفحة: screenId ثم msgKey',
  },
] as const;

/** شاشات screenCopy في ar.json (أسماء عربية في ui-locale-editor-labels) */
export const UI_LOCALE_SCREEN_IDS = [
  'dashboard',
  'booking',
  'bookings',
  'rooms',
  'database',
  'reports',
  'settings',
  'nav',
  'roomDetails',
  'roomForm',
  'roomPreview',
] as const;

export type UiLocaleScreenId = (typeof UI_LOCALE_SCREEN_IDS)[number];

/** مسار مفتاح في JSON للعرض في الشبكة */
export function localeFieldPath(
  section: LocaleEditorSectionId,
  key: string,
  screenId?: string,
): string {
  if (section === 'brandSubtitle') {
    return 'brandSubtitle';
  }
  if (section === 'screenCopy' && screenId) {
    return `screenCopy.${screenId}.${key}`;
  }
  return `${section}.${key}`;
}
