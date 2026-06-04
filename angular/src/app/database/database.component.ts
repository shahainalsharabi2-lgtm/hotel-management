import { ChangeDetectorRef, Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, fromEvent, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BookingService } from '../services/booking.service';
import { RoomService } from '../services/room.service';
import { FloorService } from '../services/floor.service';
import { Booking } from '../models/booking.model';
import { Room } from '../models/room.model';
import { Floor } from '../models/floor.model';
import { toDateOnlyString, todayLocalDateString } from '../utils/date-only';
import {
  bookingCheckInYmd,
  bookingCheckOutYmd,
  checkoutCountdownText,
  countStayingBookedRooms,
  formatSlashDate,
  isBookingActive,
  isBookingCurrentlyStaying,
  isBookingDepartingWithinWindow,
  parseBookingCheckOutLocal,
  stayingBookingRoomNumbers,
} from '../utils/booking-display.util';
import {
  DASHBOARD_VIEW_MODE_CHANGED_EVENT,
  DASHBOARD_VIEW_MODE_STORAGE_KEY,
  readDashboardAdvancedEnabled,
} from '../utils/dev-outlines';
import { RoomPreviewSheetComponent } from '../shared/room-preview-sheet/room-preview-sheet.component';
import { PmsBookingCardComponent } from '../shared/pms-booking-card/pms-booking-card.component';
import { UiTranslationsService } from '../services/ui-translations.service';
import { bindUiTranslationRefresh } from '../utils/ui-screen-i18n.helper';
import { HotelSymbolPipe } from '../pipes/hotel-symbol.pipe';

export interface DbAdvSummaryTile {
  key: string;
  labelKey: string;
  count: number;
  /** عند الضغط: تصفية الغرف بهذه الحالة */
  filterStatus?: Room['status'];
  /** عند الضغط: غرف لها حجز مقيم (سجل الحجز — تبويب المقيمون) */
  filterStayingBooking?: boolean;
  /** عند الضغط: لوحة بطاقات المقيمين */
  filterResidentsPanel?: boolean;
  /** عند الضغط: لوحة بطاقات المغادرين اليوم */
  filterDepartingPanel?: boolean;
}

export type DbAdvBookingsPanel = '' | 'residents' | 'departing';

