import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { forkJoin, fromEvent } from 'rxjs';
import { BookingService } from '../services/booking.service';
import { Booking } from '../models/booking.model';
import { Room } from '../models/room.model';
import { RoomService } from '../services/room.service';
import { DASHBOARD_VIEW_MODE_STORAGE_KEY, DASHBOARD_VIEW_MODE_CHANGED_EVENT } from '../utils/dev-outlines';
import { UiTranslationsService } from '../services/ui-translations.service';
import { HotelBrandingStoreService } from '../services/hotel-branding-store.service';
import { HotelSystemSettingsLoader } from '../services/hotel-system-settings.loader';
import { HotelCurrencyService, HOTEL_CURRENCY_UPDATED_EVENT } from '../services/hotel-currency.service';
import { bindUiTranslationRefresh } from '../utils/ui-screen-i18n.helper';
import { toDateOnlyString } from '../utils/date-only';
import {
  bookingCheckInYmd,
  bookingCheckOutYmd,
  isBookingActive,
  isBookingArriving,
  isBookingCurrentlyStaying,
  isBookingReserved,
  syncBookingOccupancyCounts,
} from '../utils/booking-display.util';
import { LocaleNumberPipe } from '../shared/pipes/locale-number.pipe';

export type DashboardSparkKey =
  | 'total'
  | 'available'
  | 'booked'
  | 'maintenanceDirty'
  | 'staying'
  | 'guests'
  | 'paid'
  | 'remaining';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, LocaleNumberPipe],
})
export class DashboardComponent implements OnInit {
  readonly ui = inject(UiTranslationsService);
  readonly hotelBranding = inject(HotelBrandingStoreService);
  readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly hotelSystemSettings = inject(HotelSystemSettingsLoader);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  viewMode: 'normal' | 'advanced' = 'advanced';
  availableRoomsCount = 0;
  bookingsCount = 0;
  totalRoomsCount = 0;
  bookedRoomsCount = 0;
  stayingRoomsCount = 0;
  maintenanceRoomsCount = 0;
  dirtyRoomsCount = 0;
  suspendedRoomsCount = 0;
  activeBookingsCount = 0;
  stayingAdultsCount = 0;
  stayingChildrenCount = 0;
  guestsCount = 0;
  totalRevenue = 0;
  remainingAmount = 0;
  occupancyRate = 0;
  loading = true;
  error = '';
  hotelName = '';

  sparklines: Record<DashboardSparkKey, number[]> = {
    total: [],
    available: [],
    booked: [],
    maintenanceDirty: [],
    staying: [],
    guests: [],
    paid: [],
    remaining: [],
  };

