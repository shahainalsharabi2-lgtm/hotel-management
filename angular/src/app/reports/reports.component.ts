import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { Booking } from '../models/booking.model';
import { Room } from '../models/room.model';
import { BookingService } from '../services/booking.service';
import { RoomService } from '../services/room.service';
import { toDateOnlyString } from '../utils/date-only';
import { UiTranslationsService } from '../services/ui-translations.service';
import { bindUiTranslationRefresh } from '../utils/ui-screen-i18n.helper';
import { HotelCurrencyService } from '../services/hotel-currency.service';
import { HotelBrandingStoreService, type HotelBrandingView } from '../services/hotel-branding-store.service';
import { HotelSymbolPipe } from '../pipes/hotel-symbol.pipe';
import { UiMessageService } from '../services/ui-message.service';
import {
  bookingCheckInYmd,
  bookingCheckOutYmd,
} from '../utils/booking-display.util';
import {
  bookingsForReport,
  isReportKind,
  reportUsesLiveSnapshot,
  sumBookingMoney,
  type ReportKind,
} from '../utils/reports-filter.util';

export type LatestBookingsSearchMode = 'all' | 'last_hour' | 'guest' | 'room' | 'floor';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, HotelSymbolPipe],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css'],
})
export class ReportsComponent implements OnInit {
  readonly ui = inject(UiTranslationsService);
  readonly hotelBranding = inject(HotelBrandingStoreService);
  readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly uiMsg = inject(UiMessageService);

  rooms: Room[] = [];
  bookings: Booking[] = [];
  loading = true;
  error = '';

