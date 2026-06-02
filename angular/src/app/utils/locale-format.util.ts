/** لغة الواجهة النشطة → إعدادات Intl للأرقام */
export function intlLocaleTag(displayLocale: string): string {
  switch (displayLocale) {
    case 'ar':
      return 'ar-SA';
    case 'fr':
      return 'fr-FR';
    case 'id':
      return 'id-ID';
    case 'tr':
      return 'tr-TR';
    case 'zh-Hans':
      return 'zh-Hans';
    default:
      return 'en';
  }
}

/** أرقام عربية–هندية (٠١٢٣) عند العربية — وليس 0123 */
export function intlNumberOptions(displayLocale: string): Intl.NumberFormatOptions {
  if (displayLocale === 'ar') {
    return { numberingSystem: 'arab' };
  }
  return {};
}

export function formatLocaleNumber(
  value: number | undefined | null,
  displayLocale: string,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  const n = Number(value);
  const locale = intlLocaleTag(displayLocale);
  const base = intlNumberOptions(displayLocale);
  if (!Number.isFinite(n)) {
    return new Intl.NumberFormat(locale, {
      ...base,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
  }
  return new Intl.NumberFormat(locale, {
    ...base,
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(n);
}

/** مبلغ: بدون .00 زائدة + أرقام عربية عند واجهة العربية */
export function formatLocaleMoney(
  amount: number | undefined | null,
  displayLocale: string,
): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    return formatLocaleNumber(0, displayLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  const rounded = Math.round(n * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-9) {
    return formatLocaleNumber(Math.round(rounded), displayLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return formatLocaleNumber(rounded, displayLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