  constructor(
    private roomService: RoomService,
    private bookingService: BookingService,
  ) {}

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    fromEvent(window, HOTEL_CURRENCY_UPDATED_EVENT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.hotelCurrency.reloadFromStorage();
        this.cdr.markForCheck();
      });
    fromEvent(window, 'hotelSettingsUpdated')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadHotelInfo();
        this.cdr.markForCheck();
      });
    this.loadSavedViewMode();
    this.loadHotelInfo();
    this.loadDashboardStats();
  }

  sparkPolyline(values: number[], width = 120, height = 36): string {
    const pad = 4;
    const series = values.length ? values : [0];
    const innerW = width - pad * 2;
    const innerH = height - pad * 2;
    const max = Math.max(...series, 1);
    const min = Math.min(...series, 0);
    const span = max - min || 1;
    return series
      .map((v, i) => {
        const x =
          pad + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
        const y = pad + innerH - ((v - min) / span) * innerH;
        return `${x},${y}`;
      })
      .join(' ');
  }

  pctOf(value: number, total: number): number {
    const v = Number(value) || 0;
    const t = Number(total) || 0;
    if (t <= 0) return 0;
    const p = (v / t) * 100;
    if (!Number.isFinite(p)) return 0;
    return Math.max(0, Math.min(100, Math.round(p)));
  }

  pctOfSpark(key: DashboardSparkKey, current: number): number {
    const series = this.sparklines[key] ?? [];
    const max = series.length ? Math.max(...series) : 0;
    if (max <= 0) return 0;
    const p = (Number(current) || 0) / max * 100;
    if (!Number.isFinite(p)) return 0;
    return Math.max(0, Math.min(100, Math.round(p)));
  }

  get pctTotalRooms(): number {
    return this.totalRoomsCount > 0 ? 100 : 0;
  }
  get pctAvailableRooms(): number {
    return this.pctOf(this.availableRoomsCount, this.totalRoomsCount);
  }
  get pctBookedRooms(): number {
    return this.pctOf(this.bookedRoomsCount, this.totalRoomsCount);
  }
  get pctMaintenanceDirtyRooms(): number {
    return this.pctOf(this.maintenanceRoomsCount + this.dirtyRoomsCount, this.totalRoomsCount);
  }
  get pctStayingRooms(): number {
    return this.pctOf(this.stayingRoomsCount, this.totalRoomsCount);
  }
  get pctGuests(): number {
    return this.pctOfSpark('guests', this.guestsCount);
  }
  get pctPaid(): number {
    // مفهومه أوضح من المقارنة بالأقصى: المدفوع من إجمالي (مدفوع + متبقّي)
    return this.pctOf(this.totalRevenue, this.totalRevenue + this.remainingAmount);
  }
  get pctRemaining(): number {
    return this.pctOf(this.remainingAmount, this.totalRevenue + this.remainingAmount);
  }

  /** عند فتح لوحة التحكم يُفعَّل العرض المطور (إحصائيات كاملة) تلقائياً */
  private loadSavedViewMode(): void {
    this.viewMode = 'advanced';
    try {
      localStorage.setItem(DASHBOARD_VIEW_MODE_STORAGE_KEY, 'advanced');
      window.dispatchEvent(new Event(DASHBOARD_VIEW_MODE_CHANGED_EVENT));
    } catch {
      /* ignore */
    }
  }

  private loadHotelInfo(): void {
    this.hotelSystemSettings.load().subscribe({
      next: () => {
        this.hotelName =
          this.hotelBranding.displayName() ||
          this.ui.screenText('settings', 'loginTitle') ||
          'نظام إدارة الفندق';
        this.cdr.markForCheck();
      },
    });
  }

  private loadDashboardStats(): void {
    this.loading = true;
    forkJoin({
      rooms: this.roomService.getRooms(),
      bookings: this.bookingService.getBookings(),
    }).subscribe({
      next: ({ rooms, bookings }) => {
        this.updateStats(rooms, bookings);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const timedOut =
          err?.name === 'TimeoutError' || err?.message?.includes?.('Timeout');
        this.error = timedOut
          ? 'انتهت مهلة الاتصال بالخادم. شغّل المشروع الخلفي (API) ثم حدّث الصفحة.'
          : this.ui.screenText('dashboard', 'statsLoadError');
        console.error(err);
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  setViewMode(mode: 'normal' | 'advanced'): void {
    this.viewMode = mode;
    localStorage.setItem(DASHBOARD_VIEW_MODE_STORAGE_KEY, mode);
    try {
      window.dispatchEvent(new Event(DASHBOARD_VIEW_MODE_CHANGED_EVENT));
    } catch {
      /* ignore */
    }
  }

  private updateStats(rooms: Room[], bookings: Booking[]): void {
    this.totalRoomsCount = rooms.length;
    this.availableRoomsCount = rooms.filter((r) => r.status === 'available').length;
    this.maintenanceRoomsCount = rooms.filter((r) => r.status === 'maintenance').length;
    this.dirtyRoomsCount = rooms.filter((r) => r.status === 'dirty').length;
    this.suspendedRoomsCount = rooms.filter((r) => r.status === 'suspended').length;
    this.bookingsCount = bookings.length;

    const activeBookings = bookings.filter((b) => isBookingActive(b));
    this.activeBookingsCount = activeBookings.length;
    this.totalRevenue = bookings.reduce(
      (total, booking) => total + (Number(booking.payment_Amount) || 0),
      0,
    );
    this.remainingAmount = bookings.reduce(
      (total, booking) => total + (Number(booking.remaining_Amount) || 0),
      0,
    );

    const bookedRooms = new Set<string>();
    const stayingRooms = new Set<string>();
    let stayingAdults = 0;
    let stayingChildren = 0;

    for (const b of activeBookings) {
      const roomNum = String(b.room_Number ?? '').trim();
      const isBookedRecord =
        isBookingReserved(b) || (isBookingArriving(b) && !isBookingCurrentlyStaying(b));
      if (isBookedRecord && roomNum) {
        bookedRooms.add(roomNum);
      }
      if (isBookingCurrentlyStaying(b)) {
        if (roomNum) {
          stayingRooms.add(roomNum);
        }
        const counts = syncBookingOccupancyCounts({
          people_Count: b.people_Count,
          adults_Count: b.adults_Count,
          children_Count: b.children_Count,
        });
        stayingAdults += counts.adults_Count;
        stayingChildren += counts.children_Count;
      }
    }

    this.bookedRoomsCount = bookedRooms.size;
    this.stayingRoomsCount = stayingRooms.size;
    this.stayingAdultsCount = stayingAdults;
    this.stayingChildrenCount = stayingChildren;
    this.guestsCount = stayingAdults + stayingChildren;

    this.occupancyRate =
      this.totalRoomsCount > 0
        ? Math.round((this.bookedRoomsCount / this.totalRoomsCount) * 100)
        : 0;

    this.sparklines = this.buildSparklines(bookings, rooms.length);
  }

  private buildSparklines(bookings: Booking[], totalRooms: number): Record<DashboardSparkKey, number[]> {
    const days = this.last7LocalDays();
    const maintenanceDirtyToday = this.maintenanceRoomsCount + this.dirtyRoomsCount;

    const bookedPerDay: number[] = [];
    const stayingPerDay: number[] = [];
    const guestsPerDay: number[] = [];
    const paidPerDay: number[] = [];
    const remainingPerDay: number[] = [];

    for (const day of days) {
      const bookedRooms = new Set<string>();
      const stayingRooms = new Set<string>();
      let adults = 0;
      let children = 0;
      let paid = 0;
      let remaining = 0;

      for (const b of bookings) {
        if (b.status === 'cancelled') {
          continue;
        }
        const roomNum = String(b.room_Number ?? '').trim();
        if (roomNum && this.isBookedRoomOnDay(b, day)) {
          bookedRooms.add(roomNum);
        }
        if (this.bookingStayingOnDay(b, day)) {
          if (roomNum) {
            stayingRooms.add(roomNum);
          }
          const counts = syncBookingOccupancyCounts({
            people_Count: b.people_Count,
            adults_Count: b.adults_Count,
            children_Count: b.children_Count,
          });
          adults += counts.adults_Count;
          children += counts.children_Count;
        }
        const bookingDay = toDateOnlyString(b.booking_Date);
        if (bookingDay === day) {
          paid += Number(b.payment_Amount) || 0;
          remaining += Number(b.remaining_Amount) || 0;
        }
      }

      bookedPerDay.push(bookedRooms.size);
      stayingPerDay.push(stayingRooms.size);
      guestsPerDay.push(adults + children);
      paidPerDay.push(paid);
      remainingPerDay.push(remaining);
    }

    const flat = (value: number) => Array(7).fill(value);

    return {
      total: flat(totalRooms),
      available: flat(this.availableRoomsCount),
      booked: bookedPerDay,
      maintenanceDirty: flat(maintenanceDirtyToday),
      staying: stayingPerDay,
      guests: guestsPerDay,
      paid: paidPerDay,
      remaining: remainingPerDay,
    };
  }

  private last7LocalDays(): string[] {
    const out: string[] = [];
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      out.push(toDateOnlyString(d));
    }
    return out;
  }

  private bookingCoversDay(booking: Booking, day: string): boolean {
    const ci = bookingCheckInYmd(booking);
    const co = bookingCheckOutYmd(booking);
    if (!ci || !co) {
      return false;
    }
    return ci <= day && day < co;
  }

  private bookingStayingOnDay(booking: Booking, day: string): boolean {
    if (booking.status === 'cancelled' || booking.status === 'checked_out') {
      return false;
    }
    if (isBookingReserved(booking)) {
      return false;
    }
    return this.bookingCoversDay(booking, day);
  }

  /** غرفة محجوزة (حجز) في يوم معيّن — قبل التسكين */
  private isBookedRoomOnDay(booking: Booking, day: string): boolean {
    if (booking.status === 'cancelled' || booking.status === 'checked_out') {
      return false;
    }
    const ci = bookingCheckInYmd(booking);
    const co = bookingCheckOutYmd(booking);
    if (!ci || !co || day >= co) {
      return false;
    }
    if (isBookingReserved(booking)) {
      return true;
    }
    return day < ci;
  }
}
