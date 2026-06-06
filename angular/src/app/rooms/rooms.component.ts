import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, fromEvent, merge, of, Subscription } from 'rxjs';
import { catchError, filter, throttleTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Booking } from '../models/booking.model';
import { Room } from '../models/room.model';
import { RoomService } from '../services/room.service';
import { BookingService } from '../services/booking.service';
import {
  DASHBOARD_VIEW_MODE_CHANGED_EVENT,
  DASHBOARD_VIEW_MODE_STORAGE_KEY,
  readDashboardAdvancedEnabled,
} from '../utils/dev-outlines';
import { todayLocalDateString, toDateOnlyString } from '../utils/date-only';
import {
  bookingCheckInYmd,
  bookingCheckOutYmd,
  guestFullName,
  isBookingDepartingWithinWindow,
  isBookingCurrentlyStaying,
  stayingBookingRoomNumbers,
} from '../utils/booking-display.util';
import { RoomPreviewSheetComponent } from '../shared/room-preview-sheet/room-preview-sheet.component';
import { UiTranslationsService } from '../services/ui-translations.service';
import { HotelCurrencyService } from '../services/hotel-currency.service';
import { bindUiTranslationRefresh } from '../utils/ui-screen-i18n.helper';
import { UiMessageService } from '../services/ui-message.service';
import { roomCurrencySymbol } from '../utils/room-currency';
import {
  buildRoomTransferLookup,
  readRecentRoomTransfers,
  ROOM_TRANSFERS_CHANGED_EVENT,
  type RecentRoomTransfer,
  type RoomTransferHint,
} from '../utils/room-transfer-display.util';
import {
  readBookingPickRoomReturnUrl,
  setPickedRoom,
} from '../utils/booking-room-pick.util';
import {
  ROOM_CLEANING_DURATION_MS,
  clearRoomCleaningReadyAt,
  cleaningRemainingMs,
  formatCleaningReadyClock,
  formatCleaningRemainingClock,
  getRoomCleaningReadyAt,
  setRoomCleaningReadyAt,
} from '../utils/room-cleaning.util';
import { parseRoomFeatures } from '../utils/room-features.util';

export interface RoomsDevSummaryTile {
  key: string;
  labelKey: string;
  icon: string;
  tone:
    | 'neutral'
    | 'blue'
    | 'amber'
    | 'purple'
    | 'rose'
    | 'green'
    | 'slate'
    | 'soil'
    | 'booked'
    | 'occ'
    | 'depart'
    | 'maint'
    | 'halt'
    | 'bkdirty'
    | 'checkout'
    | 'xfer';
  count: number;
}

export interface RoomTransferDisplayRow {
  transfer: RecentRoomTransfer;
  fromRoom?: Room;
  toRoom?: Room;
}

/** مشهد لون البطاقة من حالة الغرفة + سياق الحجز */
type RoomVisualScene =
  | 'avail'
  | 'dirty_vacant'
  | 'dirty_guest'
  | 'cleaning'
  | 'occ'
  | 'occ_clean'
  | 'occ_depart'
  | 'xfer_out'
  | 'xfer_in'
  | 'maint'
  | 'halt';

@Component({
  selector: 'app-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RoomPreviewSheetComponent],
})
export class RoomsComponent implements OnInit, AfterViewInit {
  readonly ui = inject(UiTranslationsService);
  private readonly uiMsg = inject(UiMessageService);
  private readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly route = inject(ActivatedRoute);

  /** اختيار غرفة من نموذج الحجز ثم العودة */
  pickRoomMode = false;
  cardMenuRoomId: number | null = null;
  private cleaningTickTimer: ReturnType<typeof setInterval> | null = null;
  /** آخر نص مؤقت معروض لكل غرفة — يحدّث الواجهة فقط عند تغيّره */
  private readonly cleaningDisplayByRoomId = new Map<number, string>();

  rooms: Room[] = [];
  allBookings: Booking[] = [];
  /** حجوز نشطة (أو بلا حالة) بمغادرة اليوم — حسب `bookingCheckOutYmd` */
  private bookingDepartTodayRoomNums = new Set<string>();
  /** حجوز مقيمة حالياً (اليوم ضمن فترة الإقامة) */
  private bookingStayingRoomNums = new Set<string>();
  /** آخر نقل غرفة — للعرض «من → إلى» على بطاقة الغرفة */
  private roomTransferLookup = new Map<string, RoomTransferHint>();
  /** قائمة عمليات النقل الأخيرة */
  recentRoomTransfers: RecentRoomTransfer[] = [];
  selectedStatus = '';
  isLoading = true;
  error = '';

  roomPreview: Room | null = null;

  /** يتبع «العرض المطوّر» في لوحة التحكم (localStorage: dashboardViewMode = advanced) */
  roomsAdvancedLayout = false;

  /** شريط أدوات العرض المطوّر */
  devDataScope: 'all' | 'floor' = 'all';
  devRoomType = '';
  devFilterFloor = '';
  devFilterFeature = '';
  devFilterPrice = '';
  devArrivingOnly = false;
  devPaymentDueOnly = false;
  devSearch = '';
  /** حجم البطاقات 70–130% */
  devLayoutScale = 80;

  /** لوحة حالات الغرف الجانبية (قابلة للطي) */
  statusRailOpen = true;

  /** شريط التصفية (طابق / نوع / الواصل / المتبقي / بحث) — ثابت أعلى المحتوى، قابل للطي */
  filterToolbarOpen = true;

  private readonly statusRailStorageKey = 'hotelRoomsDevStatusRailOpen';

  private readonly filterToolbarStorageKey = 'hotelRoomsDevFilterToolbarOpen';

  /** استماع التمرير لإغلاق شريط التصفية (عدة حاويات لأن scroll لا ي bur) */
  private filterToolbarScrollSub: Subscription | null = null;

