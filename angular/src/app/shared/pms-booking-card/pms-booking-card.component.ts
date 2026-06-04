import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { Booking } from '../../models/booking.model';
import { HotelBrandingStoreService } from '../../services/hotel-branding-store.service';
import { HotelCurrencyService } from '../../services/hotel-currency.service';
import { UiTranslationsService } from '../../services/ui-translations.service';
import { UiMessageService } from '../../services/ui-message.service';
import { bookingCurrencySymbol } from '../../utils/booking-currency';
import {
  bookingCheckInYmd,
  bookingCheckOutYmd,
  formatPmsMoney as formatPmsMoneyUtil,
  formatSlashDate,
  guestInitial,
  isBookingReserved,
  pmsCardCountdownLabelKey,
  pmsCardCountdownText,
} from '../../utils/booking-display.util';
import { bookingConfirmMeta } from '../../utils/booking-meta.options';

@Component({
  selector: 'app-pms-booking-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pms-booking-card.component.html',
  styleUrls: ['../../booking-list/booking-list.component.css'],
})
export class PmsBookingCardComponent {
  readonly ui = inject(UiTranslationsService);
  private readonly uiMsg = inject(UiMessageService);
  private readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly hotelBranding = inject(HotelBrandingStoreService);

  @Input({ required: true }) booking!: Booking;
  @Input() orderIndex = 0;
  @Input() showRenew = false;
  /** إخفاء أزرار الطباعة والتفاصيل في تذييل البطاقة */
  @Input() hideFooterActions = false;
  /** بطاقة بحجم ثابت (واجهة بطاقات الحجز) */
  @Input() uniformCardSize = false;
  /** القادمون: تسكين | المقيمون/المغادرون: قائمة إجراءات | غير ذلك: عرض التفاصيل */
  @Input() primaryAction: 'details' | 'checkIn' | 'stayingMenu' | 'arrivingMenu' | 'departing' | 'departingMenu' = 'details';

  @Output() viewDetails = new EventEmitter<Booking>();
  @Output() checkIn = new EventEmitter<Booking>();
  @Output() transferRoom = new EventEmitter<Booking>();
  @Output() extendStay = new EventEmitter<Booking>();
  @Output() departGuest = new EventEmitter<Booking>();
  @Output() cancelCheckIn = new EventEmitter<Booking>();
  @Output() cancelReservation = new EventEmitter<Booking>();
  @Output() markNoShow = new EventEmitter<Booking>();
  @Output() payFromAccount = new EventEmitter<Booking>();
  @Output() renew = new EventEmitter<Booking>();

  actionsMenuOpen = false;

  checkInYmd = bookingCheckInYmd;
  checkOutYmd = bookingCheckOutYmd;
  formatSlashDate = formatSlashDate;
  guestInitial = guestInitial;
  formatPmsMoney(amount: number | undefined | null): string {
    return formatPmsMoneyUtil(amount, this.ui.displayLocale());
  }

  bookingCurrencySymbol(b: Booking): string {
    return bookingCurrencySymbol(b, this.hotelCurrency);
  }

  get isCheckInAction(): boolean {
    return this.primaryAction === 'checkIn';
  }

  get isStayingMenu(): boolean {
    return this.primaryAction === 'stayingMenu';
  }

  get isDepartingAction(): boolean {
    return this.primaryAction === 'departing' || this.primaryAction === 'departingMenu';
  }

  get isDepartingMenu(): boolean {
    return this.primaryAction === 'departingMenu';
  }

  get isArrivingMenu(): boolean {
    return this.primaryAction === 'arrivingMenu';
  }

  get usesActionsMenu(): boolean {
    return this.isStayingMenu || this.isArrivingMenu || this.isDepartingMenu;
  }

  get canPayFromAccount(): boolean {
    return (Number(this.booking.remaining_Amount) || 0) > 0;
  }

  /** شريط علوي: أخضر عند متبقي | أزرق لحجز مسبق — سجلات الحجز والقادمون فقط */
  get isReservedCard(): boolean {
    return isBookingReserved(this.booking);
  }

  get showBookingTypeRow(): boolean {
    return this.isReservedCard && this.cardCountdownLabelKey === 'pmsBookingType';
  }

  get isBookingConfirmed(): boolean {
    return bookingConfirmMeta(this.booking).value;
  }

