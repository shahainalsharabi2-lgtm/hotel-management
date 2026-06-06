import { Booking } from '../models/booking.model';
import { isBookingConfirmedFlag } from './booking-display.util';

/** نوع الحجز: مؤكد / غير مؤكد */
export const BOOKING_CONFIRM_OPTIONS = [
  { value: true, icon: 'fa-check-circle', labelKey: 'bookingConfirmed' },
  { value: false, icon: 'fa-clock', labelKey: 'bookingUnconfirmed' },
] as const;

export function bookingConfirmMeta(booking: Booking): (typeof BOOKING_CONFIRM_OPTIONS)[number] {
  return isBookingConfirmedFlag(booking) ? BOOKING_CONFIRM_OPTIONS[0] : BOOKING_CONFIRM_OPTIONS[1];
}

/** أنواع الحجز في قائمة صفحة /booking (حجز مسبق فقط) */
export type BookingKindId = 'confirmed' | 'unconfirmed' | 'advance_deposit';

export const BOOKING_KIND_OPTIONS: ReadonlyArray<{
  id: BookingKindId;
  icon: string;
  labelKey: string;
}> = [
  { id: 'confirmed', icon: 'fa-check-circle', labelKey: 'bookingKindConfirmed' },
  { id: 'unconfirmed', icon: 'fa-clock', labelKey: 'bookingKindUnconfirmed' },
  { id: 'advance_deposit', icon: 'fa-hand-holding-usd', labelKey: 'bookingKindAdvanceDeposit' },
];

export function isBookingKindId(value: unknown): value is BookingKindId {
  return BOOKING_KIND_OPTIONS.some((o) => o.id === value);
}

/** مصادر الحجز — قائمة اختيارية في التسكين المباشر */
export const BOOKING_SOURCE_OPTIONS = [
  { id: 'direct', labelKey: 'sourceDirect' },
  { id: 'electronic', labelKey: 'sourceElectronic' },
  { id: 'company', labelKey: 'sourceCompany' },
  { id: 'institution', labelKey: 'sourceInstitution' },
  { id: 'employee', labelKey: 'sourceEmployee' },
] as const;
