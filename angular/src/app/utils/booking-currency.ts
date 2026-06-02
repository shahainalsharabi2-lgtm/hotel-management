import { Booking } from '../models/booking.model';
import { Room } from '../models/room.model';
import { HotelCurrencyService } from '../services/hotel-currency.service';
import {
  currencyIdForUiLocale,
  HOTEL_CURRENCY_PRESETS,
} from './hotel-currency.presets';

/** رمز العملة المعروض للحجز — من قاعدة البيانات أولاً */
export function bookingCurrencySymbol(
  booking: Booking | null | undefined,
  fallback?: HotelCurrencyService,
): string {
  const saved = booking?.currencySymbol?.trim();
  if (saved) {
    return saved;
  }
  return fallback?.symbol() ?? 'YR';
}

/** يثبّت عملة الحجز عند الإنشاء (غرفة محددة → عملتها، وإلا لغة الواجهة) */
export function withBookingCurrencyForSave(
  booking: Booking,
  currency: HotelCurrencyService,
  uiLocale?: string,
  room?: Room | null,
): Booking {
  if (booking.currencyCode?.trim() && booking.currencySymbol?.trim()) {
    return booking;
  }

  if (room?.currencyCode?.trim() && room?.currencySymbol?.trim()) {
    return {
      ...booking,
      currencyCode: room.currencyCode.trim(),
      currencySymbol: room.currencySymbol.trim(),
    };
  }

  if (currency.isCustom()) {
    return {
      ...booking,
      currencyCode: currency.code(),
      currencySymbol: currency.symbol(),
    };
  }

  const presetId = uiLocale ? currencyIdForUiLocale(uiLocale) : currency.id();
  const preset = HOTEL_CURRENCY_PRESETS.find((p) => p.id === presetId);
  return {
    ...booking,
    currencyCode: preset?.code ?? currency.code(),
    currencySymbol: preset?.symbol ?? currency.symbol(),
  };
}