  get bookingTypeIcon(): string {
    return bookingConfirmMeta(this.booking).icon;
  }

  bookingTypeLabel(): string {
    const key = bookingConfirmMeta(this.booking).labelKey;
    return this.ui.screenText('booking', key);
  }

  get cardCountdownLabelKey(): ReturnType<typeof pmsCardCountdownLabelKey> {
    return pmsCardCountdownLabelKey(this.booking);
  }

  get cardCountdownText(): string {
    return pmsCardCountdownText(this.booking);
  }

  infoRowDateYmd(booking: Booking): string {
    return this.isReservedCard ? bookingCheckInYmd(booking) : bookingCheckOutYmd(booking);
  }

  get cardTopAccent(): 'reserved' | 'balance' | null {
    if (!this.isArrivingMenu) {
      return null;
    }
    if ((Number(this.booking.remaining_Amount) || 0) > 0) {
      return 'balance';
    }
    if (isBookingReserved(this.booking)) {
      return 'reserved';
    }
    return null;
  }

  toggleActionsMenu(event: Event): void {
    event.stopPropagation();
    if (this.usesActionsMenu) {
      this.actionsMenuOpen = !this.actionsMenuOpen;
      return;
    }
    this.onPrimaryAction();
  }

  closeActionsMenu(): void {
    this.actionsMenuOpen = false;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeActionsMenu();
  }

  onMenuAction(
    action:
      | 'checkIn'
      | 'transfer'
      | 'extend'
      | 'depart'
      | 'cancelCheckIn'
      | 'cancelReservation'
      | 'noShow'
      | 'print'
      | 'payFromAccount',
  ): void {
    this.closeActionsMenu();
    switch (action) {
      case 'checkIn':
        this.checkIn.emit(this.booking);
        break;
      case 'transfer':
        this.transferRoom.emit(this.booking);
        break;
      case 'extend':
        this.extendStay.emit(this.booking);
        break;
      case 'depart':
        this.departGuest.emit(this.booking);
        break;
      case 'cancelCheckIn':
        this.cancelCheckIn.emit(this.booking);
        break;
      case 'cancelReservation':
        this.cancelReservation.emit(this.booking);
        break;
      case 'noShow':
        this.markNoShow.emit(this.booking);
        break;
      case 'print':
        this.printBookingCard();
        break;
      case 'payFromAccount':
        if (this.canPayFromAccount) {
          this.payFromAccount.emit(this.booking);
        }
        break;
    }
  }

  onPrimaryAction(): void {
    if (this.isCheckInAction) {
      this.checkIn.emit(this.booking);
      return;
    }
    this.viewDetails.emit(this.booking);
  }

  onViewDetails(): void {
    this.onPrimaryAction();
  }

  onCheckIn(): void {
    this.checkIn.emit(this.booking);
  }

  onRenew(): void {
    this.renew.emit(this.booking);
  }

