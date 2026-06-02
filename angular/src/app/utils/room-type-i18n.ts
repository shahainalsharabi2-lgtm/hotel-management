/** قيم نوع الغرفة المخزّنة في قاعدة البيانات (عربي) */
export const ROOM_TYPE_STORED_VALUES = ['غرفة عادية', 'غرفة مزدوجة', 'جناح ملكي'] as const;

export type RoomTypeStoredValue = (typeof ROOM_TYPE_STORED_VALUES)[number];

/** مفتاح الترجمة في شاشة `rooms` لكل قيمة مخزّنة */
export const ROOM_TYPE_TRANSLATION_KEYS: Record<string, string> = {
  'غرفة عادية': 'roomTypeStandard',
  'غرفة مزدوجة': 'roomTypeDouble',
  'جناح ملكي': 'roomTypeRoyalSuite',
};

export function roomTypeTranslationKey(storedType: string | null | undefined): string | undefined {
  const raw = (storedType ?? '').trim();
  return raw ? ROOM_TYPE_TRANSLATION_KEYS[raw] : undefined;
}