@Component({
  selector: 'app-database',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RoomPreviewSheetComponent,
    PmsBookingCardComponent,
    HotelSymbolPipe,
  ],
  templateUrl: './database.component.html',
  styleUrls: ['./database.component.css', '../booking-list/booking-list.component.css'],
})
export class DatabaseComponent implements OnInit {
  readonly ui = inject(UiTranslationsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  allBookings: Booking[] = [];
  allRooms: Room[] = [];
  allFloors: Floor[] = [];

  filterDate: string = '';
  filterName: string = '';
  filterStatus: string = 'checked_out';

  loading = true;
  error = '';

  /** يتبع «العرض المطوّر» في لوحة التحكم */
  databaseAdvancedLayout = false;

  /** تصفية شبكة العرض المطوّر */
  dbAdvStatusFilter: '' | Room['status'] = '';
  /** غرف عليها حجز مقيم (مرتبط بسجل الحجز) */
  dbAdvStayingOnly = false;
  /** لوحة بطاقات الحجز (مقيمون / مغادرون) */
  dbAdvBookingsPanel: DbAdvBookingsPanel = '';
  dbAdvTypePill = 'all';
  /** null = كل الطوابق */
  dbAdvFloorFilter: number | null = null;

  roomPreview: Room | null = null;
  roomPreviewBooking: Booking | null = null;

  /** بطاقة ملاحظة — توسيع التفاصيل عند النقر على الاسم */
  expandedNoteBookingId: number | null = null;

  /** ورقة نزيل عند النقر على غرفة في «مشغولة الآن» */
  occupiedRoomNote: { room: Room; booking: Booking } | null = null;

  /** حجم عرض صفحة قاعدة البيانات (٪) */
  dbAdvLayoutScale = 70;

  private readonly dbAdvLayoutScaleStorageKey = 'hotelDatabaseAdvLayoutScale';

  private readonly dbAdvLayoutScaleLegacyKey = 'hotelDatabaseResidentsScale';

  constructor(
    private bookingService: BookingService,
    private roomService: RoomService,
    private floorService: FloorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    this.filterDate = '';
    this.restoreDbAdvLayoutScale();
    this.wireAdvancedLayoutSync();
    this.fetchData();
  }

  private restoreDbAdvLayoutScale(): void {
    try {
      let v = localStorage.getItem(this.dbAdvLayoutScaleStorageKey);
      if (v == null) {
        v = localStorage.getItem(this.dbAdvLayoutScaleLegacyKey);
      }
      if (v == null) {
        return;
      }
      const n = parseInt(v, 10);
      if (!Number.isNaN(n) && n >= 55 && n <= 110) {
        this.dbAdvLayoutScale = n;
      }
    } catch {
      /* ignore */
    }
  }

  persistDbAdvLayoutScale(): void {
    try {
      localStorage.setItem(this.dbAdvLayoutScaleStorageKey, String(this.dbAdvLayoutScale));
    } catch {
      /* ignore */
    }
  }

  private wireAdvancedLayoutSync(): void {
    this.syncDatabaseAdvancedLayout();
    fromEvent(window, DASHBOARD_VIEW_MODE_CHANGED_EVENT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncDatabaseAdvancedLayout());
    fromEvent<StorageEvent>(window, 'storage')
      .pipe(
        filter((e) => e.key === DASHBOARD_VIEW_MODE_STORAGE_KEY || e.key === null),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.syncDatabaseAdvancedLayout());
  }

  private syncDatabaseAdvancedLayout(): void {
    this.databaseAdvancedLayout = readDashboardAdvancedEnabled();
  }

  fetchData(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      bookings: this.bookingService.getBookings().pipe(
        catchError((err) => {
          console.error('Error fetching bookings', err);
          this.error += 'خطأ في جلب الحجوزات. ';
          return of([] as Booking[]);
        })
      ),
      rooms: this.roomService.getRooms().pipe(
        catchError((err) => {
          console.error('Error fetching rooms', err);
          this.error += 'خطأ في جلب الغرف. ';
          return of([] as Room[]);
        })
      ),
      floors: this.floorService.getFloors().pipe(
        catchError((err) => {
          console.error('Error fetching floors', err);
          this.error += 'خطأ في جلب الطوابق. ';
          return of([] as Floor[]);
        })
      ),
    }).subscribe({
      next: ({ bookings, rooms, floors }) => {
        this.allBookings = bookings;
        this.allRooms = rooms.map((r) => this.mapRoomFromApi(r as Room & Record<string, unknown>));
        this.allFloors = floors;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private mapRoomFromApi(raw: Room & Record<string, unknown>): Room {
    const statusRaw = raw.status ?? raw['Status'];
    const idRaw = raw.id ?? raw['Id'];
    return {
      ...raw,
      id: typeof idRaw === 'number' ? idRaw : Number(idRaw),
      roomNumber: String(raw.roomNumber ?? raw['RoomNumber'] ?? ''),
      type: String(raw.type ?? raw['Type'] ?? ''),
      price: Number(raw.price ?? raw['Price'] ?? 0),
      floor: Number(raw.floor ?? raw['Floor'] ?? 1),
      currencyCode: (raw.currencyCode ?? raw['CurrencyCode']) as string | undefined,
      currencySymbol: (raw.currencySymbol ?? raw['CurrencySymbol']) as string | undefined,
      maintenanceReason: (raw.maintenanceReason ?? raw['MaintenanceReason']) as string | null | undefined,
      roomView: (raw.roomView ?? raw['RoomView']) as string | null | undefined,
      roomArchitecture: (raw.roomArchitecture ?? raw['RoomArchitecture']) as string | null | undefined,
      roomLocation: (raw.roomLocation ?? raw['RoomLocation']) as string | null | undefined,
      roomFeatures: (raw.roomFeatures ?? raw['RoomFeatures']) as string | null | undefined,
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

  get totalRooms(): number {
    return this.allRooms.length;
  }

  get totalFloors(): number {
    return this.allFloors.length;
  }

  get availableRooms(): number {
    return this.allRooms.filter((r) => r.status === 'available').length;
  }

  /** غرف محجوزة فعلياً — نفس عدد تبويب «المقيمون» في سجلات الحجز */
  get occupiedRooms(): number {
    return countStayingBookedRooms(this.allBookings);
  }

  get maintenanceRooms(): number {
    return this.allRooms.filter((r) => r.status === 'maintenance').length;
  }

  get dirtyRooms(): number {
    return this.allRooms.filter((r) => r.status === 'dirty').length;
  }

  private activeBookingsBase(): Booking[] {
    return this.allBookings.filter((b) => isBookingActive(b));
  }

  private sortBookingsByRoom(list: Booking[]): Booking[] {
    return [...list].sort((a, b) => {
      const na = parseInt(String(a.room_Number), 10);
      const nb = parseInt(String(b.room_Number), 10);
      if (!isNaN(na) && !isNaN(nb)) {
        return na - nb;
      }
      return String(a.room_Number ?? '').localeCompare(String(b.room_Number ?? ''), 'ar');
    });
  }

  /** المقيمون الآن — نفس تبويب المقيمون في سجلات الحجز */
  get stayingBookingsList(): Booking[] {
    return this.sortBookingsByRoom(this.allBookings.filter((b) => isBookingCurrentlyStaying(b)));
  }

  /** المغادرون — خلال 30 دقيقة من موعد المغادرة المجدول */
  get departingBookingsList(): Booking[] {
    return this.sortBookingsByRoom(
      this.activeBookingsBase().filter((b) => isBookingDepartingWithinWindow(b))
    );
  }

  get dbAdvPanelBookings(): Booking[] {
    if (this.dbAdvBookingsPanel === 'residents') {
      return this.stayingBookingsList;
    }
    if (this.dbAdvBookingsPanel === 'departing') {
      return this.departingBookingsList;
    }
    return [];
  }

  get dbAdvBookingsPanelTitleKey(): string {
    if (this.dbAdvBookingsPanel === 'departing') {
      return 'advDepartingPanelTitle';
    }
    return 'advResidentsPanelTitle';
  }

  get dbAdvBookingsPanelEmptyKey(): string {
    if (this.dbAdvBookingsPanel === 'departing') {
      return 'advDepartingEmpty';
    }
    return 'advResidentsEmpty';
  }

  get dbAdvSummaryTiles(): DbAdvSummaryTile[] {
    return [
      { key: 'occ', labelKey: 'advTileOcc', count: this.occupiedRooms, filterStayingBooking: true },
      { key: 'vac', labelKey: 'advTileVac', count: this.availableRooms, filterStatus: 'available' },
      {
        key: 'dep',
        labelKey: 'advTileDep',
        count: this.departingBookingsList.length,
        filterDepartingPanel: true,
      },
      {
        key: 'res',
        labelKey: 'advTileResidents',
        count: this.stayingBookingsList.length,
        filterResidentsPanel: true,
      },
      { key: 'dirty', labelKey: 'advTileDirty', count: this.dirtyRooms, filterStatus: 'dirty' },
    ];
  }

  get dbAdvTypePills(): { key: string; label: string; count: number }[] {
    const types = [...new Set(this.allRooms.map((r) => r.type).filter(Boolean))].sort();
    const rows = types.map((type) => ({
      key: type,
      label: type,
      count: this.allRooms.filter((r) => r.type === type).length,
    }));
    return [{ key: 'all', label: this.ui.screenText('database', 'advFilterAll'), count: this.totalRooms }, ...rows];
  }

  get dbAdvDistinctFloors(): number[] {
    const set = new Set(this.allRooms.map((r) => r.floor).filter((f) => f != null && !isNaN(Number(f))));
    return [...set].sort((a, b) => Number(a) - Number(b));
  }

  advancedRoomsFiltered(): Room[] {
    let list = [...this.allRooms];
    if (this.dbAdvStayingOnly) {
      const nums = stayingBookingRoomNumbers(this.allBookings);
      list = list.filter((r) => nums.has(String(r.roomNumber ?? '').trim()));
    } else if (this.dbAdvStatusFilter) {
      list = list.filter((r) => r.status === this.dbAdvStatusFilter);
    }
    if (this.dbAdvFloorFilter != null) {
      list = list.filter((r) => r.floor === this.dbAdvFloorFilter);
    }
    if (this.dbAdvTypePill && this.dbAdvTypePill !== 'all') {
      list = list.filter((r) => r.type === this.dbAdvTypePill);
    }
    return list.sort((a, b) => {
      if (a.floor !== b.floor) {
        return a.floor - b.floor;
      }
      const na = parseInt(String(a.roomNumber), 10);
      const nb = parseInt(String(b.roomNumber), 10);
      if (!isNaN(na) && !isNaN(nb)) {
        return na - nb;
      }
      return String(a.roomNumber).localeCompare(String(b.roomNumber), 'ar');
    });
  }

  /** للقالب — نفس `advancedRoomsFiltered()` بدون إعادة منطق */
  get dbAdvFilteredRooms(): Room[] {
    return this.advancedRoomsFiltered();
  }

  onDbAdvSummaryTile(tile: DbAdvSummaryTile): void {
    this.closeOccupiedRoomNote();
    if (tile.filterResidentsPanel) {
      this.dbAdvBookingsPanel = this.dbAdvBookingsPanel === 'residents' ? '' : 'residents';
      if (this.dbAdvBookingsPanel) {
        this.dbAdvStatusFilter = '';
        this.dbAdvStayingOnly = false;
      }
      this.expandedNoteBookingId = null;
      return;
    }
    if (tile.filterDepartingPanel) {
      this.dbAdvBookingsPanel = this.dbAdvBookingsPanel === 'departing' ? '' : 'departing';
      if (this.dbAdvBookingsPanel) {
        this.dbAdvStatusFilter = '';
        this.dbAdvStayingOnly = false;
      }
      this.expandedNoteBookingId = null;
      return;
    }
    this.dbAdvBookingsPanel = '';
    if (tile.filterStayingBooking) {
      this.dbAdvStayingOnly = !this.dbAdvStayingOnly;
      if (this.dbAdvStayingOnly) {
        this.dbAdvStatusFilter = '';
      }
      return;
    }
    if (tile.filterStatus) {
      this.dbAdvStayingOnly = false;
      this.dbAdvStatusFilter =
        this.dbAdvStatusFilter === tile.filterStatus ? '' : tile.filterStatus;
    } else {
      this.dbAdvStatusFilter = '';
      this.dbAdvStayingOnly = false;
    }
  }

  isDbAdvTileActive(tile: DbAdvSummaryTile): boolean {
    if (tile.filterResidentsPanel) {
      return this.dbAdvBookingsPanel === 'residents';
    }
    if (tile.filterDepartingPanel) {
      return this.dbAdvBookingsPanel === 'departing';
    }
    if (tile.filterStayingBooking) {
      return this.dbAdvStayingOnly;
    }
    return !!tile.filterStatus && this.dbAdvStatusFilter === tile.filterStatus;
  }

  dbAdvCardTone(status: string): string {
    switch (this.normalizeRoomStatus(status ?? '')) {
      case 'available':
        return 'db-adv-mini-card--avail';
      case 'dirty':
        return 'db-adv-mini-card--dirty';
      case 'occupied':
        return 'db-adv-mini-card--occ';
      case 'maintenance':
        return 'db-adv-mini-card--maint';
      case 'suspended':
        return 'db-adv-mini-card--halt';
      default:
        return 'db-adv-mini-card--avail';
    }
  }

  findStayingBookingForRoom(room: Room): Booking | null {
    const num = String(room.roomNumber ?? '').trim();
    if (!num) {
      return null;
    }
    return (
      this.allBookings.find(
        (b) => isBookingCurrentlyStaying(b) && String(b.room_Number ?? '').trim() === num
      ) ?? null
    );
  }

  isRoomOccupiedByGuest(room: Room): boolean {
    return !!this.findStayingBookingForRoom(room);
  }

  goRoomDetails(id: number): void {
    this.router.navigate(['/rooms/details', id]);
  }

  onAdvRoomClick(room: Room): void {
    if (this.dbAdvStayingOnly) {
      const booking = this.findStayingBookingForRoom(room);
      if (booking) {
        this.closeRoomPreview();
        this.expandedNoteBookingId = booking.id ?? null;
        this.occupiedRoomNote = { room, booking };
        return;
      }
    }
    this.openRoomPreview(room);
  }

  closeOccupiedRoomNote(): void {
    this.occupiedRoomNote = null;
    this.expandedNoteBookingId = null;
  }

  @HostListener('document:keydown.escape')
  onOccupiedNoteEscape(): void {
    if (this.occupiedRoomNote) {
      this.closeOccupiedRoomNote();
    }
  }

  openRoomPreview(room: Room): void {
    this.closeOccupiedRoomNote();
    this.roomPreview = room;
    this.roomPreviewBooking = this.findStayingBookingForRoom(room);
  }

  closeRoomPreview(): void {
    this.roomPreview = null;
    this.roomPreviewBooking = null;
  }

  onRoomPreviewUpdated(updated: Room): void {
    const idx = this.allRooms.findIndex((r) => r.id === updated.id);
    if (idx >= 0) {
      this.allRooms = [
        ...this.allRooms.slice(0, idx),
        updated,
        ...this.allRooms.slice(idx + 1),
      ];
    }
    if (this.roomPreview?.id === updated.id) {
      this.roomPreview = updated;
    }
  }

  openGuestDetailFromBooking(booking: Booking): void {
    const num = String(booking.room_Number ?? '').trim();
    const room = this.allRooms.find((r) => String(r.roomNumber ?? '').trim() === num);
    if (room) {
      this.roomPreview = room;
      this.roomPreviewBooking = booking;
    }
  }

  toggleNoteExpand(id: number | undefined): void {
    if (id === undefined) {
      return;
    }
    this.expandedNoteBookingId = this.expandedNoteBookingId === id ? null : id;
  }

  noteColorClass(_index: number): string {
    return 'db-sticky-note--blue';
  }

  guestDisplayName(booking: Booking): string {
    return `${booking.first_Name || ''} ${booking.last_Name || ''}`.trim() || '—';
  }

  guestFloorLabel(booking: Booking): string {
    const fromBooking = booking.floor != null ? String(booking.floor).trim() : '';
    if (fromBooking) {
      return fromBooking;
    }
    const num = String(booking.room_Number ?? '').trim();
    const room = this.allRooms.find((r) => String(r.roomNumber ?? '').trim() === num);
    return room?.floor != null ? String(room.floor) : '';
  }

  guestRoomType(booking: Booking): string {
    const fromBooking = String(booking.room_Type ?? '').trim();
    if (fromBooking) {
      return fromBooking;
    }
    const num = String(booking.room_Number ?? '').trim();
    const room = this.allRooms.find((r) => String(r.roomNumber ?? '').trim() === num);
    return String(room?.type ?? '').trim() || '—';
  }

  formatBookingCheckOutDate(booking: Booking): string {
    return this.bookingCheckOutParts(booking).date;
  }

  formatBookingCheckOutTime(booking: Booking): string {
    return this.bookingCheckOutParts(booking).time;
  }

  private bookingCheckOutParts(booking: Booking): { date: string; time: string } {
    const checkOut = parseBookingCheckOutLocal(booking);
    if (!checkOut) {
      return {
        date: formatSlashDate(bookingCheckOutYmd(booking)) || '—',
        time: '—',
      };
    }
    const ymd = `${checkOut.getFullYear()}-${String(checkOut.getMonth() + 1).padStart(2, '0')}-${String(checkOut.getDate()).padStart(2, '0')}`;
    const time = `${checkOut.getHours()}:${String(checkOut.getMinutes()).padStart(2, '0')}`;
    return {
      date: formatSlashDate(ymd),
      time: this.formatTime12h(time),
    };
  }

  checkInYmd = bookingCheckInYmd;
  checkOutYmd = bookingCheckOutYmd;
  formatSlashDate = formatSlashDate;
  checkoutCountdownText = checkoutCountdownText;

  get filteredBookings(): Booking[] {
    let filtered = this.allBookings;

    if (this.filterStatus && this.filterStatus !== 'all') {
      filtered = filtered.filter(
        (b) => b.status === this.filterStatus || (this.filterStatus === 'active' && !b.status)
      );
    }

    if (this.filterDate) {
      filtered = filtered.filter((b) => b.booking_Date === this.filterDate);
    }

    if (this.filterName) {
      const term = this.filterName.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          (b.first_Name && b.first_Name.toLowerCase().includes(term)) ||
          (b.last_Name && b.last_Name.toLowerCase().includes(term))
      );
    }
    return filtered;
  }

  get totalReceivedAmount(): number {
    return this.filteredBookings.reduce((sum, b) => {
      const payment = b.payment_Amount || 0;
      return sum + payment;
    }, 0);
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
