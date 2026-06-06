import type { GeneralCodeItem } from '../general-codes/general-codes.service';
import { resolveArabicRegionProfile, type ArabicRegionProfile } from './arabic-region-profile.util';

export type SystemUiLanguageCode = 'ar' | 'fr' | 'id' | 'tr' | 'zh-Hans';

export const SYSTEM_UI_LANGUAGES: ReadonlyArray<{
  code: SystemUiLanguageCode;
  labelKey: 'localeAr' | 'localeFr' | 'localeId' | 'localeTr' | 'localeZh';
  defaultFlag: string;
}> = [
  { code: 'ar', labelKey: 'localeAr', defaultFlag: 'sa.svg' },
  { code: 'fr', labelKey: 'localeFr', defaultFlag: 'fr.svg' },
  { code: 'id', labelKey: 'localeId', defaultFlag: 'id.svg' },
  { code: 'tr', labelKey: 'localeTr', defaultFlag: 'tr.svg' },
  { code: 'zh-Hans', labelKey: 'localeZh', defaultFlag: 'cn.svg' },
];

export const PRESET_FLAG_FILES = ['sa.svg', 'ye.svg', 'eg.svg', 'iq.svg', 'fr.svg', 'id.svg', 'tr.svg', 'cn.svg'] as const;

export function normalizeFlagFile(name: string | null | undefined): string {
  return (name ?? '')
    .trim()
    .replace(/^assets\/flags\//i, '')
    .replace(/^\/+/, '')
    .toLowerCase();
}

export function prefCategoryFlagSrc(item: Pick<GeneralCodeItem, 'flagImageData' | 'flagImageName' | 'fName'>): string {
  const data = (item.flagImageData ?? '').trim();
  if (data.startsWith('data:')) {
    return data;
  }

  const regionProfile = resolveArabicRegionProfile(item.fName);
  const regionFlagFile = regionProfile.flagSrc.replace(/^assets\/flags\//, '');
  const file = (item.flagImageName ?? '').trim();
  if (file) {
    if (file.startsWith('assets/')) {
      return file;
    }
    if (file.startsWith('data:')) {
      return file;
    }
    const normalized = file.replace(/^\/+/, '');
    // sa.svg الافتراضي عند الإنشاء — لا يُطبَّق على مناطق أخرى (مثل مصر)
    if (normalized === 'sa.svg' && regionFlagFile && regionFlagFile !== 'sa.svg') {
      return regionProfile.flagSrc;
    }
    if (
      PRESET_FLAG_FILES.includes(normalized as (typeof PRESET_FLAG_FILES)[number]) ||
      normalized.endsWith('.svg')
    ) {
      return `assets/flags/${normalized}`;
    }
  }
  return regionProfile.flagSrc;
}

export function prefCategoryDialCode(item: Pick<GeneralCodeItem, 'countryDialCode' | 'fName'>): string {
  const raw = (item.countryDialCode ?? '').trim();
  if (raw) {
    return raw.startsWith('+') ? raw : `+${raw}`;
  }
  return resolveArabicRegionProfile(item.fName).dialCode;
}

export function prefCategoryProfile(
  item: Pick<GeneralCodeItem, 'flagImageData' | 'flagImageName' | 'fName' | 'countryDialCode'>,
): ArabicRegionProfile {
  const fallback = resolveArabicRegionProfile(item.fName);
  const dialCode = prefCategoryDialCode(item);
  return {
    ...fallback,
    flagSrc: prefCategoryFlagSrc(item),
    dialCode,
    flagEmoji: fallback.flagEmoji,
  };
}

export function isKnownSystemLanguageCode(code: string): code is SystemUiLanguageCode {
  return SYSTEM_UI_LANGUAGES.some((x) => x.code === code);
}
