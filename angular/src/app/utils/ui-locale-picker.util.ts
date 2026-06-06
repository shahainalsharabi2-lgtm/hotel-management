import type { HotelUiLocaleCode } from './hotel-currency.presets';
import type { UiExtraLocaleCode } from './ui-translation.constants';

export type UiLocalePickerCode = UiExtraLocaleCode | 'ar';

export type UiLocalePickerOption = {
  code: UiLocalePickerCode;
  flagSrc: string;
  shortCode: string;
  labelKey: 'localeAr' | 'localeFr' | 'localeId' | 'localeTr' | 'localeZh';
};

/** خيارات لغة الواجهة مع العلم — للشريط العلوي والقائمة الجانبية */
export const UI_LOCALE_PICKER_OPTIONS: readonly UiLocalePickerOption[] = [
  { code: 'ar', flagSrc: 'assets/flags/sa.svg', shortCode: 'SAU', labelKey: 'localeAr' },
  { code: 'fr', flagSrc: 'assets/flags/fr.svg', shortCode: 'FRA', labelKey: 'localeFr' },
  { code: 'id', flagSrc: 'assets/flags/id.svg', shortCode: 'IDN', labelKey: 'localeId' },
  { code: 'tr', flagSrc: 'assets/flags/tr.svg', shortCode: 'TUR', labelKey: 'localeTr' },
  { code: 'zh-Hans', flagSrc: 'assets/flags/cn.svg', shortCode: 'CHN', labelKey: 'localeZh' },
] as const;

export function uiLocalePickerOption(code: string): UiLocalePickerOption {
  return UI_LOCALE_PICKER_OPTIONS.find((o) => o.code === code) ?? UI_LOCALE_PICKER_OPTIONS[0];
}

export function isHotelUiLocaleCode(code: string): code is HotelUiLocaleCode {
  return UI_LOCALE_PICKER_OPTIONS.some((o) => o.code === code);
}
