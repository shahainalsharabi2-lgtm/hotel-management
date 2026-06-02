export const HOTEL_LOCAL_KEYS = {
  floors: 'hotelFloors',
  rooms: 'hotelRooms',
  bookings: 'hotelBookings',
  guestRegistries: 'hotelGuestRegistries',
  identityTypes: 'hotelIdentityTypes',
  generalCodes: 'hotelGeneralCodes',
  uiTranslations: 'hotelUiTranslationsPayload',
} as const;

export function readLocalJsonArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function writeLocalJsonArray<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

export function nextLocalNumericId(items: ReadonlyArray<{ id?: number | null }>): number {
  let max = 0;
  for (const item of items) {
    const n = Number(item.id);
    if (Number.isFinite(n) && n > max) {
      max = n;
    }
  }
  return max + 1;
}

export function readLocalJsonObject<T extends Record<string, unknown>>(key: string): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return {} as T;
    }
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

export function writeLocalJsonObject<T extends Record<string, unknown>>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