  /** أيقونة فندق افتراضية (بيضوية / فاخرة) عند عدم رفع شعار */
  private readonly defaultHotelImageDataUrl =
    'data:image/svg+xml,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">
        <defs>
          <linearGradient id="sky" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stop-color="#0c4a6e"/>
            <stop offset="55%" stop-color="#075985"/>
            <stop offset="100%" stop-color="#0e7490"/>
          </linearGradient>
          <linearGradient id="lux" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fef9c3"/>
            <stop offset="35%" stop-color="#fbbf24"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>
          <linearGradient id="win" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#bae6fd" stop-opacity=".9"/>
            <stop offset="100%" stop-color="#38bdf8" stop-opacity=".35"/>
          </linearGradient>
        </defs>
        <ellipse cx="128" cy="128" rx="120" ry="88" fill="url(#sky)"/>
        <ellipse cx="128" cy="138" rx="100" ry="68" fill="#000" opacity=".12"/>
        <g>
          <path fill="url(#lux)" d="M128 68 72 118h12v62h88V118h12z"/>
          <path fill="#0f172a" opacity=".2" d="M128 72v46h40V96z"/>
          <rect x="104" y="132" width="48" height="46" rx="2" fill="#164e63" opacity=".35"/>
          <rect x="86" y="116" width="14" height="18" rx="1" fill="url(#win)"/>
          <rect x="156" y="116" width="14" height="18" rx="1" fill="url(#win)"/>
          <rect x="118" y="108" width="20" height="22" rx="1" fill="url(#win)" opacity=".85"/>
        </g>
        <circle cx="128" cy="58" r="5" fill="#fef08a" opacity=".95"/>
        <path fill="#fef08a" opacity=".5" d="M196 52l3 8 9 1-7 6 2 9-7-5-7 5 2-9-7-6 9-1z"/>
        <path fill="#fef08a" opacity=".35" d="M62 68l2 5 6 .5-4.5 4 1.2 5.8-4.7-3.2-4.7 3.2 1.2-5.8-4.5-4 6-.5z"/>
        <ellipse cx="128" cy="198" rx="72" ry="8" fill="#000" opacity=".18"/>
      </svg>`
    );

  fromDate = '';
  toDate = '';

  /** بحث قسم «آخر الحجوزات» */
  latestSearchMode: LatestBookingsSearchMode = 'all';
  latestSearchText = '';

  constructor(
    private readonly roomService: RoomService,
    private readonly bookingService: BookingService
  ) {}

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const report = params.get('report');
      if (!report) {
        void this.router.navigate(['/reports'], {
          queryParams: { report: 'bookings' },
          replaceUrl: true,
        });
        return;
      }
      if (!isReportKind(report)) {
        void this.router.navigate(['/reports'], {
          queryParams: { report: 'bookings' },
          replaceUrl: true,
        });
      }
    });
    this.loadReportData();
  }

  get activeReportKind(): ReportKind {
    const raw = this.route.snapshot.queryParamMap.get('report');
    return isReportKind(raw) ? raw : 'bookings';
  }

  get reportTitleKey(): string {
    const keys: Record<ReportKind, string> = {
      bookings: 'reportBookingsTitle',
      staying: 'reportStayingListTitle',
      'staying-summary': 'reportStayingSummaryTitle',
      departing: 'reportDepartingTitle',
      cancelled: 'reportCancelledTitle',
      no_show: 'reportNoShowTitle',
    };
    return keys[this.activeReportKind];
  }

  get reportSubtitleKey(): string {
    const keys: Record<ReportKind, string> = {
      bookings: 'reportBookingsSubtitle',
      staying: 'reportStayingListSubtitle',
      'staying-summary': 'reportStayingSummarySubtitle',
      departing: 'reportDepartingSubtitle',
      cancelled: 'reportCancelledSubtitle',
      no_show: 'reportNoShowSubtitle',
    };
    return keys[this.activeReportKind];
  }

  get reportUsesSnapshot(): boolean {
    return reportUsesLiveSnapshot(this.activeReportKind);
  }

  /** صفوف التقرير الحالي */
  get reportBookings(): Booking[] {
    return bookingsForReport(this.bookings, this.activeReportKind, this.fromDate, this.toDate);
  }

  get reportTableRows(): Booking[] {
    if (this.activeReportKind === 'bookings') {
      return this.latestBookingsDisplay;
    }
    return this.reportBookings;
  }

  get stayingSummaryCount(): number {
    return this.reportBookings.length;
  }

  get stayingSummaryTotal(): number {
    return sumBookingMoney(this.reportBookings, 'total_Price');
  }

  get stayingSummaryPaid(): number {
    return sumBookingMoney(this.reportBookings, 'payment_Amount');
  }

  get stayingSummaryRemaining(): number {
    return sumBookingMoney(this.reportBookings, 'remaining_Amount');
  }

  displayCheckInDate(booking: Booking): string {
    return bookingCheckInYmd(booking) || '—';
  }

  displayCheckOutDate(booking: Booking): string {
    return bookingCheckOutYmd(booking) || '—';
  }

  loadReportData(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      rooms: this.roomService.getRooms(),
      bookings: this.bookingService.getBookings(),
    }).subscribe({
      next: ({ rooms, bookings }) => {
        this.rooms = rooms;
        this.bookings = bookings;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading reports data', error);
        this.error = 'فشل في تحميل بيانات التقارير. تأكد من تشغيل الباك إند وقاعدة البيانات.';
        this.loading = false;
      },
    });
  }

  get filteredBookings(): Booking[] {
    return bookingsForReport(this.bookings, 'bookings', this.fromDate, this.toDate);
  }

  /** آخر الحجوزات حسب التاريخ ثم حسب وقت الحجز إن وُجد */
  get latestBookingsDisplay(): Booking[] {
    const sorted = [...this.filteredBookings].sort((a, b) => {
      const ta = this.bookingTimestamp(a)?.getTime() ?? -Infinity;
      const tb = this.bookingTimestamp(b)?.getTime() ?? -Infinity;
      if (tb !== ta) {
        return tb - ta;
      }
      const da = toDateOnlyString(a.booking_Date);
      const db = toDateOnlyString(b.booking_Date);
      return db.localeCompare(da);
    });

    let list = sorted;
    if (this.latestSearchMode === 'last_hour') {
      const cutoff = Date.now() - 60 * 60 * 1000;
      list = sorted.filter((b) => {
        const t = this.bookingTimestamp(b)?.getTime();
        return t != null && t >= cutoff;
      });
    } else if (this.latestSearchMode === 'guest') {
      const q = this.normalizeSearch(this.latestSearchText);
      if (!q) {
        list = sorted;
      } else {
        list = sorted.filter((b) => {
          const full = this.normalizeSearch(`${b.first_Name || ''} ${b.last_Name || ''} ${b.phone_Number || ''}`);
          return full.includes(q);
        });
      }
    } else if (this.latestSearchMode === 'room') {
      const q = this.normalizeSearch(this.latestSearchText);
      if (!q) {
        list = sorted;
      } else {
        list = sorted.filter((b) => this.normalizeSearch(b.room_Number || '').includes(q));
      }
    } else if (this.latestSearchMode === 'floor') {
      const q = this.normalizeSearch(this.latestSearchText);
      if (!q) {
        list = sorted;
      } else {
        list = sorted.filter((b) => this.normalizeSearch(String(b.floor ?? '')).includes(q));
      }
    }

    return list.slice(0, 50);
  }

  get latestSearchPlaceholder(): string {
    switch (this.latestSearchMode) {
      case 'guest':
        return this.ui.screenText('reports', 'searchGuestPh');
      case 'room':
        return this.ui.screenText('reports', 'searchRoomPh');
      case 'floor':
        return this.ui.screenText('reports', 'searchFloorPh');
      default:
        return '';
    }
  }

  bookingStatusLabel(status: string | undefined | null): string {
    const s = (status || 'active').toLowerCase().trim();
    switch (s) {
      case 'active':
        return this.ui.screenText('database', 'statusActiveShort');
      case 'checked_out':
        return this.ui.screenText('database', 'statusLeft');
      case 'cancelled':
        return this.ui.screenText('database', 'statusCancelledShort');
      case 'no_show':
        return this.ui.screenText('reports', 'statusNoShow');
      case 'reserved':
        return this.ui.screenText('bookings', 'statusReserved');
      case 'departing':
        return this.ui.screenText('reports', 'statusDeparting');
      default:
        return status || 'نشط';
    }
  }

  clearLatestSearch(): void {
    this.latestSearchMode = 'all';
    this.latestSearchText = '';
  }

  displayBookingDate(booking: Booking): string {
    return booking.booking_Date ? toDateOnlyString(booking.booking_Date) : '—';
  }

  get reportBranding(): HotelBrandingView {
    return this.loadHotelBranding();
  }

  get reportPrintedAt(): string {
    return new Date().toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
  }

  printBooking(booking: Booking): void {
    const w = window.open('', '_blank');
    if (!w) {
      this.uiMsg.warning('يرجى السماح بالنوافذ المنبثقة لطباعة إيصال الحجز.');
      return;
    }

    const esc = (v: string | number | undefined | null) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const brand = this.loadHotelBranding();
    const hotelName = esc(brand.name);
    const addr = esc(brand.address || '—');
    const hPhone = esc(this.formatHotelPhonesForPrint(brand));
    const hEmail = esc(brand.email || '—');
    const guestFull = esc(`${booking.first_Name || ''} ${booking.last_Name || ''}`.trim() || '—');
    const invoiceNo = esc(booking.invoice_Number || '—');
    const bookingMoment = esc(this.formatBookingMomentForPrint(booking));
    const cancellationTileHtml = this.buildCancellationTileHtml(booking, esc);
    const guestsLine = esc(this.guestsLineForPrint(booking));
    const idType = esc(booking.id_Type || '—');
    const idNumber = esc(booking.id_Number || '—');
    const phone = esc(booking.phone_Number || '—');
    const room = esc(booking.room_Number || '—');
    const floor = esc(booking.floor != null && booking.floor !== '' ? String(booking.floor) : '—');
    const roomType = esc(booking.room_Type || '—');
    const statusAr = esc(this.bookingStatusLabel(booking.status));
    const pay = Number(booking.payment_Amount) || 0;
    const rem = Number(booking.remaining_Amount) || 0;
    const total = Number(booking.total_Price) || 0;
    const stay = Number(booking.stay_Days) || 0;
    const printedAt = esc(new Date().toLocaleString('ar-SA', { dateStyle: 'long', timeStyle: 'short' }));

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>تقرير حجز — ${invoiceNo}</title>
  <style>
    :root {
      --ink: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --accent: #0284c7;
      --accent-soft: #e0f2fe;
      --card: #ffffff;
      --shadow: 0 22px 50px rgba(15, 23, 42, 0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 1.75rem;
      font-family: "Segoe UI", "Tahoma", "Arial", sans-serif;
      background: #f1f5f9;
      color: var(--ink);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      max-width: 720px;
      margin: 0 auto;
      background: var(--card);
      border-radius: 20px;
      box-shadow: var(--shadow);
      overflow: hidden;
      border: 1px solid var(--line);
    }
    .sheet-top {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem 1.1rem;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
    }
    .st-col {
      flex: 1;
      min-width: 0;
    }
    .st-center {
      flex: 0 1 auto;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .st-left,
    .st-right {
      text-align: right;
    }
    .st-label {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 800;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .st-val {
      margin: 0.15rem 0 0;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--ink);
      line-height: 1.35;
      word-break: break-word;
    }
    .st-gap {
      margin-top: 0.65rem;
    }
    .st-ltr {
      direction: ltr;
      unicode-bidi: embed;
      text-align: right;
    }
    .st-logo-ring {
      width: 118px;
      height: 118px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid #cbd5e1;
      box-shadow: none;
      background: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .st-logo {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
    .st-hotel {
      margin: 0.55rem 0 0;
      font-size: 1.48rem;
      font-weight: 800;
      line-height: 1.25;
    }
    .st-center-addr-label {
      margin: 0.4rem 0 0;
      font-size: 0.68rem;
      font-weight: 800;
      color: var(--muted);
      letter-spacing: 0.05em;
    }
    .st-center-addr {
      margin: 0.18rem 0 0;
      max-width: 22rem;
      font-size: 0.86rem;
      font-weight: 600;
      color: #475569;
      line-height: 1.45;
      text-align: center;
    }
    .guest-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
    }
    .guest-name-side {
      font-size: 1.32rem;
      font-weight: 800;
      flex: 1;
      min-width: 0;
    }
    .guest-row--name-only {
      justify-content: center;
      text-align: center;
    }
    .guest-row--name-only .guest-name-side {
      flex: none;
      width: 100%;
    }
    .id-status-row {
      margin: 0 2rem 1.25rem;
      padding: 1rem 1.25rem;
      border-radius: 14px;
      border: 1px dashed #bae6fd;
      background: #f0f9ff;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }
    .id-status-left {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }
    .id-status-right {
      flex: 1;
      min-width: 0;
      text-align: right;
    }
    .id-status-right .id-pair {
      margin-bottom: 0.65rem;
    }
    .id-status-right .id-pair:last-child {
      margin-bottom: 0;
    }
    .id-status-right .kid {
      display: block;
      font-size: 0.75rem;
      color: #0369a1;
      font-weight: 800;
      margin-bottom: 0.25rem;
    }
    .id-status-right .vid {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--ink);
    }
    .guest-status-side {
      flex-shrink: 0;
    }
    .status-badge {
      display: inline-block;
      padding: 0.28rem 0.85rem;
      border-radius: 999px;
      font-size: 0.88rem;
      font-weight: 800;
      background: #ecfeff;
      color: #0e7490;
      border: 1px solid #a5f3fc;
    }
    .brand-header {
      text-align: center;
      padding: 1.25rem 2rem 1.15rem;
      background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
      border-bottom: 1px solid var(--line);
    }
    .logo-oval-wrap {
      display: flex;
      justify-content: center;
      margin: 0.75rem 0 0.95rem;
    }
    .logo-oval {
      width: 220px;
      height: 156px;
      object-fit: cover;
      object-position: center;
      border-radius: 50%;
      border: 4px solid #e0f2fe;
      box-shadow: 0 12px 36px rgba(2, 132, 199, 0.2);
      background: #f0f9ff;
    }
    .brand-title {
      margin: 0.15rem 0 0;
      font-size: 1.55rem;
      font-weight: 800;
      color: var(--ink);
      line-height: 1.35;
    }
    .hotel-brand-phone {
      margin: 0.5rem 0 0;
      font-size: 1.02rem;
      font-weight: 700;
      color: #0369a1;
    }
    .hotel-brand-phone span {
      font-variant-numeric: tabular-nums;
    }
    .hotel-brand-address {
      margin: 0.3rem auto 0;
      max-width: 420px;
      font-size: 0.88rem;
      color: var(--muted);
      line-height: 1.5;
    }
    .doc-kind {
      margin: 0 0 0.15rem;
      font-size: 0.78rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
      font-weight: 700;
    }
    .guest-block {
      padding: 1.75rem 2rem 1.25rem;
      text-align: center;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #fafbfc 0%, #fff 100%);
    }
    .guest-name {
      margin: 0;
      font-size: 1.55rem;
      font-weight: 800;
      color: var(--ink);
    }
    .invoice-stack {
      margin-top: 0.65rem;
      font-size: 0.95rem;
      color: var(--muted);
    }
    .invoice-stack .lbl { font-weight: 600; color: #475569; }
    .invoice-num {
      display: inline-block;
      margin-inline-start: 0.35rem;
      padding: 0.15rem 0.65rem;
      border-radius: 999px;
      background: var(--accent-soft);
      color: #0369a1;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
      padding: 1.35rem 2rem;
    }
    @media (max-width: 560px) {
      .grid { grid-template-columns: 1fr; }
    }
    .tile {
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 0.9rem 1.1rem;
      background: #f8fafc;
    }
    .tile .k {
      display: block;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.35rem;
    }
    .tile .v {
      font-size: 0.98rem;
      font-weight: 700;
      color: var(--ink);
      line-height: 1.4;
    }
    .tile.full { grid-column: 1 / -1; }
    .id-strip {
      margin: 0 2rem 1.25rem;
      padding: 1rem 1.25rem;
      border-radius: 14px;
      border: 1px dashed #bae6fd;
      background: #f0f9ff;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 560px) {
      .id-strip { grid-template-columns: 1fr; }
    }
    .id-strip .k { font-size: 0.75rem; color: #0369a1; font-weight: 800; margin-bottom: 0.25rem; }
    .id-strip .v { font-size: 1.05rem; font-weight: 700; }
    .finance {
      margin: 0 2rem 1.5rem;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid var(--line);
    }
    .finance-head {
      background: #0f172a;
      color: #e2e8f0;
      padding: 0.55rem 1.1rem;
      font-size: 0.8rem;
      font-weight: 700;
    }
    .finance-rows {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0;
    }
    @media (max-width: 560px) {
      .finance-rows { grid-template-columns: 1fr; }
    }
    .finance-rows > div {
      padding: 0.85rem 1rem;
      border-inline-end: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      background: #fff;
    }
    .finance-rows > div:last-child { border-inline-end: 0; }
    .finance-rows .fk { font-size: 0.72rem; color: var(--muted); font-weight: 600; }
    .finance-rows .fv { font-size: 1.05rem; font-weight: 800; margin-top: 0.2rem; }
    .footer {
      padding: 0 2rem 1.5rem;
      font-size: 0.82rem;
      color: var(--muted);
      text-align: center;
    }
    .status-pill {
      display: inline-block;
      margin-top: 0.35rem;
      padding: 0.2rem 0.75rem;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 800;
      background: #ecfeff;
      color: #0e7490;
      border: 1px solid #a5f3fc;
    }
    @page {
      size: A4 portrait;
      margin: 7mm;
    }
    @media print {
      html, body {
        height: auto;
        background: #fff !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .sheet {
        box-shadow: none !important;
        border-radius: 0 !important;
        border: 0 !important;
        max-width: none !important;
        margin: 0 !important;
      }
      .sheet-top {
        padding: 0.35rem 0.5rem 0.45rem !important;
        gap: 0.45rem !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .st-label {
        font-size: 6pt !important;
      }
      .st-val {
        font-size: 8.2pt !important;
        margin-top: 0.06rem !important;
      }
      .st-gap {
        margin-top: 0.35rem !important;
      }
      .st-logo-ring {
        width: 96px !important;
        height: 96px !important;
        border-width: 2px !important;
        box-shadow: none !important;
      }
      .st-hotel {
        font-size: 11pt !important;
        margin-top: 0.28rem !important;
      }
      .st-center-addr-label {
        font-size: 6pt !important;
        margin-top: 0.22rem !important;
      }
      .st-center-addr {
        font-size: 7.5pt !important;
        max-width: 42mm !important;
        margin-top: 0.06rem !important;
      }
      .guest-row {
        padding: 0.35rem 0.5rem !important;
        gap: 0.45rem !important;
      }
      .guest-name-side {
        font-size: 11pt !important;
      }
      .id-status-row {
        margin: 0 0.45rem 0.3rem !important;
        padding: 0.35rem 0.5rem !important;
        gap: 0.45rem !important;
        border-radius: 8px !important;
      }
      .id-status-right .kid {
        font-size: 6.5pt !important;
        margin-bottom: 0.08rem !important;
      }
      .id-status-right .vid {
        font-size: 8.5pt !important;
      }
      .id-status-right .id-pair {
        margin-bottom: 0.35rem !important;
      }
      .status-badge {
        font-size: 7.5pt !important;
        padding: 0.12rem 0.45rem !important;
      }
      .grid {
        gap: 0.3rem !important;
        padding: 0.35rem 0.45rem !important;
        grid-template-columns: 1fr 1fr !important;
      }
      .tile {
        padding: 0.3rem 0.4rem !important;
        border-radius: 8px !important;
      }
      .tile .k {
        font-size: 6pt !important;
        margin-bottom: 0.12rem !important;
        letter-spacing: 0.03em !important;
      }
      .tile .v {
        font-size: 8pt !important;
        line-height: 1.2 !important;
      }
      .id-strip {
        margin: 0 0.45rem 0.3rem !important;
        padding: 0.3rem 0.45rem !important;
        gap: 0.35rem !important;
        border-radius: 8px !important;
      }
      .id-strip .k { font-size: 6.5pt !important; margin-bottom: 0.08rem !important; }
      .id-strip .v { font-size: 8.5pt !important; }
      .finance {
        margin: 0 0.45rem 0.3rem !important;
        border-radius: 8px !important;
      }
      .finance-head {
        padding: 0.22rem 0.45rem !important;
        font-size: 7pt !important;
      }
      .finance-rows > div { padding: 0.3rem 0.4rem !important; }
      .finance-rows .fk { font-size: 6pt !important; }
      .finance-rows .fv { font-size: 9pt !important; margin-top: 0.08rem !important; }
      .footer {
        padding: 0.2rem 0.45rem 0.35rem !important;
        font-size: 6.5pt !important;
      }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="sheet-top" dir="ltr">
      <div class="st-col st-left" dir="rtl">
        <p class="st-label">رقم الهاتف</p>
        <p class="st-val st-ltr">${hPhone}</p>
        <p class="st-label st-gap">نص البريد الإلكتروني</p>
        <p class="st-val st-ltr">${hEmail}</p>
      </div>
      <div class="st-col st-center" dir="rtl">
        <div class="st-logo-ring"><img class="st-logo" src="${brand.imageSrc}" alt="" /></div>
        <h1 class="st-hotel">${hotelName}</h1>
        <p class="st-center-addr-label">العنوان</p>
        <p class="st-center-addr">${addr}</p>
      </div>
      <div class="st-col st-right" dir="rtl">
        <p class="st-label">تاريخ الطباعة</p>
        <p class="st-val">${printedAt}</p>
        <p class="st-label st-gap">رقم الفاتورة</p>
        <p class="st-val st-ltr">${invoiceNo}</p>
      </div>
    </header>
    <section class="guest-row guest-row--name-only" dir="rtl">
      <div class="guest-name-side">${guestFull}</div>
    </section>
    <section class="id-status-row" dir="ltr">
      <div class="id-status-left" dir="rtl">
        <span class="status-badge">الحالة: ${statusAr}</span>
      </div>
      <div class="id-status-right" dir="rtl">
        <div class="id-pair">
          <span class="kid">نوع الهوية</span>
          <span class="vid">${idType}</span>
        </div>
        <div class="id-pair">
          <span class="kid">رقم الهوية</span>
          <span class="vid st-ltr">${idNumber}</span>
        </div>
      </div>
    </section>
    <section class="grid">
      <div class="tile full">
        <span class="k">وقت الحجز (التاريخ والساعة)</span>
        <span class="v">${bookingMoment}</span>
      </div>
      ${cancellationTileHtml}
      <div class="tile full">
        <span class="k">عدد الأشخاص</span>
        <span class="v">${guestsLine}</span>
      </div>
      <div class="tile">
        <span class="k">رقم الهاتف النزيل </span>
        <span class="v">${phone}</span>
      </div>
      <div class="tile">
        <span class="k">مدة الإقامة (الايام)</span>
        <span class="v">${stay || '—'}</span>
      </div>
      <div class="tile">
        <span class="k">رقم الغرفة</span>
        <span class="v">${room}</span>
      </div>
      <div class="tile">
        <span class="k">الطابق</span>
        <span class="v">${floor}</span>
      </div>
      <div class="tile full">
        <span class="k">نوع الغرفة</span>
        <span class="v">${roomType}</span>
      </div>
    </section>
    <section class="finance">
      <div class="finance-head">ملخص مالي (${this.hotelCurrency.symbol()})</div>
      <div class="finance-rows">
        <div>
          <div class="fk">اجمالي المبلغ الذي يجب دفعة</div>
          <div class="fv">${total}</div>
        </div>
        <div>
          <div class="fk">اجمالي المبلغ المدفوع</div>
          <div class="fv">${pay}</div>
        </div>
        <div>
          <div class="fk"> المتبقي عليكم دفعة</div>
          <div class="fv">${rem}</div>
        </div>
      </div>
    </section>
    <footer class="footer">تُطبع هذه الوثيقة في ${printedAt}</footer>
  </div>
</body>
</html>`;

    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 200);
  }

  private loadHotelBranding(): HotelBrandingView {
    const fallback: HotelBrandingView = {
      name: 'فندق مضياف العرب',
      phone: '',
      landline: '',
      mobile: '',
      address: '',
      email: '',
      imageSrc: this.defaultHotelImageDataUrl,
    };
    const view = this.hotelBranding.brandingView();
    return {
      name: view.name || fallback.name,
      landline: view.landline,
      mobile: view.mobile,
      phone: view.phone,
      address: view.address,
      email: view.email,
      imageSrc:
        view.imageSrc && view.imageSrc.startsWith('data:image/') ? view.imageSrc : fallback.imageSrc,
    };
  }

  private formatHotelPhonesForPrint(brand: HotelBrandingView): string {
    const parts: string[] = [];
    if (brand.landline) {
      parts.push(`ثابت: ${brand.landline}`);
    }
    if (brand.mobile) {
      parts.push(`جوال: ${brand.mobile}`);
    }
    if (parts.length) {
      return parts.join(' · ');
    }
    return brand.phone || '—';
  }

  private buildCancellationTileHtml(
    booking: Booking,
    esc: (v: string | number | undefined | null) => string
  ): string {
    const moment = this.getCancellationMomentForPrint(booking);
    if (moment == null) {
      return '';
    }
    return `<div class="tile full">
        <span class="k">وقت إلغاء الحجز</span>
        <span class="v">${esc(moment)}</span>
      </div>`;
  }

  private getCancellationMomentForPrint(booking: Booking): string | null {
    const st = (booking.status || '').toLowerCase().trim();
    if (st !== 'cancelled') {
      return null;
    }
    const raw = booking.lastModificationTime;
    if (!raw) {
      return null;
    }
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      return null;
    }
    try {
      return d.toLocaleString('ar-SA', { dateStyle: 'long', timeStyle: 'short' });
    } catch {
      return null;
    }
  }

  private formatBookingMomentForPrint(booking: Booking): string {
    const ts = this.bookingTimestamp(booking);
    if (ts && !isNaN(ts.getTime())) {
      try {
        return ts.toLocaleString('ar-SA', { dateStyle: 'long', timeStyle: 'short' });
      } catch {
        /* fall through */
      }
    }
    const ds = booking.booking_Date ? toDateOnlyString(booking.booking_Date) : '';
    const t = (booking.booking_Time || '').trim();
    if (!ds && !t) {
      return '—';
    }
    const datePart = ds || '—';
    const timePart = t || '—';
    return `${datePart} · ${timePart}`;
  }

  private guestsLineForPrint(booking: Booking): string {
    const total = booking.people_Count;
    const adults = booking.adults_Count;
    const children = booking.children_Count;
    const parts: string[] = [];
    if (total != null && total > 0) {
      parts.push(`الإجمالي: ${total}`);
    }
    if (adults != null && adults > 0) {
      parts.push(`بالغون: ${adults}`);
    }
    if (children != null && children > 0) {
      parts.push(`أطفال: ${children}`);
    }
    if (parts.length) {
      return parts.join(' — ');
    }
    if (total === 0) {
      return '0';
    }
    return '—';
  }

  private bookingTimestamp(booking: Booking): Date | null {
    if (booking.bookingDateTime != null && String(booking.bookingDateTime).trim() !== '') {
      const dly = booking.bookingDateTime as unknown;
      const d = dly instanceof Date ? dly : new Date(String(dly));
      return isNaN(d.getTime()) ? null : d;
    }
    const dateStr = toDateOnlyString(booking.booking_Date);
    if (!dateStr) {
      return null;
    }
    const timePart = (booking.booking_Time || '12:00').trim();
    const isoLocal = `${dateStr}T${timePart.length === 5 ? timePart + ':00' : timePart}`;
    const d = new Date(isoLocal);
    return isNaN(d.getTime()) ? null : d;
  }

  private normalizeSearch(value: string): string {
    return value.trim().toLowerCase();
  }

  get totalRooms(): number {
    return this.rooms.length;
  }

  get availableRooms(): number {
    return this.rooms.filter((room) => room.status === 'available').length;
  }

  get occupiedRooms(): number {
    return this.rooms.filter((room) => room.status === 'occupied').length;
  }

  get dirtyRooms(): number {
    return this.rooms.filter((room) => room.status === 'dirty').length;
  }

  get maintenanceRooms(): number {
    return this.rooms.filter((room) => room.status === 'maintenance').length;
  }

  get totalBookings(): number {
    return this.reportBookings.length;
  }

  get activeBookings(): number {
    return this.filteredBookings.filter((booking) => booking.status === 'active' || !booking.status).length;
  }

  get checkedOutBookings(): number {
    return this.filteredBookings.filter((booking) => booking.status === 'checked_out').length;
  }

  get cancelledBookings(): number {
    return this.filteredBookings.filter((booking) => booking.status === 'cancelled').length;
  }

  get noShowBookings(): number {
    return this.filteredBookings.filter((booking) => booking.status === 'no_show').length;
  }

  get totalRevenue(): number {
    return sumBookingMoney(this.filteredBookings, 'payment_Amount');
  }

  get totalRemaining(): number {
    return sumBookingMoney(this.filteredBookings, 'remaining_Amount');
  }

  get roomOccupancyRate(): number {
    if (!this.totalRooms) {
      return 0;
    }

    return Math.round((this.occupiedRooms / this.totalRooms) * 100);
  }

  get today(): string {
    return new Date().toLocaleDateString('ar');
  }

  clearFilters(): void {
    this.fromDate = '';
    this.toDate = '';
  }

  printReport(): void {
    window.print();
  }
}
