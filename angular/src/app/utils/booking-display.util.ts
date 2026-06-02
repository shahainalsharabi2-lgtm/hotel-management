import { Booking } from '../models/booking.model';
import { todayLocalDateString, toDateOnlyString } from './date-only';
import { formatLocaleMoney } from './locale-format.util';

/** حجز مسبق (اسم + غرفة — يُكمَّل عند التسكين) */
export function isBookingReserved(booking: Booking): boolean {
  return booking.status === 'reserved';
}

/** مهلة إلغاء حجز مسبق غير مُسكَّن — مؤكد (بعد انتهاء موعد الإقامة) */
export const RESERVED_CANCEL_GRACE_CONFIRMED_MS = 3 * 60 * 60 * 1000;

/** مهلة إلغاء حجز مسبق غير مُسكَّن — غير مؤكد */
export const RESERVED_CANCEL_GRACE_UNCONFIRMED_MS = 1 * 60 * 60 * 1000;

/** @deprecated استخدم reservedBookingCancelGraceMs */
export const EXPIRED_RESERVED_HIDE_AFTER_MS = RESERVED_CANCEL_GRACE_CONFIRMED_MS;

export function isBookingConfirmedFlag(booking: Booking): boolean {
  return booking.booking_Confirmed !== false;
}

/** مدة السماح قبل إلغاء/إخفاء حجز مسبق دون تسكين */
export function reservedBookingCancelGraceMs(booking: Booking): number {
  return isBookingConfirmedFlag(booking)
    ? RESERVED_CANCEL_GRACE_CONFIRMED_MS
    : RESERVED_CANCEL_GRACE_UNCONFIRMED_MS;
}

/** لحظة الإلغاء التلقائي لحجز مسبق إن لم يُسكَّن */
export function reservedBookingCancelDeadline(booking: Booking): Date | null {
  if (!isBookingReserved(booking)) {
    return null;
  }
  const checkOut = parseBookingCheckOutLocal(booking);
  if (!checkOut) {
    return null;
  }
  return new Date(checkOut.getTime() + reservedBookingCancelGraceMs(booking));
}

/** حجز مسبق لم يُسكَّن وتجاوز مهلة الإلغاء بعد انتهاء الإقامة المجدولة */
export function isExpiredReservedWithoutCheckIn(
  booking: Booking,
  graceMs?: number,
): boolean {
  if (!isBookingReserved(booking)) {
    return false;
  }
  const checkOut = parseBookingCheckOutLocal(booking);
  if (!checkOut) {
    return false;
  }
  const grace = graceMs ?? reservedBookingCancelGraceMs(booking);
  return Date.now() - checkOut.getTime() > grace;
}

/** حجز في مرحلة المغادرة (نُقل من المقيمين — لم يُسجَّل الخروج النهائي بعد) */
export function isBookingDepartingStatus(booking: Booking): boolean {
  return booking.status === 'departing';
}

/** حجز نشط في سجل الحجز (غير ملغى ولم يُسجَّل خروجه) */
export function isBookingActive(booking: Booking): boolean {
  if (booking.status === 'cancelled' || booking.status === 'checked_out') {
    return false;
  }
  if (isExpiredReservedWithoutCheckIn(booking)) {
    return false;
  }
  return (
    booking.status === 'active' ||
    booking.status === 'reserved' ||
    booking.status === 'departing' ||
    !booking.status
  );
}

/** قبل موعد المغادرة المجدول يُعرض النزيل في «المغادرون» (وليس «المقيمون») */
export const CHECKOUT_DEPARTING_WINDOW_MS = 30 * 60 * 1000;

/** ملّي ثانية حتى موعد المغادرة المجدول؛ سالب = تجاوز الموعد */
export function msUntilScheduledCheckout(booking: Booking): number | null {
  const checkOut = parseBookingCheckOutLocal(booking);
  if (!checkOut) {
    return null;
  }
  return checkOut.getTime() - Date.now();
}

/**
 * قادم — حجز نشط وموعد الدخول لم يحن بعد.
 */
