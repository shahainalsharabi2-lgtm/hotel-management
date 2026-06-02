/** جواز سفر أو بطاقة/هوية شخصية — 12 رقماً بالضبط */
export const ID_NUMBER_FIXED_LENGTH = 12;

export function identityRequiresTwelveDigits(idType: string): boolean {
  const type = (idType || '').toLowerCase();
  if (type.includes('جواز')) {
    return true;
  }
  if (
    type.includes('بطاقة') ||
    type.includes('شخصية') ||
    type.includes('هوية وطنية') ||
    (type.includes('هوية') && !type.includes('عقد'))
  ) {
    return true;
  }
  return false;
}
