import { Booking } from '../models/booking.model';
import {
  bookingCheckInYmd,
  bookingCheckOutYmd,
  isBookingCurrentlyStaying,
  isBookingDepartingWithinWindow,
} from './booking-display.util';
import { toDateOnlyString } from './date-only';

export type ReportKind =
  | 'bookings'
  | 'staying'
  | 'staying-summary'
  | 'departing'
  | 'cancelled'
  | 'no_show';

export const REPORT_KINDS: readonly ReportKind[] = [
  'staying',
  'staying-summary',
  'departing',
  'bookings',
  'cancelled',
  'no_show',
] as const;

export function isReportKind(value: string | null | undefined): value is ReportKind {
  return !!value && (REPORT_KINDS as readonly string[]).includes(value);
}

/** فلترة حسب تاريخ الحجز (booking_Date) */
export function filterBookingsByBookingDate(
  bookings: Booking[],
  fromDate: string,
  toDate: string,
): Booking[] {
  return bookings.filter((booking) => {
    const dateKey = toDateOnlyString(booking.booking_Date);
    if (!dateKey) {
      return !fromDate && !toDate;
    }
    if (fromDate && dateKey < fromDate) {
      return false;
    }
    if (toDate && dateKey > toDate) {
      return false;
    }
    return true;
  });
}

/** فلترة اختيارية حسب تاريخ الوصول */
export function filterByCheckInDate(
  bookings: Booking[],
  fromDate: string,
  toDate: string,
): Booking[] {
  if (!fromDate && !toDate) {
    return bookings;
  }
  return bookings.filter((b) => {
    const ci = bookingCheckInYmd(b);
    if (!ci) {
      return !fromDate && !toDate;
    }
    if (fromDate && ci < fromDate) {
      return false;
    }
    if (toDate && ci > toDate) {
      return false;
    }
    return true;
  });
}

export function bookingsForReport(
  all: Booking[],
  kind: ReportKind,
  fromDate: string,
  toDate: string,
): Booking[] {
  switch (kind) {
    case 'staying':
    case 'staying-summary': {
      let list = all.filter((b) => isBookingCurrentlyStaying(b));
      list = filterByCheckInDate(list, fromDate, toDate);
      return sortByGuestName(list);
    }
    case 'departing': {
      let list = all.filter((b) => isBookingDepartingWithinWindow(b));
      list = filterByCheckInDate(list, fromDate, toDate);
      return sortByCheckoutDate(list);
    }
    case 'cancelled': {
      const list = filterBookingsByBookingDate(
        all.filter((b) => b.status === 'cancelled'),
        fromDate,
        toDate,
      );
      return sortByBookingDateDesc(list);
    }
    case 'no_show': {
      const list = filterBookingsByBookingDate(
        all.filter((b) => b.status === 'no_show'),
        fromDate,
        toDate,
      );
      return sortByBookingDateDesc(list);
    }
    case 'bookings':
    default:
      return sortByBookingDateDesc(filterBookingsByBookingDate(all, fromDate, toDate));
  }
}

export function reportUsesLiveSnapshot(kind: ReportKind): boolean {
  return kind === 'staying' || kind === 'staying-summary' || kind === 'departing';
}

function sortByGuestName(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => {
    const na = `${a.first_Name || ''} ${a.last_Name || ''}`.trim();
    const nb = `${b.first_Name || ''} ${b.last_Name || ''}`.trim();
    return na.localeCompare(nb, 'ar');
  });
}

function sortByCheckoutDate(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => {
    const ca = bookingCheckOutYmd(a);
    const cb = bookingCheckOutYmd(b);
    return ca.localeCompare(cb);
  });
}

function sortByBookingDateDesc(bookings: Booking[]): Booking[] {
  return [...bookings].sort((a, b) => {
    const da = toDateOnlyString(a.booking_Date);
    const db = toDateOnlyString(b.booking_Date);
    return db.localeCompare(da);
  });
}

export function sumBookingMoney(bookings: Booking[], field: 'total_Price' | 'payment_Amount' | 'remaining_Amount'): number {
  return bookings.reduce((sum, b) => sum + (Number(b[field]) || 0), 0);
}