export function isBookingArriving(booking: Booking): boolean {
  if (!isBookingActive(booking)) {
    return false;
  }
  if (isBookingReserved(booking)) {
    if (isExpiredReservedWithoutCheckIn(booking)) {
      return false;
    }
    const checkIn = parseBookingCheckInLocal(booking);
    const checkOut = parseBookingCheckOutLocal(booking);
    if (checkIn && checkOut) {
      const listHideAt = checkOut.getTime() + reservedBookingCancelGraceMs(booking);
      return Date.now() < listHideAt;
    }
    if (checkIn) {
      return Date.now() < checkIn.getTime() + reservedBookingCancelGraceMs(booking);
    }
    const today = todayLocalDateString();
    const ci = bookingCheckInYmd(booking);
    const co = bookingCheckOutYmd(booking);
    if (ci && co && today > co) {
      return false;
    }
    return !!ci && ci >= today;
  }
  const checkIn = parseBookingCheckInLocal(booking);
  if (checkIn) {
    return Date.now() < checkIn.getTime();
  }
  const today = todayLocalDateString();
  const ci = bookingCheckInYmd(booking);
  return !!ci && ci > today;
}

/**
 * مقيم الآن — حجز نشط ولم يحن موعد المغادرة بعد (أكثر من 30 دقيقة متبقية).
 */
export function isBookingCurrentlyStaying(booking: Booking): boolean {
  if (!isBookingActive(booking)) {
    return false;
  }
  if (isBookingDepartingStatus(booking)) {
    return false;
  }
  if (isBookingReserved(booking)) {
    return false;
  }
  const checkIn = parseBookingCheckInLocal(booking);
  if (checkIn && Date.now() < checkIn.getTime()) {
    return false;
  }
  const ms = msUntilScheduledCheckout(booking);
  if (ms !== null) {
    return ms > CHECKOUT_DEPARTING_WINDOW_MS;
  }
  const today = todayLocalDateString();
  const ci = bookingCheckInYmd(booking);
  const co = bookingCheckOutYmd(booking);
  if (!ci || !co) {
    return false;
  }
  return ci <= today && today < co;
}

/**
 * مغادر قريباً — حجز نشط وتبقى 30 دقيقة أو أقل على موعد المغادرة (أو تجاوزه دون تسجيل خروج).
 */
export function isBookingDepartingWithinWindow(
  booking: Booking,
  windowMs: number = CHECKOUT_DEPARTING_WINDOW_MS
): boolean {
  if (!isBookingActive(booking)) {
    return false;
  }
  if (isBookingDepartingStatus(booking)) {
    return true;
  }
  const checkIn = parseBookingCheckInLocal(booking);
  if (checkIn && Date.now() < checkIn.getTime()) {
    return false;
  }
  const ms = msUntilScheduledCheckout(booking);
  if (ms !== null) {
    return ms <= windowMs;
  }
  const today = todayLocalDateString();
  return bookingCheckOutYmd(booking) === today;
}

/** أرقام الغرف ذات حجز مقيم (فريدة) */
export function stayingBookingRoomNumbers(bookings: Booking[]): Set<string> {
  const nums = new Set<string>();
  for (const b of bookings) {
    if (!isBookingCurrentlyStaying(b)) {
      continue;
    }
    const n = String(b.room_Number ?? '').trim();
    if (n) {
      nums.add(n);
    }
  }
  return nums;
}

/** عدد الغرف المحجوزة فعلياً وفق سجل الحجز */
export function countStayingBookedRooms(bookings: Booking[]): number {
  return stayingBookingRoomNumbers(bookings).size;
}

/** عرض مبلغ — يمرّر لغة الواجهة ('ar' | 'en' | …) لاستخدام الأرقام العربية */
export function formatPmsMoney(
  amount: number | undefined | null,
  displayLocale = 'ar',
): string {
  const loc = displayLocale === 'ar-SA' || displayLocale === 'ar-YE' ? 'ar' : displayLocale;
  return formatLocaleMoney(amount, loc);
}

