import { SIDEBAR_NAV_KEYS, UI_CHROME_KEYS } from './ui-translation.constants';
import type { UiLocaleFilePayload } from './ui-translations-locale.util';

export type LocaleEditorSectionId = 'brandSubtitle' | 'sidebarNav' | 'chrome' | 'screenCopy';

export const UI_LOCALE_SECTION_LABELS: Record<
  LocaleEditorSectionId,
  { title: string; hint: string }
> = {
  brandSubtitle: {
    title: 'العنوان الفرعي للفندق',
    hint: 'يظهر تحت اسم الفندق في الشريط الجانبي',
  },
  sidebarNav: {
    title: 'أسماء القائمة الجانبية',
    hint: 'عناوين روابط التنقل الرئيسية',
  },
  chrome: {
    title: 'نصوص الواجهة العامة',
    hint: 'شريط الحساب، اللغة، الإشعارات، وأزرار التنقل',
  },
  screenCopy: {
    title: 'نصوص الشاشات',
    hint: 'عناوين وأزرار ورسائل كل صفحة في التطبيق',
  },
};

export const UI_LOCALE_BRAND_SUBTITLE_FIELD = {
  title: 'العنوان الفرعي للفندق',
  tech: 'brandSubtitle',
};

/** أسماء عربية للشاشات (المفتاح التقني screenCopy → screenId) */
export const UI_LOCALE_SCREEN_LABELS: Record<string, string> = {
  dashboard: 'لوحة التحكم',
  booking: 'بيانات الحجز (حجز جديد)',
  bookings: 'سجلات الحجوزات',
  rooms: 'مخطط التوافير',
  database: 'مخطط الحجوزات',
  reports: 'التقارير',
  settings: 'إعدادات النظام',
  nav: 'تنقل داخلي (nav)',
  roomDetails: 'تفاصيل الغرفة',
  roomForm: 'نموذج الغرفة',
  roomPreview: 'معاينة الغرفة',
};

const sidebarNavArabic = new Map(SIDEBAR_NAV_KEYS.map((k) => [k.routeKey, k.arabic]));
const chromeArabic = new Map(UI_CHROME_KEYS.map((k) => [k.key, k.arabic]));

export function localeEditorSectionTitle(section: LocaleEditorSectionId): string {
  return UI_LOCALE_SECTION_LABELS[section].title;
}

export function localeEditorSectionHint(section: LocaleEditorSectionId): string {
  return UI_LOCALE_SECTION_LABELS[section].hint;
}

export function localeEditorScreenTitle(screenId: string): string {
  return UI_LOCALE_SCREEN_LABELS[screenId] ?? screenId;
}

export function localeEditorSidebarNavLabel(routeKey: string): string {
  return sidebarNavArabic.get(routeKey) ?? routeKey;
}

export function localeEditorChromeLabel(key: string): string {
  return chromeArabic.get(key) ?? key;
}

export function localeEditorReferenceHint(
  reference: UiLocaleFilePayload | null | undefined,
  section: 'brandSubtitle' | 'sidebarNav' | 'chrome' | 'screenCopy',
  key: string,
  screenId?: string,
): string | undefined {
  if (!reference) {
    return undefined;
  }
  if (section === 'brandSubtitle') {
    const v = reference.brandSubtitle?.trim();
    return v || undefined;
  }
  if (section === 'sidebarNav') {
    const v = reference.sidebarNav?.[key]?.trim();
    return v || sidebarNavArabic.get(key);
  }
  if (section === 'chrome') {
    const v = reference.chrome?.[key]?.trim();
    return v || chromeArabic.get(key);
  }
  if (section === 'screenCopy' && screenId) {
    const v = reference.screenCopy?.[screenId]?.[key]?.trim();
    return v || undefined;
  }
  return undefined;
}
