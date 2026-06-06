import { Room } from '../models/room.model';
import { HotelCurrencyService } from '../services/hotel-currency.service';

/** رمز العملة المعروض للغرفة — من قاعدة البيانات أولاً */
export function roomCurrencySymbol(room: Room | null | undefined, fallback?: HotelCurrencyService): string {
  const saved = room?.currencySymbol?.trim();
  if (saved) {
    return saved;
  }
  return fallback?.symbol() ?? 'YR';
}

export function roomCurrencyCode(room: Room | null | undefined, fallback?: HotelCurrencyService): string {
  const saved = room?.currencyCode?.trim();
  if (saved) {
    return saved;
  }
  return fallback?.code() ?? 'YER';
}

/** يثبّت عملة الغرفة عند الحفظ */
export function withRoomCurrencyForSave(
  room: Room,
  currency: HotelCurrencyService,
  uiLocale?: string,
): Room {
  const savedCode = room.currencyCode?.trim();
  const savedSymbol = room.currencySymbol?.trim();
  if (savedCode && savedSymbol) {
    return {
      ...room,
      currencyCode: savedCode,
      currencySymbol: savedSymbol,
    };
  }

  if (room.id > 0) {
    return room;
  }

  if (currency.isCustom()) {
    return {
      ...room,
      currencyCode: currency.code(),
      currencySymbol: currency.symbol(),
    };
  }

  return {
    ...room,
    currencyCode: currency.code(),
    currencySymbol: currency.symbol(),
  };
}