/**
 * يوحّد عدد الأشخاص / البالغين / الأطفال.
 * حجز مسبق قد يحفظ people_Count فقط بينما adults_Count يبقى 1 (افتراضي النموذج).
 */
export function syncBookingOccupancyCounts(input: {
  people_Count?: number;
  adults_Count?: number;
  children_Count?: number;
}): { people_Count: number; adults_Count: number; children_Count: number } {
  const toPeople = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
  };
  const toCount = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };

  const people = toPeople(input.people_Count);
  const adults = toCount(input.adults_Count);
  const children = toCount(input.children_Count) ?? 0;

  if (people != null) {
    const sum = (adults ?? 0) + children;
    if (sum === people) {
      return {
        people_Count: people,
        adults_Count: Math.max(1, adults ?? 1),
        children_Count: children,
      };
    }
    if (children > 0 && children < people) {
      return {
        people_Count: people,
        adults_Count: Math.max(1, people - children),
        children_Count: children,
      };
    }
    return {
      people_Count: people,
      adults_Count: Math.max(1, people),
      children_Count: 0,
    };
  }

  const a = Math.max(1, adults ?? 1);
  const c = children;
  const p = Math.max(1, a + c);
  return { people_Count: p, adults_Count: a, children_Count: c };
}

/** عدد الليالي الفعلي (لا يقل عن 1 لحساب المدة) */
export function effectiveStayDays(booking: Booking): number {
  const n = Number(booking.stay_Days);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.floor(n);
}

export function bookingCheckInYmd(booking: Booking): string {
  return toDateOnlyString(booking.booking_Date);
}

export function addDaysToYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** تاريخ المغادرة (تقويم) = يوم الدخول + عدد الليالي */
export function bookingCheckOutYmd(booking: Booking): string {
  const ci = bookingCheckInYmd(booking);
  if (!ci) {
    return '';
  }
  return addDaysToYmd(ci, effectiveStayDays(booking));
}

function parseTimeParts(time?: string): { h: number; m: number; s: number } {
  const raw = (time ?? '14:00').trim();
  const parts = raw.split(':').map((p) => parseInt(p, 10));
  return {
    h: Number.isFinite(parts[0]) ? parts[0] : 14,
    m: Number.isFinite(parts[1]) ? parts[1] : 0,
    s: Number.isFinite(parts[2]) ? parts[2] : 0,
  };
}

/** لحظة الدخول بالتوقيت المحلي (بدون انزياح UTC على التاريخ) */
export function parseBookingCheckInLocal(booking: Booking): Date | null {
  if (booking.bookingDateTime) {
    const fromIso = new Date(booking.bookingDateTime);
    if (!Number.isNaN(fromIso.getTime())) {
      return fromIso;
    }
  }

  const ymd = bookingCheckInYmd(booking);
  if (!ymd) {
    return null;
  }

  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) {
    return null;
  }

  const { h, m: mi, s } = parseTimeParts(booking.booking_Time);
  return new Date(y, m - 1, d, h, mi, s);
}

/** لحظة الخروج = الدخول + (ليالي × 24 ساعة) */
export function parseBookingCheckOutLocal(booking: Booking): Date | null {
  const checkIn = parseBookingCheckInLocal(booking);
  if (!checkIn) {
    return null;
  }
  const ms = effectiveStayDays(booking) * 24 * 60 * 60 * 1000;
  return new Date(checkIn.getTime() + ms);
}

export function isStayPeriodEnded(booking: Booking): boolean {
  const checkOut = parseBookingCheckOutLocal(booking);
  if (!checkOut) {
    return false;
  }
  return Date.now() >= checkOut.getTime();
}

export function formatSlashDate(ymd: string): string {
  if (!ymd) {
    return '—';
  }
  const p = ymd.split('-');
  if (p.length !== 3) {
    return ymd;
  }
  return `${p[0]}/${p[1]}/${p[2]}`;
}