  constructor(
    private roomService: RoomService,
    private bookingService: BookingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    this.destroyRef.onDestroy(() => {
      this.filterToolbarScrollSub?.unsubscribe();
      this.filterToolbarScrollSub = null;
    });
    this.pickRoomMode = this.route.snapshot.queryParamMap.get('pickRoom') === '1';
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => {
        this.pickRoomMode = p.get('pickRoom') === '1';
        this.syncRoomsAdvancedLayout();
        this.cdr.markForCheck();
      });
    this.restoreStatusRailPreference();
    this.restoreFilterToolbarPreference();
    this.wireAdvancedLayoutSync();
    this.wireRoomTransfersRefresh();
    this.loadRooms();
  }

  private wireRoomTransfersRefresh(): void {
    fromEvent(window, ROOM_TRANSFERS_CHANGED_EVENT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshRoomTransferLookup();
        this.cdr.markForCheck();
      });
    fromEvent(window, 'focus')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshRoomTransferLookup());
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.wireFilterToolbarScrollCollapse());
  }

  private wireFilterToolbarScrollCollapse(): void {
    if (!this.roomsAdvancedLayout) {
      this.filterToolbarScrollSub?.unsubscribe();
      this.filterToolbarScrollSub = null;
      return;
    }

    this.filterToolbarScrollSub?.unsubscribe();
    this.filterToolbarScrollSub = null;

    const targets = new Set<HTMLElement>();
    const contentEl =
      (this.hostEl.nativeElement.closest('.content-area') as HTMLElement | null) ??
      (document.querySelector('main.content-area') as HTMLElement | null);
    if (contentEl) {
      targets.add(contentEl);
    }
    const mainEl = this.hostEl.nativeElement.querySelector('.rooms-dev-main') as HTMLElement | null;
    if (mainEl) {
      targets.add(mainEl);
    }

    if (targets.size === 0) {
      return;
    }

    this.filterToolbarScrollSub = merge(
      ...[...targets].map((el) => fromEvent(el, 'scroll', { passive: true }))
    )
      .pipe(throttleTime(100))
      .subscribe(() => this.collapseFilterToolbar());
  }

  private restoreFilterToolbarPreference(): void {
    try {
      if (localStorage.getItem(this.filterToolbarStorageKey) === '0') {
        this.filterToolbarOpen = false;
      }
    } catch {
      /* ignore */
    }
  }

  toggleFilterToolbar(): void {
    this.setFilterToolbarOpen(!this.filterToolbarOpen);
  }

  /** يُغلق بعد التمرير أو بعد تغيير خيارات التصفية */
  collapseFilterToolbar(): void {
    this.setFilterToolbarOpen(false);
  }

  private setFilterToolbarOpen(open: boolean): void {
    if (this.filterToolbarOpen === open) {
      return;
    }
    this.filterToolbarOpen = open;
    try {
      localStorage.setItem(this.filterToolbarStorageKey, open ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  private restoreStatusRailPreference(): void {
    try {
      if (localStorage.getItem(this.statusRailStorageKey) === '0') {
        this.statusRailOpen = false;
      }
    } catch {
      /* ignore */
    }
  }

  closeStatusRail(): void {
    this.statusRailOpen = false;
    try {
      localStorage.setItem(this.statusRailStorageKey, '0');
    } catch {
      /* ignore */
    }
  }

  openStatusRail(): void {
    this.statusRailOpen = true;
    try {
      localStorage.setItem(this.statusRailStorageKey, '1');
    } catch {
      /* ignore */
    }
  }

  private wireAdvancedLayoutSync(): void {
    this.syncRoomsAdvancedLayout();
    fromEvent(window, DASHBOARD_VIEW_MODE_CHANGED_EVENT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncRoomsAdvancedLayout());
    fromEvent<StorageEvent>(window, 'storage')
      .pipe(
        filter((e) => e.key === DASHBOARD_VIEW_MODE_STORAGE_KEY || e.key === null),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.syncRoomsAdvancedLayout());
  }

  private syncRoomsAdvancedLayout(): void {
    this.roomsAdvancedLayout = this.pickRoomMode || readDashboardAdvancedEnabled();
    if (!this.roomsAdvancedLayout) {
      this.filterToolbarScrollSub?.unsubscribe();
      this.filterToolbarScrollSub = null;
      return;
    }
    queueMicrotask(() => this.wireFilterToolbarScrollCollapse());
  }

  /** توحيد الحالة من الـ API (camelCase / PascalCase / قيم قريبة) */
  private mapRoomFromApi(raw: Room & Record<string, unknown>): Room {
    const statusRaw = raw.status ?? raw['Status'];
    return {
      ...raw,
      maintenanceReason: (raw.maintenanceReason ?? raw['MaintenanceReason']) as string | null | undefined,
      status: this.normalizeRoomStatus(statusRaw == null ? '' : String(statusRaw)),
    };
  }

  private normalizeRoomStatus(s: string): Room['status'] {
    const v = s.trim().toLowerCase();
    if (v === 'occupied' || v === 'occ') {
      return 'occupied';
    }
    if (
      v === 'suspended' ||
      v === 'stopped' ||
      v === 'blocked' ||
      v === 'paused' ||
      v === 'halt' ||
      v === 'out_of_order' ||
      v === 'out_of_service' ||
      v === 'outofservice'
    ) {
      return 'suspended';
    }
    if (v === 'maintenance' || v === 'maint') {
      return 'maintenance';
    }
    if (v === 'cleaning') {
      return 'cleaning';
    }
    if (v === 'dirty') {
      return 'dirty';
    }
    if (v === 'available' || v === 'avail' || v === 'vacant' || v === 'free') {
      return 'available';
    }
    return 'available';
  }

  loadRooms(): void {
    this.isLoading = true;
    this.error = '';
    forkJoin({
      rooms: this.roomService.getRooms(),
      bookings: this.bookingService.getBookings().pipe(
        catchError((err) => {
          console.error('Error loading bookings for room preview', err);
          return of([] as Booking[]);
        })
      ),
    }).subscribe({
      next: ({ rooms, bookings }) => {
        this.allBookings = bookings;
        this.rooms = rooms.map((r) => this.mapRoomFromApi(r as Room & Record<string, unknown>));
        this.refreshBookingSemanticSets();
        this.refreshRoomTransferLookup();
        this.isLoading = false;
        this.syncCleaningSchedules();
        queueMicrotask(() => this.wireFilterToolbarScrollCollapse());
      },
      error: (err) => {
        console.error('Error loading rooms', err);
        this.error =
          'فشل في تحميل الغرف: ' + (err.message || err.statusText || 'خطأ في الاتصال بالسيرفر');
        this.isLoading = false;
        queueMicrotask(() => this.wireFilterToolbarScrollCollapse());
      },
    });
  }

  private startCleaningTick(): void {
    if (this.cleaningTickTimer != null) {
      return;
    }
    this.cleaningTickTimer = setInterval(() => this.tickCleaningRooms(), 1_000);
    this.destroyRef.onDestroy(() => this.stopCleaningTick());
  }

  private stopCleaningTick(): void {
    if (this.cleaningTickTimer != null) {
      clearInterval(this.cleaningTickTimer);
      this.cleaningTickTimer = null;
    }
  }

  private syncCleaningTickTimer(): void {
    const hasCleaning = this.rooms.some((r) => r.status === 'cleaning');
    if (hasCleaning) {
      this.startCleaningTick();
    } else {
      this.stopCleaningTick();
    }
  }

  private syncCleaningSchedules(): void {
    const now = Date.now();
    for (const room of this.rooms) {
      if (room.status !== 'cleaning' || room.id == null) {
        continue;
      }
      let readyAt = getRoomCleaningReadyAt(room.id);
      if (!readyAt) {
        readyAt = now + ROOM_CLEANING_DURATION_MS;
        setRoomCleaningReadyAt(room.id, readyAt);
      }
      if (now >= readyAt) {
        this.finishRoomCleaning(room, false);
      } else {
        this.updateCleaningDisplayCache(room);
      }
    }
    this.syncCleaningTickTimer();
    this.cdr.markForCheck();
  }

  private updateCleaningDisplayCache(room: Room): boolean {
    if (room.id == null) {
      return false;
    }
    const readyAt = getRoomCleaningReadyAt(room.id);
    const display = formatCleaningRemainingClock(cleaningRemainingMs(readyAt));
    const prev = this.cleaningDisplayByRoomId.get(room.id);
    if (prev === display) {
      return false;
    }
    this.cleaningDisplayByRoomId.set(room.id, display);
    return true;
  }

  private tickCleaningRooms(): void {
    const now = Date.now();
    let needsCheck = false;
    for (const room of this.rooms) {
      if (room.status !== 'cleaning' || room.id == null) {
        continue;
      }
      const readyAt = getRoomCleaningReadyAt(room.id);
      if (readyAt && now >= readyAt) {
        this.finishRoomCleaning(room, false);
        needsCheck = true;
        continue;
      }
      if (this.updateCleaningDisplayCache(room)) {
        needsCheck = true;
      }
    }
    if (needsCheck) {
      this.cdr.markForCheck();
    }
    this.syncCleaningTickTimer();
  }

  /** تنظيف: غرف متسخة، محجوزة (occupied)، أو مشهد إشغال/مغادرة */
  canStartRoomCleaning(room: Room): boolean {
    if (this.isRoomCleaning(room)) {
      return false;
    }
    if (room.status === 'dirty' || room.status === 'occupied') {
      return true;
    }
    const scene = this.roomVisualScene(room);
    if (scene === 'occ_clean') {
      return false;
    }
    return (
      scene === 'occ' ||
      scene === 'occ_depart' ||
      scene === 'dirty_guest' ||
      scene === 'dirty_vacant'
    );
  }

  isReservedCleanRoom(room: Room): boolean {
    return this.roomVisualScene(room) === 'occ_clean';
  }

  isRoomCleaning(room: Room): boolean {
    return room.status === 'cleaning';
  }

  showGuestOnCard(room: Room): boolean {
    return !this.isRoomCleaning(room) && !!this.guestNameForRoom(room);
  }

  getCleaningReadyAt(room: Room): number | null {
    return room.id != null ? getRoomCleaningReadyAt(room.id) : null;
  }

  cleaningReadyClock(room: Room): string {
    const readyAt = this.getCleaningReadyAt(room);
    if (!readyAt) {
      return '';
    }
    return formatCleaningReadyClock(readyAt, this.ui.displayLocale());
  }

  cleaningRemainingDisplay(room: Room): string {
    const readyAt = this.getCleaningReadyAt(room);
    return formatCleaningRemainingClock(cleaningRemainingMs(readyAt));
  }

  /** مؤقت التنظيف للعرض (مخزّن مؤقتاً لتقليل إعادة رسم الصف) */
  roomCleaningClock(room: Room): string {
    if (room.id != null) {
      const cached = this.cleaningDisplayByRoomId.get(room.id);
      if (cached) {
        return cached;
      }
    }
    const display = this.cleaningRemainingDisplay(room);
    if (room.id != null) {
      this.cleaningDisplayByRoomId.set(room.id, display);
    }
    return display;
  }

  trackDevRoomCard(_index: number, room: Room): number | string {
    return room.id ?? room.roomNumber;
  }

  cleaningReadyLine(room: Room): string {
    const time = this.cleaningReadyClock(room);
    if (!time) {
      return '';
    }
    return this.ui.screenText('rooms', 'semanticCleaningReady').replace('{time}', time);
  }

  startRoomCleaning(room: Room, event?: Event): void {
    event?.stopPropagation();
    if (!this.canStartRoomCleaning(room) || room.id == null) {
      return;
    }
    this.cardMenuRoomId = null;
    const readyAt = Date.now() + ROOM_CLEANING_DURATION_MS;
    setRoomCleaningReadyAt(room.id, readyAt);
    const updated: Room = { ...room, status: 'cleaning' };
    this.roomService.updateRoom(room.id, updated, false).subscribe({
      next: () => {
        this.patchRoomInList(updated);
        this.updateCleaningDisplayCache(updated);
        this.syncCleaningTickTimer();
        this.uiMsg.show(this.ui.screenText('rooms', 'cleaningStartedToast'));
        this.cdr.markForCheck();
        window.setTimeout(() => {
          const current = this.rooms.find((r) => r.id === room.id);
          if (current?.status === 'cleaning') {
            this.finishRoomCleaning(current, true);
          }
        }, ROOM_CLEANING_DURATION_MS);
      },
      error: () => this.uiMsg.error(this.ui.screenText('rooms', 'cleaningUpdateError')),
    });
  }

  private finishRoomCleaning(room: Room, notify: boolean): void {
    if (room.id == null || room.status !== 'cleaning') {
      return;
    }
    clearRoomCleaningReadyAt(room.id);
    this.cleaningDisplayByRoomId.delete(room.id);
    const updated: Room = { ...room, status: 'available' };
    this.roomService.updateRoom(room.id, updated, false).subscribe({
      next: () => {
        this.patchRoomInList(updated);
        this.syncCleaningTickTimer();
        if (notify) {
          this.uiMsg.show(this.ui.screenText('rooms', 'cleaningDoneToast'));
        }
        this.cdr.markForCheck();
      },
      error: () => this.uiMsg.error(this.ui.screenText('rooms', 'cleaningUpdateError')),
    });
  }

  private patchRoomInList(updated: Room): void {
    const idx = this.rooms.findIndex((r) => r.id === updated.id);
    if (idx >= 0) {
      this.rooms[idx] = updated;
    }
    if (this.roomPreview?.id === updated.id) {
      this.roomPreview = updated;
    }
  }

  openRoomPreview(room: Room): void {
    this.cardMenuRoomId = null;
    this.roomPreview = room;
  }

  closeRoomPreview(): void {
    this.roomPreview = null;
  }

  @HostListener('document:click', ['$event'])
  closeCardMenu(event: MouseEvent): void {
    if (this.cardMenuRoomId == null) {
      return;
    }
    const target = event.target;
    if (target instanceof Element && target.closest('.rooms-dev-card-menu-wrap')) {
      return;
    }
    this.cardMenuRoomId = null;
    this.cdr.markForCheck();
  }

  toggleCardMenu(event: Event, room: Room): void {
    event.preventDefault();
    event.stopPropagation();
    this.cardMenuRoomId = this.cardMenuRoomId === room.id ? null : room.id ?? null;
    this.cdr.markForCheck();
  }

  isCardMenuOpen(room: Room): boolean {
    return room.id != null && this.cardMenuRoomId === room.id;
  }

  canPickRoomForBooking(room: Room): boolean {
    return room.status === 'available' || room.status === 'dirty';
  }


  onDevCardClick(room: Room): void {
    if (this.pickRoomMode) {
      return;
    }
    this.openRoomPreview(room);
  }

  onDevCardKeyActivate(event: Event, room: Room): void {
    const target = event.target;
    if (target instanceof Element && target.closest('.rooms-dev-card-menu-wrap')) {
      return;
    }
    event.preventDefault();
    this.onDevCardClick(room);
  }

  pickRoomForBooking(room: Room): void {
    if (!this.canPickRoomForBooking(room)) {
      this.uiMsg.show(this.ui.screenText('rooms', 'pickRoomNotAvailable'));
      return;
    }
    if (!String(room.roomNumber ?? '').trim()) {
      return;
    }
    setPickedRoom(room);
    this.cardMenuRoomId = null;
    this.roomPreview = null;
    const returnUrl = readBookingPickRoomReturnUrl();
    void this.router.navigateByUrl(returnUrl);
  }

  cancelPickRoom(): void {
    this.cardMenuRoomId = null;
    this.roomPreview = null;
    void this.router.navigateByUrl(readBookingPickRoomReturnUrl());
  }

  /** حجز النزيل المقيم حالياً في هذه الغرفة */
  getStayingBookingForRoom(room: Room | null): Booking | null {
    if (!room) {
      return null;
    }
    const num = String(room.roomNumber ?? '').trim();
    if (!num) {
      return null;
    }
    const matches = this.allBookings.filter(
      (b) => String(b.room_Number ?? '').trim() === num && isBookingCurrentlyStaying(b),
    );
    if (matches.length === 0) {
      return null;
    }
    matches.sort((a, b) =>
      (bookingCheckInYmd(a) || '').localeCompare(bookingCheckInYmd(b) || ''),
    );
    return matches[matches.length - 1];
  }

  guestNameForRoom(room: Room): string | null {
    const b = this.getStayingBookingForRoom(room);
    const name = guestFullName(b);
    return name || null;
  }

  /** غرف لها مغادرة متوقعة اليوم (حسب سجل الحجز) */
  getRoomsExpectedDepartureToday(): Room[] {
    return this.rooms.filter((r) =>
      this.bookingDepartTodayRoomNums.has(String(r.roomNumber ?? '').trim())
    );
  }

  /** غرف عليها حجز مقيم — مرتبط بتبويب «المقيمون» في سجلات الحجز */
  getRoomsWithStayingBookings(): Room[] {
    return this.rooms.filter((r) =>
      this.bookingStayingRoomNums.has(String(r.roomNumber ?? '').trim())
    );
  }

  /** عدد الغرف المحجوزة وفق الحجوزات النشطة */
  get stayingBookedRoomsCount(): number {
    return this.bookingStayingRoomNums.size;
  }

  /** «محجوز غير نظيف»: غرف بحالة متسخة مع نزيل مقيم وفق الحجوزات */
  getRoomsBookedUnclean(): Room[] {
    return this.rooms.filter(
      (r) => r.status === 'dirty' && this.bookingStayingRoomNums.has(String(r.roomNumber ?? '').trim())
    );
  }

  /** مطابق لتبويب «خروج اليوم»: حالة checked_out حيث يوم المغادرة المجدول = اليوم أو تم تسجيل الخروج اليوم حسب وقت آخر تعديل */
  private isBookingCheckoutCompletedToday(b: Booking): boolean {
    if (b.status !== 'checked_out') {
      return false;
    }
    const today = todayLocalDateString();
    if (bookingCheckOutYmd(b) === today) {
      return true;
    }
    if (b.lastModificationTime) {
      return toDateOnlyString(b.lastModificationTime) === today;
    }
    return false;
  }

  /** عدد الحجوزات التي سُجّل عليها خروج اليوم */
  checkoutRegisteredTodayCount(): number {
    return this.allBookings.filter((b) => this.isBookingCheckoutCompletedToday(b)).length;
  }

  /** الغرف التي ارتبطت بحجز خُرّج اليوم للتصفية في المخطّط */
  getRoomsCheckoutRegisteredToday(): Room[] {
    const nums = new Set<string>();
    for (const b of this.allBookings) {
      if (!this.isBookingCheckoutCompletedToday(b)) {
        continue;
      }
      const n = String(b.room_Number ?? '').trim();
      if (n) {
        nums.add(n);
      }
    }
    return this.rooms.filter((r) => nums.has(String(r.roomNumber ?? '').trim()));
  }

  /** يُستدعى بعد تحميل الغرف والحجوزات — يغذّي ألوان المشهد والفلاتر */
  private refreshRoomTransferLookup(): void {
    this.recentRoomTransfers = readRecentRoomTransfers();
    this.roomTransferLookup = buildRoomTransferLookup(this.recentRoomTransfers);
  }

  get showTransferredRoomsPanel(): boolean {
    return this.selectedStatus === 'room_transferred';
  }

  get transferDisplayRows(): RoomTransferDisplayRow[] {
    return this.recentRoomTransfers.map((transfer) => ({
      transfer,
      fromRoom: this.rooms.find((r) => String(r.roomNumber ?? '').trim() === transfer.fromRoom),
      toRoom: this.rooms.find((r) => String(r.roomNumber ?? '').trim() === transfer.toRoom),
    }));
  }

  get roomsInvolvedInTransfers(): Room[] {
    const nums = new Set<string>();
    for (const t of this.recentRoomTransfers) {
      nums.add(t.fromRoom);
      nums.add(t.toRoom);
    }
    return this.rooms.filter((r) => nums.has(String(r.roomNumber ?? '').trim()));
  }

  formatTransferTime(iso: string): string {
    try {
      const loc = this.ui.displayLocale() === 'ar' ? 'ar-SA' : undefined;
      return new Date(iso).toLocaleString(loc, {
        dateStyle: 'short',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  }

  openTransferDestination(row: RoomTransferDisplayRow): void {
    const room = row.toRoom ?? row.fromRoom;
    if (room) {
      this.openRoomPreview(room);
    }
  }

  getRoomTransferHint(room: Room): RoomTransferHint | null {
    const num = String(room.roomNumber ?? '').trim();
    return num ? this.roomTransferLookup.get(num) ?? null : null;
  }

  roomTransferSubtitle(room: Room): string | null {
    const hint = this.getRoomTransferHint(room);
    if (!hint) {
      return null;
    }
    if (hint.role === 'from') {
      return this.ui
        .screenText('rooms', 'semanticTransferredTo')
        .replace('{to}', hint.otherRoom);
    }
    return this.ui
      .screenText('rooms', 'semanticTransferredFrom')
      .replace('{from}', hint.otherRoom);
  }

  private refreshBookingSemanticSets(): void {
    this.bookingDepartTodayRoomNums.clear();
    this.bookingStayingRoomNums.clear();
    for (const b of this.allBookings) {
      const num = String(b.room_Number ?? '').trim();
      if (!num) {
        continue;
      }
      if (isBookingDepartingWithinWindow(b)) {
        this.bookingDepartTodayRoomNums.add(num);
      }
    }
    for (const n of stayingBookingRoomNumbers(this.allBookings)) {
      this.bookingStayingRoomNums.add(n);
    }
  }

  goToAdd(): void {
    this.router.navigate(['/rooms/add']);
  }

  roomPriceSymbol(room: Room): string {
    return roomCurrencySymbol(room, this.hotelCurrency);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/rooms/edit', id]);
  }

  deleteRoom(id: number): void {
    void this.uiMsg.confirm('هل أنت متأكد من حذف هذه الغرفة؟').then((ok) => {
      if (!ok) {
        return;
      }
      this.roomService.deleteRoom(id).subscribe({
        next: () => {
          this.uiMsg.success('تم حذف الغرفة بنجاح');
          this.loadRooms();
        },
        error: (err) => {
          console.error('Error deleting room', err);
          const message = err?.error?.error?.message || err?.message || 'خطأ غير معروف';
          this.uiMsg.error(`فشل حذف الغرفة: ${message}`);
        },
      });
    });
  }

  getStatusText(status: string): string {
    switch (this.normalizeRoomStatus(status ?? '')) {
      case 'available':
        return this.ui.screenText('rooms', 'statusAvailableClean');
      case 'occupied':
        return this.ui.screenText('rooms', 'statusOccupiedShort');
      case 'dirty':
        return this.ui.screenText('rooms', 'statusDirtyShort');
      case 'cleaning':
        return this.ui.screenText('rooms', 'statusCleaningShort');
      case 'maintenance':
        return this.ui.screenText('rooms', 'statusMaintenanceShort');
      case 'suspended':
        return this.ui.screenText('rooms', 'statusSuspendedShort');
      default:
        return this.ui.screenText('rooms', 'statusUnknown');
    }
  }

  getStatusIcon(status: string): string {
    switch (this.normalizeRoomStatus(status ?? '')) {
      case 'available': return 'fa-broom';
      case 'occupied': return 'fa-user-tag';
      case 'dirty': return 'fa-spray-can';
      case 'cleaning': return 'fa-broom';
      case 'maintenance': return 'fa-screwdriver-wrench';
      case 'suspended': return 'fa-ban';
      default: return 'fa-question-circle';
    }
  }

  toggleStatusFilter(status: string): void {
    this.selectedStatus = this.selectedStatus === status ? '' : status;
  }

  filteredRooms(): Room[] {
    if (!this.selectedStatus) {
      return this.rooms;
    }
    if (this.selectedStatus === 'departure_today') {
      return this.getRoomsExpectedDepartureToday();
    }
    if (this.selectedStatus === 'booked_dirty') {
      return this.getRoomsBookedUnclean();
    }
    if (this.selectedStatus === 'checkout_today') {
      return this.getRoomsCheckoutRegisteredToday();
    }
    if (this.selectedStatus === 'occupied') {
      return this.getRoomsWithStayingBookings();
    }
    if (this.selectedStatus === 'room_transferred') {
      return this.roomsInvolvedInTransfers;
    }
    return this.rooms.filter(r => r.status === this.selectedStatus);
  }

  getRoomsByStatus(status: string) {
    if (status === 'occupied') {
      return this.stayingBookedRoomsCount;
    }
    return this.rooms.filter(r => r.status === status).length;
  }

  get totalRooms(): number {
    return this.rooms.length;
  }

  get operableRooms(): number {
    return this.rooms.filter((r) => r.status !== 'maintenance' && r.status !== 'suspended').length;
  }

  uniqueRoomTypes(): string[] {
    return [...new Set(this.rooms.map((r) => r.type).filter(Boolean))].sort();
  }

  uniqueFloors(): number[] {
    return [...new Set(this.rooms.map((r) => r.floor).filter((f) => f != null))].sort((a, b) => a - b);
  }

  uniqueRoomFeatures(): string[] {
    const set = new Set<string>();
    for (const room of this.rooms) {
      for (const feature of parseRoomFeatures(room.roomFeatures)) {
        set.add(feature);
      }
    }
    return [...set].sort((a, b) => a.localeCompare(b, 'ar'));
  }

  uniqueRoomPrices(): number[] {
    return [...new Set(this.rooms.map((r) => r.price).filter((p) => p > 0))].sort((a, b) => a - b);
  }

  formatFilterPrice(price: number): string {
    return this.hotelCurrency.formatWithSymbol(price);
  }

  get smartFilterActive(): boolean {
    return !!(
      this.devRoomType ||
      this.devFilterFloor ||
      this.devFilterFeature ||
      this.devFilterPrice ||
      this.devSearch.trim()
    );
  }

  clearSmartFilters(): void {
    this.devRoomType = '';
    this.devFilterFloor = '';
    this.devFilterFeature = '';
    this.devFilterPrice = '';
    this.devSearch = '';
    this.cdr.markForCheck();
  }

  floorFilterLabel(floor: number): string {
    return this.ui.screenText('rooms', 'floorBadge').replace('{f}', String(floor));
  }

  /** بطاقات الملخص بنمط لوحة الاستقبال (أرقام حقيقية حيث تتوفر البيانات) */
  get devSummaryTiles(): RoomsDevSummaryTile[] {
    const a = this.getRoomsByStatus('available');
    const o = this.getRoomsByStatus('occupied');
    const d = this.getRoomsByStatus('dirty');
    const m = this.getRoomsByStatus('maintenance');
    const s = this.getRoomsByStatus('suspended');
    const depToday = this.getRoomsExpectedDepartureToday().length;
    const bookedDirty = this.getRoomsBookedUnclean().length;
    const coReg = this.checkoutRegisteredTodayCount();
    const xferCount = this.recentRoomTransfers.length;
    return [
      { key: 'avail_neat', labelKey: 'tileAvailNeat', icon: 'fa-leaf', tone: 'green', count: a },
      { key: 'avail_soiled', labelKey: 'tileAvailSoiled', icon: 'fa-spray-can', tone: 'soil', count: d },
      { key: 'rooms_reserved', labelKey: 'tileRoomsReserved', icon: 'fa-door-closed', tone: 'occ', count: o },
      {
        key: 'dep_expected',
        labelKey: 'tileDepExpected',
        icon: 'fa-suitcase-rolling',
        tone: 'depart',
        count: depToday,
      },
      {
        key: 'checkout_registered',
        labelKey: 'tileCheckoutRegistered',
        icon: 'fa-sign-out-alt',
        tone: 'checkout',
        count: coReg,
      },
      {
        key: 'room_maint',
        labelKey: 'tileRoomMaint',
        icon: 'fa-screwdriver-wrench',
        tone: 'maint',
        count: m,
      },
      {
        key: 'room_halt',
        labelKey: 'tileRoomHalt',
        icon: 'fa-hand-paper',
        tone: 'halt',
        count: s,
      },
      {
        key: 'book_dirty',
        labelKey: 'tileBookDirty',
        icon: 'fa-house-damage',
        tone: 'bkdirty',
        count: bookedDirty,
      },
      {
        key: 'room_transferred',
        labelKey: 'tileRoomsTransferred',
        icon: 'fa-exchange-alt',
        tone: 'xfer',
        count: xferCount,
      },
    ];
  }

  filteredRoomsAdvanced(): Room[] {
    let list = [...this.rooms];
    if (this.selectedStatus === 'departure_today') {
      list = this.getRoomsExpectedDepartureToday();
    } else if (this.selectedStatus === 'booked_dirty') {
      list = this.getRoomsBookedUnclean();
    } else if (this.selectedStatus === 'checkout_today') {
      list = this.getRoomsCheckoutRegisteredToday();
    } else if (this.selectedStatus === 'occupied') {
      list = this.getRoomsWithStayingBookings();
    } else if (this.selectedStatus === 'room_transferred') {
      list = this.roomsInvolvedInTransfers;
    } else if (this.selectedStatus) {
      list = list.filter((r) => r.status === this.selectedStatus);
    }
    if (this.devRoomType) {
      list = list.filter((r) => r.type === this.devRoomType);
    }
    if (this.devFilterFloor) {
      const floor = Number(this.devFilterFloor);
      if (!Number.isNaN(floor)) {
        list = list.filter((r) => r.floor === floor);
      }
    }
    if (this.devFilterFeature) {
      const feature = this.devFilterFeature;
      list = list.filter((r) => parseRoomFeatures(r.roomFeatures).includes(feature));
    }
    if (this.devFilterPrice) {
      const price = Number(this.devFilterPrice);
      if (!Number.isNaN(price)) {
        list = list.filter((r) => r.price === price);
      }
    }
    if (this.devSearch.trim()) {
      const term = this.devSearch.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.roomNumber && r.roomNumber.toLowerCase().includes(term)) ||
          (r.type && r.type.toLowerCase().includes(term)) ||
          String(r.floor).includes(term)
      );
    }
    if (this.devArrivingOnly) {
      list = list.filter((r) =>
        this.bookingStayingRoomNums.has(String(r.roomNumber ?? '').trim())
      );
    }
    if (this.devPaymentDueOnly) {
      list = list.filter(
        (r) =>
          this.bookingStayingRoomNums.has(String(r.roomNumber ?? '').trim()) &&
          r.price > 0
      );
    }
    return list;
  }

  floorsInAdvancedView(): number[] {
    const floors = [...new Set(this.filteredRoomsAdvanced().map((r) => r.floor))];
    return floors.sort((a, b) => a - b);
  }

  roomsOnFloor(floor: number): Room[] {
    return this.filteredRoomsAdvanced().filter((r) => r.floor === floor);
  }

  /** أقسام الشريط الأفقي: كل الغرف في شريط واحد أو تفصيل حسب الطابق */
  advancedSections(): { label: string; rooms: Room[] }[] {
    const rooms = this.filteredRoomsAdvanced();
    if (this.devDataScope === 'all') {
      return [
        {
          label: this.ui
            .screenText('rooms', 'allRoomsSection')
            .replace('{n}', String(rooms.length)),
          rooms,
        },
      ];
    }
    return this.floorsInAdvancedView().map((f) => ({
      label: this.ui
        .screenText('rooms', 'floorSection')
        .replace('{f}', String(f))
        .replace('{n}', String(this.roomsOnFloor(f).length)),
      rooms: this.roomsOnFloor(f),
    }));
  }

  get devAdvancedHasRooms(): boolean {
    if (this.showTransferredRoomsPanel) {
      return this.transferDisplayRows.length > 0 || this.roomsInvolvedInTransfers.length > 0;
    }
    return this.filteredRoomsAdvanced().length > 0;
  }

  get devOccupancyPercent(): number {
    if (this.operableRooms <= 0) {
      return 0;
    }
    return Math.round((this.stayingBookedRoomsCount / this.operableRooms) * 10000) / 100;
  }

  get devTotalRates(): number {
    return this.rooms.reduce((s, r) => s + (r.price || 0), 0);
  }

  get devOccupiedRates(): number {
    return this.getRoomsWithStayingBookings().reduce((s, r) => s + (r.price || 0), 0);
  }

  private roomVisualScene(room: Room): RoomVisualScene {
    const num = String(room.roomNumber ?? '').trim();
    const st = room.status;
    const xfer = num ? this.roomTransferLookup.get(num) : undefined;
    if (xfer?.role === 'from' && st === 'dirty') {
      return 'xfer_out';
    }
    if (xfer?.role === 'to' && num && this.bookingStayingRoomNums.has(num)) {
      return 'xfer_in';
    }
    if (st === 'suspended') {
      return 'halt';
    }
    if (st === 'maintenance') {
      return 'maint';
    }
    if (st === 'cleaning') {
      return 'cleaning';
    }
    if (st === 'dirty') {
      if (num && this.bookingStayingRoomNums.has(num)) {
        return 'dirty_guest';
      }
      return 'dirty_vacant';
    }
    if (num && this.bookingStayingRoomNums.has(num)) {
      if (this.bookingDepartTodayRoomNums.has(num)) {
        return 'occ_depart';
      }
      if (st === 'available') {
        return 'occ_clean';
      }
      return 'occ';
    }
    if (st === 'available') {
      return 'avail';
    }
    if (st === 'occupied') {
      return 'occ';
    }
    return 'avail';
  }

  /** أيقونة الشارة أعلى البطاقة (يمين) */
  semanticSceneFlagIcon(room: Room): string {
    return this.isReservedCleanRoom(room) ? 'fa-door-closed' : this.semanticSceneIcon(room);
  }

  /** أيقونة داخل الدائرة */
  semanticSceneCircleIcon(room: Room): string {
    return this.isReservedCleanRoom(room) ? 'fa-check-double' : this.semanticSceneIcon(room);
  }

  /** أيقونة واحدة تُستخدم مع `fas` — تطابق مشهد الغرفة (اللون + المعنى) */
  semanticSceneIcon(room: Room): string {
    switch (this.roomVisualScene(room)) {
      case 'avail':
        return 'fa-check-double';
      case 'dirty_vacant':
        return 'fa-broom';
      case 'dirty_guest':
        return 'fa-house-damage';
      case 'cleaning':
        return 'fa-broom';
      case 'occ':
        return 'fa-door-closed';
      case 'occ_clean':
        return 'fa-check-double';
      case 'occ_depart':
        return 'fa-suitcase-rolling';
      case 'xfer_out':
        return 'fa-sign-out-alt';
      case 'xfer_in':
        return 'fa-sign-in-alt';
      case 'maint':
        return 'fa-screwdriver-wrench';
      case 'halt':
        return 'fa-hand-paper';
      default:
        return 'fa-question-circle';
    }
  }

  /** تلميحة موحّدة للبطاقة (الحالة + السياق كمغادرة اليوم) */
  semanticSceneTooltip(room: Room): string {
    const base = this.getStatusText(room.status);
    if (this.isRoomCleaning(room)) {
      return `${base} — ${this.ui.screenText('rooms', 'cleaningDurationLabel')}: ${this.roomCleaningClock(room)} — ${this.cleaningReadyLine(room)}`;
    }
    const extra = this.getSemanticStatusSubtitle(room);
    return extra ? `${base} — ${extra}` : base;
  }

  /** لون مخطّط الغرف المتقدّم حسب المشهد (متاح نظيف، محجوز، متسخ، مغادرة، …) */
  devSemanticCardTone(room: Room): string {
    switch (this.roomVisualScene(room)) {
      case 'avail':
        return 'rooms-dev-card--avail';
      case 'dirty_vacant':
        return 'rooms-dev-card--dirty-vacant';
      case 'dirty_guest':
        return 'rooms-dev-card--dirty-guest';
      case 'cleaning':
        return 'rooms-dev-card--cleaning';
      case 'occ':
        return 'rooms-dev-card--occ';
      case 'occ_clean':
        return 'rooms-dev-card--occ-clean';
      case 'occ_depart':
        return 'rooms-dev-card--occ-depart';
      case 'xfer_out':
        return 'rooms-dev-card--xfer-out';
      case 'xfer_in':
        return 'rooms-dev-card--xfer-in';
      case 'maint':
        return 'rooms-dev-card--maint';
      case 'halt':
        return 'rooms-dev-card--halt';
      default:
        return 'rooms-dev-card--avail';
    }
  }

  /** شريط اللون العلوي في شبكة الغرف البسيطة */
  gridRoomSceneClass(room: Room): string {
    switch (this.roomVisualScene(room)) {
      case 'avail':
        return 'room-scene--avail';
      case 'dirty_vacant':
        return 'room-scene--dirty-vacant';
      case 'dirty_guest':
        return 'room-scene--dirty-guest';
      case 'cleaning':
        return 'room-scene--cleaning';
      case 'occ':
        return 'room-scene--occ';
      case 'occ_clean':
        return 'room-scene--occ-clean';
      case 'occ_depart':
        return 'room-scene--occ-depart';
      case 'xfer_out':
        return 'room-scene--xfer-out';
      case 'xfer_in':
        return 'room-scene--xfer-in';
      case 'maint':
        return 'room-scene--maint';
      case 'halt':
        return 'room-scene--halt';
      default:
        return 'room-scene--avail';
    }
  }

  /** نص مختصر تحت الشارة بالمخطّط — يكمِّل حالة «غرفة» عند مغادرة أو نزيل بغرفة متسخة */
  getSemanticStatusSubtitle(room: Room): string | null {
    const xferLine = this.roomTransferSubtitle(room);
    switch (this.roomVisualScene(room)) {
      case 'xfer_out':
      case 'xfer_in':
        return xferLine;
      case 'occ_depart':
        return this.ui.screenText('rooms', 'semanticDepartToday');
      case 'occ_clean':
        return this.ui.screenText('rooms', 'semanticReservedClean');
      case 'dirty_guest':
        return this.ui.screenText('rooms', 'semanticDirtyGuest');
      case 'dirty_vacant':
        return this.ui.screenText('rooms', 'semanticNeedsCleaning');
      case 'maint': {
        const reason = (room.maintenanceReason ?? '').trim();
        return reason || null;
      }
      case 'cleaning':
        return null;
      case 'halt':
        return this.ui.screenText('rooms', 'statusSuspendedShort');
      default:
        return null;
    }
  }

  devStatusFilterLabelForBanner(status: string): string {
    if (status === 'departure_today') {
      return this.ui.screenText('rooms', 'filterDepartTodayBanner');
    }
    if (status === 'booked_dirty') {
      return this.ui.screenText('rooms', 'filterBookedDirtyBanner');
    }
    if (status === 'checkout_today') {
      return this.ui.screenText('rooms', 'filterCheckoutTodayBanner');
    }
    if (status === 'room_transferred') {
      return this.ui.screenText('rooms', 'filterRoomsTransferredBanner');
    }
    switch (this.normalizeRoomStatus(status ?? '')) {
      case 'available':
        return this.ui.screenText('rooms', 'filterAvailableReady');
      case 'occupied':
        return this.ui.screenText('rooms', 'filterOccupiedGuest');
      case 'dirty':
        return this.ui.screenText('rooms', 'filterDirtyNeedsClean');
      case 'maintenance':
        return this.ui.screenText('rooms', 'filterUnderMaintenance');
      case 'suspended':
        return this.ui.screenText('rooms', 'filterSuspendedOps');
      default:
        return status;
    }
  }

  get devFilterSummaryLines(): string[] {
    const lines: string[] = [];
    if (this.selectedStatus) {
      lines.push(
        `${this.ui.screenText('rooms', 'filterSelectedPrefix')} ${this.devStatusFilterLabelForBanner(this.selectedStatus)}`,
      );
    }
    if (this.devArrivingOnly) {
      lines.push(this.ui.screenText('rooms', 'filterArrivingOnly'));
    }
    if (this.devPaymentDueOnly) {
      lines.push(this.ui.screenText('rooms', 'filterPaymentDue'));
    }
    if (this.devRoomType) {
      lines.push(`${this.ui.screenText('rooms', 'filterRoomCategoryPrefix')} ${this.ui.roomTypeLabel(this.devRoomType)}`);
    }
    if (this.devFilterFeature) {
      lines.push(`${this.ui.screenText('rooms', 'filterRoomFeaturePrefix')} ${this.devFilterFeature}`);
    }
    if (this.devFilterFloor) {
      lines.push(
        `${this.ui.screenText('rooms', 'filterFloorPrefix')} ${this.floorFilterLabel(Number(this.devFilterFloor))}`,
      );
    }
    if (this.devFilterPrice) {
      lines.push(
        `${this.ui.screenText('rooms', 'filterPricePrefix')} ${this.formatFilterPrice(Number(this.devFilterPrice))}`,
      );
    }
    const q = this.devSearch.trim();
    if (q) {
      lines.push(`${this.ui.screenText('rooms', 'filterSearchPrefix')} «${q}»`);
    }
    return lines;
  }

  get devFilterBannerVisible(): boolean {
    return this.devFilterSummaryLines.length > 0;
  }

  clearAdvancedFilters(): void {
    this.selectedStatus = '';
    this.devArrivingOnly = false;
    this.devPaymentDueOnly = false;
    this.clearSmartFilters();
    this.cdr.markForCheck();
  }

  isDevTileActive(tile: RoomsDevSummaryTile): boolean {
    const map: Record<string, string> = {
      avail_neat: 'available',
      rooms_reserved: 'occupied',
      dep_expected: 'departure_today',
      checkout_registered: 'checkout_today',
      avail_soiled: 'dirty',
      room_maint: 'maintenance',
      room_halt: 'suspended',
      book_dirty: 'booked_dirty',
      room_transferred: 'room_transferred',
    };
    const st = map[tile.key];
    return !!st && this.selectedStatus === st;
  }

  onDevSummaryClick(tile: RoomsDevSummaryTile): void {
    const map: Record<string, string> = {
      avail_neat: 'available',
      rooms_reserved: 'occupied',
      dep_expected: 'departure_today',
      checkout_registered: 'checkout_today',
      avail_soiled: 'dirty',
      room_maint: 'maintenance',
      room_halt: 'suspended',
      book_dirty: 'booked_dirty',
      room_transferred: 'room_transferred',
    };
    const st = map[tile.key];
    if (st) {
      this.toggleStatusFilter(st);
    } else {
      this.selectedStatus = '';
    }
  }
}
