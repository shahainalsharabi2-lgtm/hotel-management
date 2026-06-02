import { Room } from '../models/room.model';
import { HotelCurrencyService } from '../services/hotel-currency.service';
import {
  currencyIdForUiLocale,
  HOTEL_CURRENCY_PRESETS,
} from './hotel-currency.presets';

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

/** يثبّت عملة الغرفة عند الإنشاء — حسب لغة الواجهة أو إعداد العملة */
export function withRoomCurrencyForSave(
  room: Room,
  currency: HotelCurrencyService,
  uiLocale?: string,
): Room {
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

  const presetId = uiLocale ? currencyIdForUiLocale(uiLocale) : currency.id();
  const preset = HOTEL_CURRENCY_PRESETS.find((p) => p.id === presetId);
  return {
    ...room,
    currencyCode: preset?.code ?? currency.code(),
    currencySymbol: preset?.symbol ?? currency.symbol(),
  };
}
