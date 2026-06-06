import { resolveArabicRegionProfile, type ArabicRegionProfile } from './arabic-region-profile.util';
import type { HotelUiLocaleCode } from './hotel-currency.presets';

/** بادئة الهاتف المعروضة حسب لغة الواجهة (نفس أعلام الشريط الجانبي) */
export type LocalePhoneDisplay = {
  flagEmoji: string;
  flagSrc: string;
  dialCode: string;
  maxLength: number;
};

const LOCALE_PHONE: Record<HotelUiLocaleCode, LocalePhoneDisplay> = {
  ar: { flagEmoji: '🇸🇦', flagSrc: 'assets/flags/sa.svg', dialCode: '+966', maxLength: 9 },
  fr: { flagEmoji: '🇫🇷', flagSrc: 'assets/flags/fr.svg', dialCode: '+33', maxLength: 9 },
  id: { flagEmoji: '🇮🇩', flagSrc: 'assets/flags/id.svg', dialCode: '+62', maxLength: 11 },
  tr: { flagEmoji: '🇹🇷', flagSrc: 'assets/flags/tr.svg', dialCode: '+90', maxLength: 10 },
  'zh-Hans': { flagEmoji: '🇨🇳', flagSrc: 'assets/flags/cn.svg', dialCode: '+86', maxLength: 11 },
};

export function localePhoneDisplay(
  locale: string,
  arabicProfile?: ArabicRegionProfile | LocalePhoneDisplay | null,
): LocalePhoneDisplay {
  if (locale === 'ar') {
    if (arabicProfile) {
      const { flagEmoji, flagSrc, dialCode, maxLength } = arabicProfile;
      return { flagEmoji, flagSrc, dialCode, maxLength };
    }
    return resolveArabicRegionProfile('');
  }
  if (locale in LOCALE_PHONE) {
    return LOCALE_PHONE[locale as HotelUiLocaleCode];
  }
  return LOCALE_PHONE.ar;
}
