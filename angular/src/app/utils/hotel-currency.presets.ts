/** عملة محددة مسبقاً في إعدادات الفندق */
export type HotelCurrencyPresetId = string;

export type HotelCurrencyPreset = {
  id: HotelCurrencyPresetId;
  code: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  flag: string;
  /** نص النقش الدائري حول العملة */
  engraveAr: string;
};

export const HOTEL_CURRENCY_PRESETS: readonly HotelCurrencyPreset[] = [
  {
    id: 'YER',
    code: 'YER',
    symbol: 'YR',
    nameAr: 'ريال يمني',
    nameEn: 'Yemeni Rial',
    flag: '🇾🇪',
    engraveAr: 'اليمن',
  },
  {
    id: 'SAR',
    code: 'SAR',
    symbol: 'ر.س',
    nameAr: 'ريال سعودي',
    nameEn: 'Saudi Riyal',
    flag: '🇸🇦',
    engraveAr: 'السعودية',
  },
  {
    id: 'USD',
    code: 'USD',
    symbol: '$',
    nameAr: 'دولار أمريكي',
    nameEn: 'US Dollar',
    flag: '🇺🇸',
    engraveAr: 'أمريكا',
  },
  {
    id: 'EUR',
    code: 'EUR',
    symbol: '€',
    nameAr: 'يورو',
    nameEn: 'Euro',
    flag: '🇪🇺',
    engraveAr: 'أوروبا',
  },
  {
    id: 'AED',
    code: 'AED',
    symbol: 'د.إ',
    nameAr: 'درهم إماراتي',
    nameEn: 'UAE Dirham',
    flag: '🇦🇪',
    engraveAr: 'الإمارات',
  },
  {
    id: 'TRY',
    code: 'TRY',
    symbol: '₺',
    nameAr: 'ليرة تركية',
    nameEn: 'Turkish Lira',
    flag: '🇹🇷',
    engraveAr: 'تركيا',
  },
  {
    id: 'CNY',
    code: 'CNY',
    symbol: '¥',
    nameAr: 'يوان صيني',
    nameEn: 'Chinese Yuan',
    flag: '🇨🇳',
    engraveAr: 'الصين',
  },
  {
    id: 'IDR',
    code: 'IDR',
    symbol: 'Rp',
    nameAr: 'روبية إندونيسية',
    nameEn: 'Indonesian Rupiah',
    flag: '🇮🇩',
    engraveAr: 'إندونيسيا',
  },
] as const;

export const HOTEL_CURRENCY_CUSTOM_ID = 'custom' as const;

export const DEFAULT_HOTEL_CURRENCY_ID = 'YER' as const;

/** لغات عرض الواجهة */
export type HotelUiLocaleCode = 'ar' | 'fr' | 'id' | 'tr' | 'zh-Hans';

/** عملة افتراضية لكل لغة */
export const LOCALE_DEFAULT_CURRENCY_ID: Record<HotelUiLocaleCode, HotelCurrencyPresetId> = {
  ar: 'SAR',
  fr: 'EUR',
  id: 'IDR',
  tr: 'TRY',
  'zh-Hans': 'CNY',
};

export function currencyIdForUiLocale(locale: string): HotelCurrencyPresetId {
  if (locale in LOCALE_DEFAULT_CURRENCY_ID) {
    return LOCALE_DEFAULT_CURRENCY_ID[locale as HotelUiLocaleCode];
  }
  return LOCALE_DEFAULT_CURRENCY_ID.ar;
}

/** عملات لغات الواجهة (فرنسية/تركية/إندونيسية/صينية) تُدمج مع عملات فئات التفضيل */
export function mergeUiLocaleCurrencyPresets(
  managed: readonly HotelCurrencyPreset[],
): readonly HotelCurrencyPreset[] {
  const seen = new Set(managed.map((p) => p.id.toUpperCase()));
  const extra: HotelCurrencyPreset[] = [];
  for (const locale of Object.keys(LOCALE_DEFAULT_CURRENCY_ID) as HotelUiLocaleCode[]) {
    if (locale === 'ar') {
      continue;
    }
    const id = LOCALE_DEFAULT_CURRENCY_ID[locale];
    if (seen.has(id.toUpperCase())) {
      continue;
    }
    const preset = HOTEL_CURRENCY_PRESETS.find((p) => p.id === id);
    if (preset) {
      extra.push(preset);
      seen.add(id.toUpperCase());
    }
  }
  return extra.length ? [...managed, ...extra] : managed;
}