export function formatTime12h(time?: string): string {
  if (!time) {
    return '—';
  }
  try {
    const parts = time.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1] ?? '00';
    const period = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  } catch {
    return time;
  }
}

export function guestFullName(booking: Booking | null | undefined): string {
  if (!booking) {
    return '';
  }
  return `${booking.first_Name || ''} ${booking.last_Name || ''}`.trim();
}

/** تقسيم الاسم الكامل إلى أول + باقي الكلمات (للتسكين المباشر) */
export function splitGuestFullName(full: string): { first: string; last: string } {
  const normalized = full.trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return { first: '', last: '' };
  }
  const parts = normalized.split(' ');
  if (parts.length === 1) {
    return { first: parts[0], last: '' };
  }
  return { first: parts[0], last: parts.slice(1).join(' ') };
}

/** مفتاح تجميع الحجوزات — يفضّل رقم الفاتورة المشترك ثم هوية النزيل */
export function bookingGroupKey(booking: Booking): string {
  const inv = String(booking.invoice_Number ?? '').trim();
  if (inv) {
    return `inv:${inv}`;
  }
  return guestIdentityKey(booking);
}

/** مفتاح فريد للنزيل — للمقارنة بين حجوزات بنفس الشخص */
/** حجز مسبق يطابق تسكيناً قادماً (نفس الفاتورة أو نفس النزيل+الغرفة) */
export function findReservedBookingForCheckIn(
  bookings: Booking[],
  criteria: {
    id?: number | null;
    invoice_Number?: string | null;
    room_Number?: string | null;
    first_Name?: string | null;
    last_Name?: string | null;
    phone_Number?: string | null;
    id_Number?: string | null;
  },
): Booking | undefined {
  const reserved = bookings.filter((b) => isBookingReserved(b));
  const id = criteria.id;
  if (id != null && id > 0) {
    const byId = reserved.find((b) => b.id === id);
    if (byId) {
      return byId;
    }
  }
  const invoice = String(criteria.invoice_Number ?? '').trim();
  if (invoice) {
    const byInvoice = reserved.find((b) => String(b.invoice_Number ?? '').trim() === invoice);
    if (byInvoice) {
      return byInvoice;
    }
  }
  const room = String(criteria.room_Number ?? '').trim();
  const key = guestIdentityKey({
    first_Name: criteria.first_Name ?? '',
    last_Name: criteria.last_Name ?? '',
    phone_Number: criteria.phone_Number ?? '',
    id_Number: criteria.id_Number ?? '',
  } as Booking);
  if (room && key) {
    return reserved.find(
      (b) => String(b.room_Number ?? '').trim() === room && guestIdentityKey(b) === key,
    );
  }
  return undefined;
}

export function guestIdentityKey(booking: Booking): string {
  const id = String(booking.id_Number ?? '').trim();
  if (id) {
    return `id:${id}`;
  }
  const phone = String(booking.phone_Number ?? '').trim();
  const name = guestFullName(booking).toLowerCase();
  if (name && phone) {
    return `guest:${name}|${phone}`;
  }
  if (name) {
    return `guest:${name}`;
  }
  return '';
}