  printBookingCard(): void {
    const booking = this.booking;
    const w = window.open('', '_blank');
    if (!w) {
      this.uiMsg.warning('يرجى السماح بالنوافذ المنبثقة للطباعة.');
      return;
    }
    const esc = (v: string | number | undefined | null) =>
      String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const view = this.hotelBranding.brandingView();
    const hotel = {
      name: view.name,
      address: view.address,
      landline: view.landline,
      mobile: view.mobile,
      email: view.email,
      imageDataUrl:
        view.imageSrc && view.imageSrc.startsWith('data:image/') ? view.imageSrc : '',
    };
    const sym = esc(this.bookingCurrencySymbol(booking));
    const name = esc(`${booking.first_Name || ''} ${booking.last_Name || ''}`.trim() || '—');
    const phone = esc(booking.phone_Number || '—');
    const idLine = esc(`${booking.id_Type || '—'} — ${booking.id_Number || '—'}`);
    const inv = esc(booking.invoice_Number || '—');
    const room = esc(booking.room_Number || '—');
    const roomType = esc(booking.room_Type || '—');
    const ci = esc(this.formatSlashDate(this.checkInYmd(booking)));
    const co = esc(this.formatSlashDate(this.checkOutYmd(booking)));
    const nights = esc(booking.stay_Days ?? '—');
    const bookTime = esc(this.formatTime12h(booking.booking_Time));
    const adults = esc(booking.adults_Count ?? '—');
    const children = esc(booking.children_Count ?? '—');
    const loc = this.ui.displayLocale();
    const total = esc(formatPmsMoneyUtil(booking.total_Price, loc));
    const paid = esc(formatPmsMoneyUtil(booking.payment_Amount, loc));
    const bal = esc(formatPmsMoneyUtil(booking.remaining_Amount, loc));
    const hotelName = esc(hotel.name);
    const hotelAddr = esc(hotel.address || '—');
    const hotelTel = esc([hotel.landline, hotel.mobile].filter(Boolean).join(' · ') || '—');
    const hotelEmail = esc(hotel.email || '—');
    const logoBlock = hotel.imageDataUrl
      ? `<img class="hotel-logo" src="${hotel.imageDataUrl}" alt="" />`
      : `<div class="hotel-logo-fallback">${hotelName.charAt(0) || 'ف'}</div>`;
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>حجز ${inv}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:'Cairo','Segoe UI',Tahoma,sans-serif;padding:28px;color:#1a2b42;max-width:720px;margin:0 auto}
        .sheet{border:1px solid #1565c0;border-radius:16px;overflow:hidden}
        .hotel-head{display:flex;gap:20px;align-items:center;padding:20px 22px;background:linear-gradient(135deg,#1565c0,#42a5f5);color:#fff}
        .hotel-logo{width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.5)}
        .hotel-logo-fallback{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.2);font-size:2rem;font-weight:700}
        .hotel-meta h1{margin:0 0 8px;font-size:1.35rem}
        .hotel-meta p{margin:4px 0;font-size:.9rem;opacity:.95}
        .section{padding:18px 22px;border-top:1px solid #e3f2fd}
        .section h2{margin:0 0 12px;font-size:1rem;color:#1565c0}
        table{border-collapse:collapse;width:100%;font-size:.92rem}
        td,th{padding:8px 10px;border:1px solid #dbeafe;text-align:right}
        th{background:#f4f8fd;color:#1565c0;font-weight:600;width:38%}
        .foot{padding:12px 22px;font-size:.8rem;color:#5a6f88;text-align:center;background:#f4f8fd}
      </style></head><body>
      <div class="sheet">
        <header class="hotel-head">
          ${logoBlock}
          <div class="hotel-meta">
            <h1>${hotelName}</h1>
            <p>${hotelAddr}</p>
            <p>هاتف: ${hotelTel}</p>
            ${hotel.email ? `<p>بريد: ${hotelEmail}</p>` : ''}
          </div>
        </header>
        <section class="section">
          <h2>بيانات النزيل</h2>
          <table>
            <tr><th>الاسم</th><td>${name}</td></tr>
            <tr><th>الهاتف</th><td>${phone}</td></tr>
            <tr><th>الهوية</th><td>${idLine}</td></tr>
            <tr><th>رقم الفاتورة</th><td>${inv}</td></tr>
          </table>
        </section>
        <section class="section">
          <h2>تفاصيل الإقامة</h2>
          <table>
            <tr><th>الغرفة</th><td>${room} (${roomType})</td></tr>
            <tr><th>من · إلى</th><td>${ci} → ${co}</td></tr>
            <tr><th>الليالي</th><td>${nights}</td></tr>
            <tr><th>وقت الحجز</th><td>${bookTime}</td></tr>
            <tr><th>ع/الاشخاص</th><td>${adults} بالغ · ${children} طفل</td></tr>
          </table>
        </section>
        <section class="section">
          <h2>المالية</h2>
          <table>
            <tr><th>الإجمالي</th><td>${total} ${sym}</td></tr>
            <tr><th>المدفوع</th><td>${paid} ${sym}</td></tr>
            <tr><th>المتبقي</th><td>${bal} ${sym}</td></tr>
          </table>
        </section>
        <p class="foot">طُبع ${esc(new Date().toLocaleString('ar-SA'))}</p>
      </div>
      </body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 200);
  }

  formatTime12h(time?: string): string {
    if (!time) {
      return '--:--';
    }
    try {
      const parts = time.split(':');
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const period = hours >= 12 ? 'م' : 'ص';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${period}`;
    } catch {
      return time;
    }
  }
}
