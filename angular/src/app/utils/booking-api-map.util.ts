import { Booking } from '../models/booking.model';
import { syncBookingOccupancyCounts } from './booking-display.util';

const API_STRING_FALLBACK = '—';

function apiStr(value: unknown, fallback = API_STRING_FALLBACK): string {
  if (value === null || value === undefined) {
    return fallback;
  }
  const trimmed = String(value).trim();
  return trimmed || fallback;
}

/** يضمن حقولاً نصية غير null قبل POST/PUT — يمنع «Your request is not valid» من ABP */
export function sanitizeBookingForApi(booking: Booking): Booking {
  const isReservation = booking.status === 'reserved';
  const optStr = (value: unknown, fallback = API_STRING_FALLBACK): string => {
    const trimmed = String(value ?? '').trim();
    if (trimmed) {
      return trimmed;
    }
    return isReservation ? '' : fallback;
  };
  const occ = syncBookingOccupancyCounts(booking);
  let first = apiStr(booking.first_Name, '');
  let last = apiStr(booking.last_Name, '');
  if (first && !last) {
    last = first;
  } else if (last && !first) {
    first = last;
  }
  if (!first) {
    first = API_STRING_FALLBACK;
  }
  if (!last) {
    last = API_STRING_FALLBACK;
  }

  const bookingDate = booking.booking_Date?.trim() || undefined;
  const bookingTime = apiStr(booking.booking_Time, '00:00');
  const timeForDateTime = bookingTime.length === 5 ? `${bookingTime}:00` : bookingTime;
  let bookingDateTime = booking.bookingDateTime?.trim() || undefined;
  if (!bookingDateTime && bookingDate) {
    bookingDateTime = `${bookingDate}T${timeForDateTime}`;
  }

  const notes = booking.guest_Notes != null ? String(booking.guest_Notes).trim() : '';

  return {
    ...booking,
    first_Name: first,
    last_Name: last,
    phone_Number: optStr(booking.phone_Number),
    id_Number: optStr(booking.id_Number),
    id_Type: optStr(booking.id_Type),
    room_Type: apiStr(booking.room_Type),
    room_Number: apiStr(booking.room_Number),
    floor: apiStr(booking.floor, '0'),
    payment_Method: optStr(booking.payment_Method, isReservation ? '' : 'نقداً'),
    invoice_Number: apiStr(booking.invoice_Number, '0'),
    booking_Time: bookingTime,
    booking_Date: bookingDate,
    bookingDateTime,
    status: apiStr(booking.status, 'active'),
    booking_Source: apiStr(booking.booking_Source, 'direct'),
    booking_Confirmed: booking.booking_Confirmed !== false,
    currencyCode: apiStr(booking.currencyCode, 'YER'),
    currencySymbol: apiStr(booking.currencySymbol, 'YR'),
    guest_Notes: notes,
    people_Count: occ.people_Count,
    adults_Count: occ.adults_Count,
    children_Count: occ.children_Count,
    payment_Amount: Number(booking.payment_Amount) || 0,
    stay_Days: Number(booking.stay_Days) || 1,
    total_Price: Number(booking.total_Price) || 0,
    remaining_Amount: Number(booking.remaining_Amount) ?? 0,
  };
}

/** رسالة خطأ ABP مع تفاصيل التحقق إن وُجدت */
export function formatAbpRequestError(err: unknown): string {
  const body = (err as { error?: { error?: AbpErrorPayload } })?.error?.error;
  if (!body) {
    return '';
  }
  const details = (body.validationErrors ?? [])
    .map((v) => {
      const members = (v.members ?? []).filter(Boolean).join(', ');
      const msg = (v.message ?? '').trim();
      return members && msg ? `${members}: ${msg}` : msg || members;
    })
    .filter(Boolean);
  if (details.length) {
    return details.join(' · ');
  }
  return (body.message ?? '').trim();
}

interface AbpErrorPayload {
  message?: string;
  validationErrors?: Array<{ message?: string; members?: string[] }>;
}

function pickStr(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = raw[key];
    if (v != null && String(v).trim() !== '') {
      return String(v).trim();
    }
  }
  return '';
}

function pickBool(raw: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const v = raw[key];
    if (v === true || v === false) {
      return v;
    }
    if (v === 'true' || v === 'True' || v === 1 || v === '1') {
      return true;
    }
    if (v === 'false' || v === 'False' || v === 0 || v === '0') {
      return false;
    }
  }
  return undefined;
}

function pickNum(raw: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = raw[key];
    if (v != null && v !== '' && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return undefined;
}

/** توحيد حقول الحجز القادمة من الـ API (camelCase أو PascalCase) */
export function mapBookingFromApi(raw: Booking | Record<string, unknown>): Booking {
  const r = raw as Record<string, unknown>;
  const id = pickNum(r, 'id', 'Id');
  const occ = syncBookingOccupancyCounts({
    people_Count: pickNum(r, 'people_Count', 'People_Count'),
    adults_Count: pickNum(r, 'adults_Count', 'Adults_Count'),
    children_Count: pickNum(r, 'children_Count', 'Children_Count'),
  });
  return {
    id,
    first_Name: pickStr(r, 'first_Name', 'First_Name'),
    last_Name: pickStr(r, 'last_Name', 'Last_Name'),
    phone_Number: pickStr(r, 'phone_Number', 'Phone_Number'),
    payment_Amount: pickNum(r, 'payment_Amount', 'Payment_Amount') ?? 0,
    id_Number: pickStr(r, 'id_Number', 'Id_Number'),
    id_Type: pickStr(r, 'id_Type', 'Id_Type'),
    room_Type: pickStr(r, 'room_Type', 'Room_Type'),
    room_Number: pickStr(r, 'room_Number', 'Room_Number'),
    floor: pickStr(r, 'floor', 'Floor') || undefined,
    booking_Date: pickStr(r, 'booking_Date', 'Booking_Date') || undefined,
    booking_Time: pickStr(r, 'booking_Time', 'Booking_Time') || undefined,
    bookingDateTime: pickStr(r, 'bookingDateTime', 'BookingDateTime') || undefined,
    payment_Method: pickStr(r, 'payment_Method', 'Payment_Method') || undefined,
    people_Count: occ.people_Count,
    adults_Count: occ.adults_Count,
    children_Count: occ.children_Count,
    invoice_Number: pickStr(r, 'invoice_Number', 'Invoice_Number') || undefined,
    stay_Days: pickNum(r, 'stay_Days', 'Stay_Days'),
    total_Price: pickNum(r, 'total_Price', 'Total_Price'),
    remaining_Amount: pickNum(r, 'remaining_Amount', 'Remaining_Amount'),
    status: pickStr(r, 'status', 'Status') || undefined,
    guest_Notes: pickStr(r, 'guest_Notes', 'Guest_Notes') || undefined,
    booking_Confirmed: pickBool(r, 'booking_Confirmed', 'Booking_Confirmed'),
    booking_Source: pickStr(r, 'booking_Source', 'Booking_Source') || undefined,
    currencyCode: pickStr(r, 'currencyCode', 'CurrencyCode') || undefined,
    currencySymbol: pickStr(r, 'currencySymbol', 'CurrencySymbol') || undefined,
    lastModificationTime: pickStr(r, 'lastModificationTime', 'LastModificationTime') || undefined,
  };
}
