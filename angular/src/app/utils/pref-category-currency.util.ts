import type { GeneralCodeItem } from '../general-codes/general-codes.service';
import { decodePrefCategoryDescription } from './general-code-item.util';
import { HOTEL_CURRENCY_PRESETS, type HotelCurrencyPreset } from './hotel-currency.presets';
import { prefCategoryProfile } from './pref-category.util';
import { resolveArabicRegionProfile } from './arabic-region-profile.util';

export interface PrefCategoryCurrencyHint {
  code: string;
  symbol: string;
}

const SHORT_CODE_CURRENCY: Record<string, PrefCategoryCurrencyHint> = {
  YEM: { code: 'YER', symbol: 'YR' },
  SAU: { code: 'SAR', symbol: 'ر.س' },
  EGY: { code: 'EGP', symbol: 'ج.م' },
  IRQ: { code: 'IQD', symbol: 'د.ع' },
  ARE: { code: 'AED', symbol: 'د.إ' },
  JOR: { code: 'JOD', symbol: 'د.ا' },
};

export function suggestCurrencyForRegion(region: string | null | undefined): PrefCategoryCurrencyHint {
  const profile = resolveArabicRegionProfile(region);
  const fromShort = SHORT_CODE_CURRENCY[profile.shortCode];
  if (fromShort) {
    return fromShort;
  }
  const norm = (region ?? '').trim().toLowerCase();
  for (const preset of HOTEL_CURRENCY_PRESETS) {
    if (norm && preset.engraveAr.includes(norm.slice(0, 3))) {
      return { code: preset.code, symbol: preset.symbol };
    }
  }
  return { code: 'SAR', symbol: 'ر.س' };
}

export function prefCategoryCurrencyCode(item: Pick<GeneralCodeItem, 'description' | 'fName'>): string {
  const stored = decodePrefCategoryDescription(item.description).currencyCode?.trim();
  if (stored) {
    return stored.toUpperCase();
  }
  return suggestCurrencyForRegion(item.fName).code;
}

export function prefCategoryCurrencySymbol(item: Pick<GeneralCodeItem, 'description' | 'fName'>): string {
  return prefCategoryCurrencyCode(item);
}

export function prefCategoryHasCurrency(item: Pick<GeneralCodeItem, 'description'>): boolean {
  return !!decodePrefCategoryDescription(item.description).currencyCode?.trim();
}

export function prefCategoryToCurrencyPreset(item: GeneralCodeItem): HotelCurrencyPreset {
  const region = (item.fName ?? '').trim();
  const code = prefCategoryCurrencyCode(item);
  const profile = prefCategoryProfile(item);
  const preset = HOTEL_CURRENCY_PRESETS.find((p) => p.code === code);
  return {
    id: code,
    code,
    symbol: code,
    nameAr: region ? `${region} (${code})` : (preset?.nameAr ?? code),
    nameEn: preset?.nameEn ?? code,
    flag: profile.flagEmoji || preset?.flag || '💱',
    engraveAr: region || preset?.engraveAr || code,
  };
}

export function mapPrefCategoryCurrencies(items: GeneralCodeItem[]): HotelCurrencyPreset[] {
  return [...items]
    .filter((item) => (item.fName ?? '').trim())
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .map((item) => prefCategoryToCurrencyPreset(item));
}