/** حجوزات نشطة: نفس الفاتورة (حجزان+) أو نفس النزيل (حجزان+) */
export function bookingsForGuestsWithMultipleActive(bookings: Booking[]): Booking[] {
  const active = bookings.filter((b) => isBookingActive(b));
  const counts = new Map<string, number>();
  for (const b of active) {
    const key = bookingGroupKey(b);
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const multiKeys = new Set(
    [...counts.entries()].filter(([, n]) => n >= 2).map(([key]) => key)
  );
  return active.filter((b) => multiKeys.has(bookingGroupKey(b)));
}

export interface MultiBookingGuestGroup {
  guestKey: string;
  guestName: string;
  invoiceNumber: string;
  bookings: Booking[];
}

export function groupBookingsByGuestIdentity(bookings: Booking[]): MultiBookingGuestGroup[] {
  const map = new Map<string, Booking[]>();
  for (const b of bookings) {
    const key = bookingGroupKey(b) || `booking:${b.id ?? ''}`;
    const list = map.get(key) ?? [];
    list.push(b);
    map.set(key, list);
  }
  return [...map.entries()]
    .map(([guestKey, list]) => ({
      guestKey,
      guestName: guestFullName(list[0]) || '—',
      invoiceNumber: String(list[0]?.invoice_Number ?? '').trim(),
      bookings: [...list].sort((a, b) =>
        String(a.room_Number ?? '').localeCompare(String(b.room_Number ?? ''), 'ar')
      ),
    }))
    .sort((a, b) => a.guestName.localeCompare(b.guestName, 'ar'));
}

export function guestInitial(booking: Booking | null | undefined): string {
  const n = guestFullName(booking);
  return n ? n.charAt(0) : '?';
}

function formatDurationUntilMs(diffMs: number): string {
  const remainingDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const remainingHours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const remainingMinutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

  let message = '';
  if (remainingDays > 0) {
    message += `${remainingDays} يوم و `;
  }
  message += `${remainingHours} ساعة و ${remainingMinutes} دقيقة`;
  return message;
}

/** مرحلة العدّاد لبطاقة الحجز المسبق */
export type ReservedCountdownPhase = 'until-checkin' | 'arrival-due' | 'until-cancel' | 'past-cancel';

export function reservedCountdownPhase(booking: Booking): ReservedCountdownPhase {
  const checkIn = parseBookingCheckInLocal(booking);
  if (!checkIn) {
    return 'until-checkin';
  }

  const now = Date.now();
  if (now < checkIn.getTime()) {
    return 'until-checkin';
  }

  const checkOut = parseBookingCheckOutLocal(booking);
  const cancelAt = reservedBookingCancelDeadline(booking);
  if (checkOut && cancelAt && now >= checkOut.getTime()) {
    return now >= cancelAt.getTime() ? 'past-cancel' : 'until-cancel';
  }

  return 'arrival-due';
}

/** عدّاد حتى موعد الوصول — للحجز المسبق قبل التسكين */
export function checkInCountdownText(booking: Booking): string {
  if (booking.status === 'cancelled') {
    return 'ملغى';
  }
  if (booking.status === 'checked_out') {
    return 'تم الخروج';
  }

  const checkIn = parseBookingCheckInLocal(booking);
  if (!checkIn) {
    return '—';
  }

  const phase = reservedCountdownPhase(booking);

  if (phase === 'until-checkin') {
    return formatDurationUntilMs(checkIn.getTime() - Date.now());
  }

  return '—';
}

export function checkoutCountdownText(booking: Booking): string {
  if (booking.status === 'cancelled') {
    return 'ملغى';
  }
  if (booking.status === 'checked_out') {
    return 'تم الخروج';
  }

  const checkOut = parseBookingCheckOutLocal(booking);
  if (!checkOut) {
    return '—';
  }

  const diffMs = checkOut.getTime() - Date.now();
  if (diffMs <= 0) {
    return 'انتهى وقت الإقامة المجدول';
  }

  return formatDurationUntilMs(diffMs);
}

export type PmsCountdownLabelKey =
  | 'pmsRemainingCheckIn'
  | 'pmsBookingType'
  | 'pmsRemainingCheckout';

/** تسمية العدّاد المناسبة للبطاقة */
export function pmsCardCountdownLabelKey(booking: Booking): PmsCountdownLabelKey {
  if (!isBookingReserved(booking)) {
    return 'pmsRemainingCheckout';
  }

  switch (reservedCountdownPhase(booking)) {
    case 'until-checkin':
      return 'pmsRemainingCheckIn';
    case 'arrival-due':
    case 'until-cancel':
    case 'past-cancel':
    default:
      return 'pmsBookingType';
  }
}

export function pmsCardCountdownText(booking: Booking): string {
  return isBookingReserved(booking) ? checkInCountdownText(booking) : checkoutCountdownText(booking);
}
