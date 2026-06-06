import type { LocalePhoneDisplay } from './locale-phone';

export interface ArabicRegionProfile extends LocalePhoneDisplay {
  localeTag: string;
  shortCode: string;
}

const DEFAULT_ARABIC_PROFILE: ArabicRegionProfile = {
  flagEmoji: '🇸🇦',
  flagSrc: 'assets/flags/sa.svg',
  dialCode: '+966',
  maxLength: 9,
  localeTag: 'ar-SA',
  shortCode: 'SAU',
};

/** يطابق حقل «المنطقة» في الترميزات العامة → علم وبادئة هاتف */
export function resolveArabicRegionProfile(region: string | null | undefined): ArabicRegionProfile {
  const norm = (region ?? '').trim().toLowerCase();
  if (!norm) {
    return { ...DEFAULT_ARABIC_PROFILE };
  }
  if (norm.includes('yemen') || norm.includes('yem') || norm.includes('ye-') || norm.includes('يمن')) {
    return {
      flagEmoji: '🇾🇪',
      flagSrc: 'assets/flags/ye.svg',
      dialCode: '+967',
      maxLength: 9,
      localeTag: 'ar-YE',
      shortCode: 'YEM',
    };
  }
  if (
    norm.includes('saudi') ||
    norm.includes('ksa') ||
    norm.includes('sau') ||
    norm.includes('سعود') ||
    norm.includes('السعودية')
  ) {
    return { ...DEFAULT_ARABIC_PROFILE };
  }
  if (norm.includes('egypt') || norm.includes('egy') || norm.includes('مصر') || norm.includes('قاهرة')) {
    return {
      flagEmoji: '🇪🇬',
      flagSrc: 'assets/flags/eg.svg',
      dialCode: '+20',
      maxLength: 10,
      localeTag: 'ar-EG',
      shortCode: 'EGY',
    };
  }
  if (norm.includes('iraq') || norm.includes('irq') || norm.includes('baghdad') || norm.includes('عراق') || norm.includes('العراق')) {
    return {
      flagEmoji: '🇮🇶',
      flagSrc: 'assets/flags/iq.svg',
      dialCode: '+964',
      maxLength: 10,
      localeTag: 'ar-IQ',
      shortCode: 'IRQ',
    };
  }
  return { ...DEFAULT_ARABIC_PROFILE };
}

export function formatArabicCategoryLabel(language: string, region: string): string {
  const lang = (language ?? '').trim() || 'العربية';
  const reg = (region ?? '').trim();
  return reg ? `${lang} — ${reg}` : lang;
}
