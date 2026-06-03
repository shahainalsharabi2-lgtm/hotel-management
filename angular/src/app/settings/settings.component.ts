import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { fromEvent } from 'rxjs';
import { Floor } from '../models/floor.model';
import { Room } from '../models/room.model';
import { FloorService } from '../services/floor.service';
import { RoomService } from '../services/room.service';
import { IdentityTypeService } from '../services/identity-type.service';
import { IdentityType } from '../models/identity-type.model';

import { Booking } from '../models/booking.model';
import { BookingService } from '../services/booking.service';
import { toDateOnlyString } from '../utils/date-only';
import { UiTranslationsService } from '../services/ui-translations.service';
import { bookingNotifyParams } from '../utils/booking-notify-params.util';
import { HotelBrandingStoreService } from '../services/hotel-branding-store.service';
import { HotelCurrencyService } from '../services/hotel-currency.service';
import {
  HOTEL_CURRENCY_CUSTOM_ID,
  HOTEL_CURRENCY_PRESETS,
  type HotelCurrencyPreset,
  type HotelCurrencyPresetId,
} from '../utils/hotel-currency.presets';
import { roomCurrencySymbol as displayRoomCurrencySymbol } from '../utils/room-currency';
import { formatLocalePickerLabel } from '../utils/locale-picker-label';
import { bindUiTranslationRefresh } from '../utils/ui-screen-i18n.helper';
import { UiMessageService } from '../services/ui-message.service';
import { GeneralCodesComponent } from '../general-codes/general-codes.component';
import { HotelSystemSettingsLoader } from '../services/hotel-system-settings.loader';
import { PaymentMethodService, PaymentMethodDto } from '../services/payment-method.service';
import type { UiExtraLocaleCode } from '../utils/ui-translation.constants';
import type { UiLocaleFilePayload } from '../utils/ui-translations-locale.util';

/** يبقى بعد تسجيل الدخول حتى إغلاق المتصفح (لا يُعاد طلب كلمة المرور عند F5) */
const SETTINGS_SESSION_AUTH_KEY = 'hotelSettingsSessionAuth';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings-base.css', './settings.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, GeneralCodesComponent],
})
export class SettingsComponent implements OnInit {
  /** شعار/صورة الفندق كـ data URL للطباعة (بيضوي) — مشترك بين اللغات */
  hotelImageDataUrl = '';
  password = ''; // The actual password stored

  isAuthorized = false;
  inputPassword = '';
  passwordError = '';
  showLoginPassword = false;
  showSettingsPassword = false;

  /** تأكيد كلمة المرور قبل إضافة بيانات */
  passwordGateOpen = false;
  passwordGateInput = '';
  passwordGateError = '';
  showPasswordGateVisible = false;
  private pendingGateAction: (() => void) | null = null;

  activeTab:
    | 'general'
    | 'layout'
    | 'payments'
    | 'identities'
    | 'guests'
    | 'currency'
    | 'translations'
    | 'uiTranslations' = 'general';

  readonly currencyPresets = HOTEL_CURRENCY_PRESETS;
  readonly currencyCustomId = HOTEL_CURRENCY_CUSTOM_ID;
  currencyCustomSymbol = 'YR';
  currencyCustomCode = 'CUSTOM';

  allBookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  selectedGuestDate: string = '';
  
  editingBooking: Booking | null = null;

  paymentMethodRows: PaymentMethodDto[] = [];

  get paymentMethods(): string[] {
    return this.paymentMethodRows.map((x) => x.name);
  }
  newPaymentMethod = '';
  editingPaymentIndex: number | null = null;
  editingPaymentValue = '';

  identityTypes: IdentityType[] = [];
  newIdentityTypeName = '';
  identityTypesLoading = false;
  identityTypesError = '';

  editingFloorId: number | null = null;
  editingFloorLevel: number = 0;
  editingFloorRoomsCount: number = 0;

  editingRoomId: number | null = null;
  editingRoomNumber: string = '';
  editingRoomType: string = '';
  editingRoomFloor: number = 0;
  editingRoomPrice: number = 0;
  editingRoomStatus: Room['status'] = 'available';

  floors: Floor[] = [];
  rooms: Room[] = [];

  newFloorLevel = 1;
  newFloorRoomsCount = 1;

  newRoomNumber = '';
  newRoomType = '';
  newRoomFloor = 1;
  newRoomPrice = 0;
  newRoomStatus: Room['status'] = 'available';

  /** واجهة تقسيم الفندق الشبكية */
  layoutPanelOpen = false;
  layoutPanelIsNew = false;
  layoutPanelRoomId: number | null = null;
  layoutPanelFloorLevel = 1;
  layoutPanelRoomNumber = '';
  layoutPanelRoomType = 'غرفة عادية';
  layoutPanelRoomPrice = 0;
  layoutPanelRoomStatus: Room['status'] = 'available';
  layoutPanelCurrencyCode = 'YER';
  layoutPanelCurrencySymbol = 'YR';
  layoutCurrencyPickerOpen = false;
  layoutPanelCurrencySaving = false;

  readonly roomTypeOptions = ['غرفة عادية', 'غرفة مزدوجة', 'جناح ملكي'] as const;

  layoutStatusFilter: Room['status'] | 'all' = 'all';

  readonly layoutStatusOptions: readonly {
    value: Room['status'];
    labelKey: string;
    icon: string;
    tone: string;
  }[] = [
    { value: 'available', labelKey: 'statAvailable', icon: 'fa-broom', tone: 'green' },
    { value: 'dirty', labelKey: 'statDirty', icon: 'fa-spray-can', tone: 'amber' },
    { value: 'occupied', labelKey: 'statOccupied', icon: 'fa-user-tag', tone: 'gold' },
    { value: 'maintenance', labelKey: 'statMaintenance', icon: 'fa-screwdriver-wrench', tone: 'red' },
    { value: 'suspended', labelKey: 'statSuspended', icon: 'fa-hand-paper', tone: 'rose' },
  ];

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly uiMsg = inject(UiMessageService);
  private readonly hotelSystemSettings = inject(HotelSystemSettingsLoader);
  private readonly paymentMethodService = inject(PaymentMethodService);

  private readonly settingsTabKeys = new Set([
    'general',
    'layout',
    'payments',
    'identities',
    'guests',
    'currency',
    'translations',
    'uiTranslations',
  ]);

  uiTranslationsLocale: UiExtraLocaleCode | 'ar' = 'ar';
  uiTranslationsLoading = false;
  uiTranslationsSaving = false;
  uiTranslationsError = '';
  uiTranslationsSearch = '';
  uiTranslationsForm: UiLocaleFilePayload | null = null;
  uiTranslationsReferenceAr: UiLocaleFilePayload | null = null;
  uiTranslationsOpenScreens = new Set<string>();

  constructor(
    private floorService: FloorService,
    private roomService: RoomService,
    private identityService: IdentityTypeService,
    private bookingService: BookingService,
    readonly uiTranslations: UiTranslationsService,
    readonly hotelBranding: HotelBrandingStoreService,
    readonly hotelCurrency: HotelCurrencyService
  ) {}

  get selectedCurrencyId(): HotelCurrencyPresetId {
    return this.hotelCurrency.id();
  }

  selectCurrencyPreset(id: HotelCurrencyPresetId): void {
    this.hotelCurrency.selectPreset(id);
    if (id === HOTEL_CURRENCY_CUSTOM_ID) {
      this.currencyCustomSymbol = this.hotelCurrency.symbol();
      this.currencyCustomCode = this.hotelCurrency.code();
    }
    this.persistHotelCurrency();
    this.cdr.markForCheck();
  }

  applyCustomCurrencyFields(): void {
    this.hotelCurrency.setCustom(this.currencyCustomSymbol, this.currencyCustomCode);
    this.persistHotelCurrency();
    this.cdr.markForCheck();
  }

  private persistHotelCurrency(): void {
    this.hotelSystemSettings.save().subscribe({
      next: () => {
        window.dispatchEvent(new Event('hotelSettingsUpdated'));
        window.dispatchEvent(new Event('hotelCurrencyUpdated'));
      },
      error: (err) => {
        console.error('persistHotelCurrency', err);
        this.uiMsg.error('تعذّر حفظ العملة');
      },
    });
  }

  currencyPreviewAmount(): string {
    return this.hotelCurrency.formatWithSymbol(12500);
  }

  activeCurrencyFlag(): string {
    if (this.hotelCurrency.isCustom()) {
      return '⚙';
    }
    const preset = this.currencyPresets.find((p) => p.id === this.selectedCurrencyId);
    return preset?.flag ?? '💱';
  }

  activeCurrencyEngrave(): string {
    if (this.hotelCurrency.isCustom()) {
      return this.uiTranslations.screenText('settings', 'currencyCustomTitle');
    }
    const preset = this.currencyPresets.find((p) => p.id === this.selectedCurrencyId);
    return preset?.engraveAr ?? '';
  }

  roomPriceSymbol(room: Room): string {
    return displayRoomCurrencySymbol(room, this.hotelCurrency);
  }

  toggleLayoutCurrencyPicker(event: Event): void {
    event.stopPropagation();
    this.layoutCurrencyPickerOpen = !this.layoutCurrencyPickerOpen;
  }

  selectLayoutPanelCurrency(preset: HotelCurrencyPreset): void {
    if (
      this.layoutPanelCurrencyCode === preset.code &&
      this.layoutPanelCurrencySymbol === preset.symbol
    ) {
      this.layoutCurrencyPickerOpen = false;
      return;
    }

    this.layoutPanelCurrencyCode = preset.code;
    this.layoutPanelCurrencySymbol = preset.symbol;
    this.layoutCurrencyPickerOpen = false;

    if (!this.layoutPanelIsNew && this.layoutPanelRoomId) {
      this.autoSaveLayoutPanelCurrency();
    }
    this.cdr.markForCheck();
  }

  private autoSaveLayoutPanelCurrency(): void {
    if (!this.layoutPanelRoomId || this.layoutPanelIsNew) {
      return;
    }

    const existing = this.rooms.find((r) => r.id === this.layoutPanelRoomId);
    if (!existing) {
      return;
    }

    this.layoutPanelCurrencySaving = true;
    const updated: Room = {
      ...existing,
      currencyCode: this.layoutPanelCurrencyCode,
      currencySymbol: this.layoutPanelCurrencySymbol,
    };

    this.roomService.updateRoom(this.layoutPanelRoomId, updated).subscribe({
      next: () => {
        const i = this.rooms.findIndex((r) => r.id === this.layoutPanelRoomId);
        if (i !== -1) {
          this.rooms[i] = updated;
        }
        this.layoutPanelCurrencySaving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.layoutPanelCurrencySaving = false;
        this.alertRoomSaveError('تحديث عملة', err);
        this.cdr.markForCheck();
      },
    });
  }

  private syncLayoutPanelCurrencyFromRoom(room: Room | null): void {
    if (room?.currencyCode?.trim() && room.currencySymbol?.trim()) {
      this.layoutPanelCurrencyCode = room.currencyCode.trim();
      this.layoutPanelCurrencySymbol = room.currencySymbol.trim();
      return;
    }

    this.layoutPanelCurrencyCode = this.hotelCurrency.code();
    this.layoutPanelCurrencySymbol = this.hotelCurrency.symbol();
  }

  loadBookings(): void {
    this.bookingService.getBookings().subscribe({
      next: (data) => {
        this.allBookings = data;
        this.filterGuestsByDate();
      }
    });
  }

  filterGuestsByDate(): void {
    if (this.selectedGuestDate) {
      this.filteredBookings = this.allBookings.filter(
        (b) => toDateOnlyString(b.booking_Date) === this.selectedGuestDate
      );
    } else {
      this.filteredBookings = this.allBookings;
    }
  }

  editGuest(booking: Booking): void {
    this.editingBooking = { ...booking };
  }

  updateGuest(): void {
    this.requirePasswordConfirm(() => this.updateGuestConfirmed());
  }

  private updateGuestConfirmed(): void {
    if (this.editingBooking && this.editingBooking.id) {
      this.bookingService.updateBooking(this.editingBooking.id, this.editingBooking, {
        kind: 'booking_updated',
        params: bookingNotifyParams(this.editingBooking),
      }).subscribe({
        next: () => {
          this.uiMsg.show('تم تحديث بيانات النزيل بنجاح');
          this.loadBookings();
          this.editingBooking = null;
        },
        error: (err) => {
          console.error('updateGuest', err);
          const message = err?.error?.error?.message || err?.message || 'فشل تحديث البيانات';
          this.uiMsg.show(message);
        }
      });
    }
  }

  deleteGuest(id: number): void {
    this.requirePasswordConfirm(() => this.deleteGuestConfirmed(id));
  }

  private deleteGuestConfirmed(id: number): void {
    void this.uiMsg.confirm('هل أنت متأكد من حذف بيانات هذا النزيل نهائياً؟').then((ok) => {
      if (!ok) {
        return;
      }
      const booking = this.allBookings.find((b) => b.id === id);
      this.bookingService.deleteBooking(id, {
        kind: 'booking_deleted',
        params: booking ? bookingNotifyParams(booking) : undefined,
      }).subscribe({
        next: () => {
          this.uiMsg.success('تم حذف البيانات بنجاح');
          this.loadBookings();
        },
        error: (err) => {
          console.error('Delete error:', err);
          const message = err?.error?.error?.message || err?.message || 'خطأ غير معروف';
          this.uiMsg.error('فشل حذف البيانات: ' + message);
        },
      });
    });
  }

  formatTime12h(time?: string): string {
    if (!time) return '--:--';
    try {
      const parts = time.split(':');
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1];
      const period = hours >= 12 ? 'م' : 'ص';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${period}`;
    } catch (e) {
      return time;
    }
  }


  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    this.restoreSettingsSessionAuth();
    this.applyTabFromRoute();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.applyTabFromRoute();
      this.cdr.markForCheck();
    });
    fromEvent(window, 'hotelUiLocaleChanged')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // يعتمد تبويب "ترجمة واجهة النظام" على لغة الواجهة المختارة من الشريط العلوي
        if (this.activeTab === 'uiTranslations') {
          this.openUiTranslationsEditor();
        }
      });
    this.loadHotelInfo();
    this.loadFloors();
    this.loadRooms();
    this.loadPaymentMethods();
    this.loadIdentityTypes();
    this.loadBookings();
  }

  private applyTabFromRoute(): void {
    const tab = (this.route.snapshot.queryParamMap.get('tab') || '').trim();
    if (tab && this.settingsTabKeys.has(tab)) {
      this.activeTab = tab as typeof this.activeTab;
      if (this.activeTab === 'uiTranslations') {
        this.openUiTranslationsEditor();
      }
      return;
    }
    this.activeTab = 'general';
    if (!tab) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { tab: 'general' },
        replaceUrl: true,
      });
    }
  }

  loadIdentityTypes(): void {
    this.identityTypesLoading = true;
    this.identityTypesError = '';
    this.identityService.getIdentityTypes().subscribe({
      next: (types) => {
        this.identityTypes = types.filter((t) => t.name?.trim());
        this.identityTypesLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading identity types', err);
        this.identityTypes = [];
        this.identityTypesLoading = false;
        this.identityTypesError = this.uiTranslations.screenText('settings', 'identitiesLoadError');
        this.cdr.markForCheck();
      },
    });
  }

  addIdentityType(): void {
    this.requirePasswordConfirm(() => this.addIdentityTypeConfirmed());
  }

  private addIdentityTypeConfirmed(): void {
    const name = this.newIdentityTypeName.trim();
    if (!name) {
      return;
    }
    const exists = this.identityTypes.some((t) => t.name.trim() === name);
    if (exists) {
      this.uiMsg.show(this.uiTranslations.screenText('settings', 'identitiesDuplicate'));
      return;
    }
    this.identityService.addIdentityType({ name }).subscribe({
      next: () => {
        this.newIdentityTypeName = '';
        this.loadIdentityTypes();
        this.uiMsg.show(this.uiTranslations.screenText('settings', 'identitiesAddSuccess'));
      },
      error: (err) => {
        console.error('addIdentityType', err);
        this.uiMsg.show(this.uiTranslations.screenText('settings', 'identitiesAddFail'));
      },
    });
  }

  deleteIdentityType(id: number | undefined): void {
    if (id == null || Number.isNaN(id)) {
      this.uiMsg.show(this.uiTranslations.screenText('settings', 'identitiesDeleteFail'));
      return;
    }
    this.requirePasswordConfirm(() => this.deleteIdentityTypeConfirmed(id));
  }

  private deleteIdentityTypeConfirmed(id: number): void {
    void this.uiMsg.confirm(this.uiTranslations.screenText('settings', 'identitiesDeleteConfirm')).then((ok) => {
      if (!ok) {
        return;
      }
      this.identityService.deleteIdentityType(id).subscribe({
        next: () => this.loadIdentityTypes(),
        error: (err) => {
          console.error('deleteIdentityType', err);
          this.uiMsg.error(this.uiTranslations.screenText('settings', 'identitiesDeleteFail'));
        },
      });
    });
  }

  setActiveTab(tab: typeof this.activeTab): void {
    this.activeTab = tab;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    if (tab === 'uiTranslations') {
      this.openUiTranslationsEditor();
    }
  }

  private openUiTranslationsEditor(): void {
    if (!this.isAuthorized) {
      return;
    }
    this.uiTranslationsLocale = this.uiTranslations.displayLocale();
    this.uiTranslationsLoading = true;
    this.uiTranslationsError = '';
    this.uiTranslations.fetchFromBackend(() => {
      try {
        this.uiTranslationsReferenceAr = this.uiTranslations.loadLocaleFileForForm('ar');
        this.uiTranslationsForm = this.uiTranslations.loadLocaleFileForForm(this.uiTranslationsLocale);
        this.uiTranslationsOpenScreens = new Set<string>();
      } catch (err) {
        console.error('openUiTranslationsEditor', err);
        this.uiTranslationsError = this.uiTranslations.screenText('settings', 'uiTranslationsLoadFail');
        this.uiTranslationsReferenceAr = null;
        this.uiTranslationsForm = null;
      }
      this.uiTranslationsLoading = false;
      this.cdr.markForCheck();
    });
  }

  reloadUiTranslationsFromBackend(): void {
    this.openUiTranslationsEditor();
  }

  saveUiTranslationsForm(): void {
    if (this.uiTranslationsSaving) {
      return;
    }
    if (!this.uiTranslationsForm) {
      return;
    }
    this.uiTranslationsSaving = true;
    this.uiTranslationsError = '';
    this.uiTranslations.saveLocaleFileForm(this.uiTranslationsLocale, this.uiTranslationsForm).subscribe({
      next: (ok) => {
        this.uiTranslationsSaving = false;
        if (!ok) {
          this.uiTranslationsError = this.uiTranslations.screenText('settings', 'uiTranslationsSaveFail');
          this.cdr.markForCheck();
          return;
        }
        this.uiMsg.show(this.uiTranslations.screenText('settings', 'uiTranslationsSaveOk'));
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('saveUiTranslationsForm', err);
        this.uiTranslationsSaving = false;
        this.uiTranslationsError = this.uiTranslations.screenText('settings', 'uiTranslationsSaveFail');
        this.cdr.markForCheck();
      },
    });
  }

  uiTranslationsSidebarKeys(): string[] {
    const file = this.uiTranslationsForm;
    if (!file?.sidebarNav) return [];
    return Object.keys(file.sidebarNav).sort((a, b) => a.localeCompare(b));
  }

  uiTranslationsChromeKeys(): string[] {
    const file = this.uiTranslationsForm;
    if (!file?.chrome) return [];
    return Object.keys(file.chrome).sort((a, b) => a.localeCompare(b));
  }

  uiTranslationsScreenIds(): string[] {
    const file = this.uiTranslationsForm;
    if (!file?.screenCopy) return [];
    return Object.keys(file.screenCopy).sort((a, b) => a.localeCompare(b));
  }

  uiTranslationsScreenMsgKeys(screenId: string): string[] {
    const file = this.uiTranslationsForm;
    const msgs = file?.screenCopy?.[screenId];
    if (!msgs) return [];
    return Object.keys(msgs).sort((a, b) => a.localeCompare(b));
  }

  toggleUiTranslationsScreen(screenId: string): void {
    if (this.uiTranslationsOpenScreens.has(screenId)) {
      this.uiTranslationsOpenScreens.delete(screenId);
    } else {
      this.uiTranslationsOpenScreens.add(screenId);
    }
  }

  uiTranslationsScreenOpen(screenId: string): boolean {
    return this.uiTranslationsOpenScreens.has(screenId);
  }

  private uiTranslationsQuery(): string {
    return (this.uiTranslationsSearch || '').trim().toLowerCase();
  }

  uiTranslationsHasQuery(): boolean {
    return !!this.uiTranslationsQuery();
  }

  uiTranslationsMatchesText(...texts: Array<string | undefined | null>): boolean {
    const q = this.uiTranslationsQuery();
    if (!q) return true;
    for (const t of texts) {
      if ((t ?? '').toLowerCase().includes(q)) {
        return true;
      }
    }
    return false;
  }

  uiTranslationsScreenHasMatch(screenId: string): boolean {
    const q = this.uiTranslationsQuery();
    if (!q) return true;

    const title = this.uiTranslationsScreenLabel(screenId);
    if (this.uiTranslationsMatchesText(screenId, title)) {
      return true;
    }

    const refMsgs = this.uiTranslationsReferenceAr?.screenCopy?.[screenId] ?? {};
    const curMsgs = this.uiTranslationsForm?.screenCopy?.[screenId] ?? {};
    for (const k of Object.keys({ ...refMsgs, ...curMsgs })) {
      if (this.uiTranslationsMatchesText(k, refMsgs[k], curMsgs[k])) {
        return true;
      }
    }
    return false;
  }

  uiTranslationsAutoOpenMatchingScreens(): void {
    const q = this.uiTranslationsQuery();
    if (!q || !this.uiTranslationsForm?.screenCopy) {
      return;
    }
    for (const screenId of Object.keys(this.uiTranslationsForm.screenCopy)) {
      if (this.uiTranslationsScreenHasMatch(screenId)) {
        this.uiTranslationsOpenScreens.add(screenId);
      }
    }
  }

  uiTranslationsScreenLabel(screenId: string): string {
    const screen = this.uiTranslationsForm?.screenCopy?.[screenId];
    const ref = this.uiTranslationsReferenceAr?.screenCopy?.[screenId];
    const pick = (src: Record<string, string> | undefined): string => {
      if (!src) return '';
      const preferred = [
        'pageTitle',
        'frontDeskPageTitle',
        'viewTitleAdvanced',
        'viewTitleNormal',
        'pageSubtitle',
      ];
      for (const k of preferred) {
        const v = src[k]?.trim();
        if (v) return v;
      }
      // أي مفتاح ينتهي بـ Title
      for (const [k, v] of Object.entries(src)) {
        if (k.toLowerCase().endsWith('title') && (v ?? '').trim()) {
          return (v ?? '').trim();
        }
      }
      return '';
    };
    return pick(screen) || pick(ref) || screenId;
  }

  trackIdentityType(_index: number, type: IdentityType): number | string {
    return type.id ?? type.name;
  }

  loadHotelInfo(): void {
    this.hotelSystemSettings.load().subscribe({
      next: () => {
        this.hotelImageDataUrl = this.hotelBranding.hotelImageDataUrl;
        this.password = this.hotelBranding.password;
        if (this.hotelCurrency.isCustom()) {
          this.currencyCustomSymbol = this.hotelCurrency.symbol();
          this.currencyCustomCode = this.hotelCurrency.code();
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.password = '123';
        this.hotelCurrency.syncForUiLocale(this.uiTranslations.displayLocale(), { persist: false });
        this.cdr.markForCheck();
      },
    });
  }

  verifyPassword(): void {
    if (this.isSettingsPasswordValid(this.inputPassword)) {
      this.isAuthorized = true;
      this.passwordError = '';
      this.persistSettingsSessionAuth();
      this.cdr.markForCheck();
    } else {
      this.passwordError = this.uiTranslations.screenText('settings', 'wrongPassword');
    }
  }

  private restoreSettingsSessionAuth(): void {
    try {
      if (sessionStorage.getItem(SETTINGS_SESSION_AUTH_KEY) === '1') {
        this.isAuthorized = true;
      }
    } catch {
      /* ignore */
    }
  }

  private persistSettingsSessionAuth(): void {
    try {
      sessionStorage.setItem(SETTINGS_SESSION_AUTH_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  private isSettingsPasswordValid(value: string): boolean {
    const entered = (value ?? '').trim();
    const expected = (this.password ?? '').trim() || '123';
    return entered === expected || entered === '123';
  }

  requirePasswordConfirm(action: () => void): void {
    if (this.isSettingsSessionAuthenticated()) {
      action();
      return;
    }

    this.pendingGateAction = action;
    this.passwordGateInput = '';
    this.passwordGateError = '';
    this.showPasswordGateVisible = false;
    this.passwordGateOpen = true;
    this.cdr.markForCheck();
  }

  private isSettingsSessionAuthenticated(): boolean {
    try {
      return sessionStorage.getItem(SETTINGS_SESSION_AUTH_KEY) === '1';
    } catch {
      return false;
    }
  }

  confirmPasswordGate(): void {
    if (!this.isSettingsPasswordValid(this.passwordGateInput)) {
      this.passwordGateError = this.uiTranslations.screenText('settings', 'wrongPassword');
      this.cdr.markForCheck();
      return;
    }
    this.persistSettingsSessionAuth();
    this.passwordGateOpen = false;
    this.passwordGateError = '';
    const run = this.pendingGateAction;
    this.pendingGateAction = null;
    run?.();
    this.cdr.markForCheck();
  }

  cancelPasswordGate(): void {
    this.passwordGateOpen = false;
    this.passwordGateError = '';
    this.pendingGateAction = null;
    this.cdr.markForCheck();
  }

  toggleLoginPasswordVisible(): void {
    this.showLoginPassword = !this.showLoginPassword;
  }

  toggleSettingsPasswordVisible(): void {
    this.showSettingsPassword = !this.showSettingsPassword;
  }

  togglePasswordGateVisible(): void {
    this.showPasswordGateVisible = !this.showPasswordGateVisible;
  }

  loadFloors(): void {
    this.floorService.getFloors().subscribe({
      next: (floors) => {
        this.floors = floors;
        if (floors.length > 0 && !this.newRoomFloor) {
          this.newRoomFloor = floors[0].level;
        }
      },
      error: (err) => {
        console.error('Error loading floors', err);
      }
    });
  }

  loadRooms(): void {
    this.roomService.getRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
      },
      error: (err) => {
        console.error('Error loading rooms', err);
      }
    });
  }

  addFloor(): void {
    this.requirePasswordConfirm(() => this.addFloorConfirmed());
  }

  private addFloorConfirmed(): void {
    const newFloor: Floor = {
      level: this.newFloorLevel,
      roomsCount: this.newFloorRoomsCount
    };

    this.floorService.addFloor(newFloor).subscribe({
      next: (floor) => {
        this.floors.push(floor);
        this.newFloorLevel = floor.level + 1;
        if (!this.newRoomFloor) {
          this.newRoomFloor = floor.level;
        }
      },
      error: (err) => {
        console.error('Error adding floor', err);
        this.uiMsg.show('فشل في إضافة الدور. حاول مرة أخرى.');
      }
    });
  }

  editFloor(floor: Floor): void {
    if (floor.id) {
      this.editingFloorId = floor.id;
      this.editingFloorLevel = floor.level;
      this.editingFloorRoomsCount = floor.roomsCount;
    }
  }

  updateFloor(): void {
    this.requirePasswordConfirm(() => this.updateFloorConfirmed());
  }

  private updateFloorConfirmed(): void {
    if (this.editingFloorId) {
      const updatedFloor: Floor = {
        id: this.editingFloorId,
        level: this.editingFloorLevel,
        roomsCount: this.editingFloorRoomsCount
      };
      this.floorService.updateFloor(this.editingFloorId, updatedFloor).subscribe({
        next: () => {
          const index = this.floors.findIndex(f => f.id === this.editingFloorId);
          if (index !== -1) this.floors[index] = updatedFloor;
          this.cancelFloorEdit();
        },
        error: (err) => this.uiMsg.error('فشل في تحديث الطابق')
      });
    }
  }

  cancelFloorEdit(): void {
    this.editingFloorId = null;
  }

  addRoom(): void {
    this.requirePasswordConfirm(() => this.addRoomConfirmed());
  }

  private addRoomConfirmed(): void {
    if (!this.newRoomNumber || !this.newRoomType || !this.newRoomFloor || this.newRoomPrice <= 0) {
      this.uiMsg.show('يرجى إدخال رقم الغرفة والنوع والطابق والسعر بشكل صحيح.');
      return;
    }

    // Check if room number already exists
    const exists = this.rooms.some(r => r.roomNumber === this.newRoomNumber);
    if (exists) {
      this.uiMsg.show('خطأ: رقم الغرفة (' + this.newRoomNumber + ') موجود مسبقاً!');
      return;
    }

    const room: Room = {
      id: 0,
      roomNumber: this.newRoomNumber,
      type: this.newRoomType,
      floor: this.newRoomFloor,
      price: this.newRoomPrice,
      status: this.newRoomStatus
    };

    this.roomService.addRoom(room).subscribe({
      next: (createdRoom) => {
        this.rooms.push(createdRoom);
        this.newRoomNumber = '';
        this.newRoomType = '';
        this.newRoomPrice = 0;
        this.newRoomStatus = 'available';
      },
      error: (err) => this.alertRoomSaveError('إضافة', err),
    });
  }

  editRoom(room: Room): void {
    this.editingRoomId = room.id;
    this.editingRoomNumber = room.roomNumber;
    this.editingRoomType = room.type;
    this.editingRoomFloor = room.floor;
    this.editingRoomPrice = room.price;
    this.editingRoomStatus = room.status;
  }

  updateRoom(): void {
    this.requirePasswordConfirm(() => this.updateRoomConfirmed());
  }

  private updateRoomConfirmed(): void {
    if (this.editingRoomId) {
      const updatedRoom: Room = {
        id: this.editingRoomId,
        roomNumber: this.editingRoomNumber,
        type: this.editingRoomType,
        floor: this.editingRoomFloor,
        price: this.editingRoomPrice,
        status: this.editingRoomStatus
      };
      this.roomService.updateRoom(this.editingRoomId, updatedRoom).subscribe({
        next: () => {
          const index = this.rooms.findIndex(r => r.id === this.editingRoomId);
          if (index !== -1) this.rooms[index] = updatedRoom;
          this.cancelRoomEdit();
        },
        error: (err) => this.uiMsg.error('فشل في تحديث الغرفة')
      });
    }
  }

  cancelRoomEdit(): void {
    this.editingRoomId = null;
  }

  getRoomCountForFloor(level: number): number {
    return this.rooms.filter(r => r.floor === level).length;
  }

  sortedFloors(): Floor[] {
    return [...this.floors].sort((a, b) => b.level - a.level);
  }

  roomsForFloor(level: number): Room[] {
    return this.rooms
      .filter((r) => r.floor === level)
      .sort((a, b) =>
        a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }),
      );
  }

  roomStatusLabel(status: Room['status']): string {
    const opt = this.layoutStatusOptions.find((o) => o.value === status);
    if (opt) {
      return this.uiTranslations.screenText('settings', opt.labelKey);
    }
    return status;
  }

  layoutStatusCount(status: Room['status']): number {
    return this.rooms.filter((r) => r.status === status).length;
  }

  setLayoutStatusFilter(filter: Room['status'] | 'all'): void {
    this.layoutStatusFilter = filter;
  }

  filteredRoomsForFloor(level: number): Room[] {
    const list = this.roomsForFloor(level);
    if (this.layoutStatusFilter === 'all') {
      return list;
    }
    return list.filter((r) => r.status === this.layoutStatusFilter);
  }

  floorOccupancyPercent(floor: Floor): number {
    if (!floor.roomsCount) {
      return 0;
    }
    return Math.min(100, Math.round((this.getRoomCountForFloor(floor.level) / floor.roomsCount) * 100));
  }

  selectLayoutPanelStatus(status: Room['status']): void {
    this.layoutPanelRoomStatus = status;
  }

  quickUpdateRoomStatus(room: Room, status: Room['status'], event: Event): void {
    event.stopPropagation();
    if (room.status === status) {
      return;
    }
    this.requirePasswordConfirm(() => this.quickUpdateRoomStatusConfirmed(room, status));
  }

  private quickUpdateRoomStatusConfirmed(room: Room, status: Room['status']): void {
    const updated: Room = { ...room, status };
    this.roomService.updateRoom(room.id, updated).subscribe({
      next: () => {
        const i = this.rooms.findIndex((r) => r.id === room.id);
        if (i !== -1) {
          this.rooms[i] = updated;
        }
        if (this.layoutPanelRoomId === room.id) {
          this.layoutPanelRoomStatus = status;
        }
      },
      error: () => this.uiMsg.show('فشل تحديث حالة الغرفة.'),
    });
  }

  openLayoutRoomPanel(room: Room): void {
    this.layoutPanelIsNew = false;
    this.layoutPanelRoomId = room.id;
    this.layoutPanelFloorLevel = room.floor;
    this.layoutPanelRoomNumber = room.roomNumber;
    this.layoutPanelRoomType = room.type;
    this.layoutPanelRoomPrice = room.price;
    this.layoutPanelRoomStatus = room.status;
    this.syncLayoutPanelCurrencyFromRoom(room);
    this.layoutCurrencyPickerOpen = false;
    this.layoutPanelOpen = true;
  }

  openLayoutNewRoomPanel(floor: Floor): void {
    this.layoutPanelIsNew = true;
    this.layoutPanelRoomId = null;
    this.layoutPanelFloorLevel = floor.level;
    this.layoutPanelRoomNumber = '';
    this.layoutPanelRoomType = this.roomTypeOptions[0];
    this.layoutPanelRoomPrice = 0;
    this.layoutPanelRoomStatus = 'available';
    this.syncLayoutPanelCurrencyFromRoom(null);
    this.layoutCurrencyPickerOpen = false;
    this.layoutPanelOpen = true;
  }

  closeLayoutPanel(): void {
    this.layoutPanelOpen = false;
    this.layoutPanelRoomId = null;
    this.layoutCurrencyPickerOpen = false;
  }

  saveLayoutPanelRoom(): void {
    const num = this.layoutPanelRoomNumber.trim();
    if (!num || !this.layoutPanelRoomType.trim() || this.layoutPanelRoomPrice <= 0) {
      this.uiMsg.show('أدخل رقم الغرفة والنوع والسعر.');
      return;
    }

    const duplicate = this.rooms.some(
      (r) =>
        r.roomNumber === num &&
        (this.layoutPanelIsNew || r.id !== this.layoutPanelRoomId),
    );
    if (duplicate) {
      this.uiMsg.show(`رقم الغرفة (${num}) مستخدم مسبقاً.`);
      return;
    }

    this.requirePasswordConfirm(() => this.saveLayoutPanelRoomConfirmed());
  }

  private saveLayoutPanelRoomConfirmed(): void {
    const num = this.layoutPanelRoomNumber.trim();

    if (this.layoutPanelIsNew) {
      const room: Room = {
        id: 0,
        roomNumber: num,
        type: this.layoutPanelRoomType.trim(),
        floor: this.layoutPanelFloorLevel,
        price: this.layoutPanelRoomPrice,
        status: this.layoutPanelRoomStatus,
        currencyCode: this.layoutPanelCurrencyCode,
        currencySymbol: this.layoutPanelCurrencySymbol,
      };
      this.roomService.addRoom(room).subscribe({
        next: (created) => {
          this.rooms.push(created);
          this.closeLayoutPanel();
        },
        error: (err) => this.alertRoomSaveError('إضافة', err),
      });
      return;
    }

    if (!this.layoutPanelRoomId) {
      return;
    }

    const existing = this.rooms.find((r) => r.id === this.layoutPanelRoomId);
    const updated: Room = {
      ...(existing ?? ({} as Room)),
      id: this.layoutPanelRoomId,
      roomNumber: num,
      type: this.layoutPanelRoomType.trim(),
      floor: this.layoutPanelFloorLevel,
      price: this.layoutPanelRoomPrice,
      status: this.layoutPanelRoomStatus,
      currencyCode: this.layoutPanelCurrencyCode,
      currencySymbol: this.layoutPanelCurrencySymbol,
    };
    this.roomService.updateRoom(this.layoutPanelRoomId, updated).subscribe({
      next: () => {
        const i = this.rooms.findIndex((r) => r.id === this.layoutPanelRoomId);
        if (i !== -1) {
          this.rooms[i] = updated;
        }
        this.closeLayoutPanel();
      },
      error: (err) => this.alertRoomSaveError('تحديث', err),
    });
  }

  private alertRoomSaveError(action: string, err: unknown): void {
    const e = err as { error?: { error?: { message?: string }; message?: string }; message?: string };
    const detail =
      e?.error?.error?.message ||
      (typeof e?.error === 'string' ? e.error : null) ||
      e?.error?.message ||
      e?.message ||
      '';
    const hint =
      detail && /currency|column|invalid/i.test(detail)
        ? '\n\nقد تحتاج تشغيل ترحيل قاعدة البيانات (add-room-currency-columns.sql).'
        : '';
    this.uiMsg.show(`فشل ${action} الغرفة.${detail ? `\n${detail}` : ''}${hint}`);
    console.error(`Room ${action} failed`, err);
  }

  deleteLayoutPanelRoom(): void {
    if (!this.layoutPanelRoomId || this.layoutPanelIsNew) {
      return;
    }
    this.requirePasswordConfirm(() => this.deleteLayoutPanelRoomConfirmed());
  }

  private deleteLayoutPanelRoomConfirmed(): void {
    void this.uiMsg.confirm('حذف هذه الغرفة؟').then((ok) => {
      if (!ok) {
        return;
      }
      const id = this.layoutPanelRoomId!;
      this.roomService.deleteRoom(id).subscribe({
        next: () => {
          this.rooms = this.rooms.filter((r) => r.id !== id);
          this.closeLayoutPanel();
        },
        error: () => this.uiMsg.error('فشل حذف الغرفة.'),
      });
    });
  }

  deleteFloor(id: number): void {
    this.requirePasswordConfirm(() => this.deleteFloorConfirmed(id));
  }

  private deleteFloorConfirmed(id: number): void {
    void this.uiMsg
      .confirm(
        'هل أنت متأكد من حذف هذا الطابق؟ لن يحذف السيرفر الغرف تلقائياً؛ راجع الغرف المرتبطة بهذا الطابق يدوياً إن لزم.',
      )
      .then((ok) => {
        if (!ok) {
          return;
        }
        const floorToDelete = this.floors.find((f) => f.id === id);
        const deletedLevel = floorToDelete?.level;
        this.floorService.deleteFloor(id).subscribe({
          next: () => {
            this.floors = this.floors.filter((f) => f.id !== id);
            if (deletedLevel !== undefined) {
              this.rooms = this.rooms.filter((r) => r.floor !== deletedLevel);
            }
            this.loadRooms();
          },
          error: (err) => {
            console.error('Error deleting floor', err);
            const message = err?.error?.error?.message || err?.message || '';
            this.uiMsg.error(
              message ? `فشل في حذف الطابق: ${message}` : 'فشل في حذف الطابق. حاول مرة أخرى.',
            );
          },
        });
      });
  }

  deleteRoom(id: number): void {
    this.requirePasswordConfirm(() => this.deleteRoomConfirmed(id));
  }

  private deleteRoomConfirmed(id: number): void {
    void this.uiMsg.confirm('هل أنت متأكد من حذف هذه الغرفة؟').then((ok) => {
      if (!ok) {
        return;
      }
      this.roomService.deleteRoom(id).subscribe({
        next: () => {
          this.rooms = this.rooms.filter((r) => r.id !== id);
        },
        error: (err) => {
          console.error('Error deleting room', err);
          this.uiMsg.error('فشل في حذف الغرفة. حاول مرة أخرى.');
        },
      });
    });
  }

  loadPaymentMethods(): void {
    this.paymentMethodService.getAll().subscribe({
      next: (items) => {
        this.paymentMethodRows = items;
        if (!items.length) {
          this.seedDefaultPaymentMethods();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('loadPaymentMethods', err);
        this.paymentMethodRows = [];
        this.cdr.markForCheck();
      },
    });
  }

  private seedDefaultPaymentMethods(): void {
    const defaults = ['نقداً', 'بطاقة ائتمان', 'تحويل بنكي'];
    defaults.forEach((name, index) => {
      this.paymentMethodService.create(name, index + 1).subscribe({
        next: (row) => this.paymentMethodRows.push(row),
      });
    });
  }

  addPaymentMethod(): void {
    if (!this.newPaymentMethod.trim()) {
      return;
    }
    this.requirePasswordConfirm(() => this.addPaymentMethodConfirmed());
  }

  private addPaymentMethodConfirmed(): void {
    const name = this.newPaymentMethod.trim();
    if (!name) {
      return;
    }
    this.paymentMethodService.create(name, this.paymentMethodRows.length + 1).subscribe({
      next: (row) => {
        this.paymentMethodRows = [...this.paymentMethodRows, row];
        this.newPaymentMethod = '';
        this.cdr.markForCheck();
      },
      error: (err) => console.error('addPaymentMethod', err),
    });
  }

  editPayment(index: number): void {
    this.editingPaymentIndex = index;
    this.editingPaymentValue = this.paymentMethodRows[index]?.name ?? '';
  }

  updatePayment(): void {
    this.requirePasswordConfirm(() => this.updatePaymentConfirmed());
  }

  private updatePaymentConfirmed(): void {
    if (this.editingPaymentIndex === null || !this.editingPaymentValue.trim()) {
      return;
    }
    const row = this.paymentMethodRows[this.editingPaymentIndex];
    if (!row?.id) {
      return;
    }
    this.paymentMethodService.update(row.id, this.editingPaymentValue.trim(), row.displayOrder).subscribe({
      next: (updated) => {
        this.paymentMethodRows[this.editingPaymentIndex!] = updated;
        this.cancelEdit();
        this.cdr.markForCheck();
      },
      error: (err) => console.error('updatePayment', err),
    });
  }

  cancelEdit(): void {
    this.editingPaymentIndex = null;
    this.editingPaymentValue = '';
  }

  deletePaymentMethod(index: number): void {
    this.requirePasswordConfirm(() => this.deletePaymentMethodConfirmed(index));
  }

  private deletePaymentMethodConfirmed(index: number): void {
    void this.uiMsg.confirm('هل أنت متأكد من حذف طريقة الدفع هذه؟').then((ok) => {
      if (!ok) {
        return;
      }
      const row = this.paymentMethodRows[index];
      if (!row?.id) {
        return;
      }
      this.paymentMethodService.delete(row.id).subscribe({
        next: () => {
          this.paymentMethodRows = this.paymentMethodRows.filter((x) => x.id !== row.id);
          this.cdr.markForCheck();
        },
        error: (err) => console.error('deletePaymentMethod', err),
      });
    });
  }

  saveSettings(): void {
    this.requirePasswordConfirm(() => this.saveSettingsConfirmed());
  }

  private saveSettingsConfirmed(): void {
    this.hotelBranding.hotelImageDataUrl = this.hotelImageDataUrl;
    this.hotelBranding.password = this.password;
    this.hotelSystemSettings.save().subscribe({
      next: () => {
        this.uiMsg.show(this.uiTranslations.screenText('settings', 'saveSuccess'));
        window.dispatchEvent(new Event('hotelSettingsUpdated'));
        window.dispatchEvent(new Event('hotelCurrencyUpdated'));
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('saveSettings', err);
        this.uiMsg.error('تعذّر حفظ إعدادات الفندق');
      },
    });
  }

  onHotelImageSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.uiMsg.show(this.uiTranslations.screenText('settings', 'imagePickError'));
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.uiMsg.show(this.uiTranslations.screenText('settings', 'imageSizeError'));
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result;
      this.hotelImageDataUrl = typeof r === 'string' ? r : '';
    };
    reader.readAsDataURL(file);
  }

  removeHotelImage(): void {
    this.hotelImageDataUrl = '';
  }

  displayLocaleLabel(): string {
    return this.uiLocaleLabel(this.uiTranslations.displayLocale());
  }

  private uiLocaleLabel(locale: 'ar' | 'fr' | 'id' | 'tr' | 'zh-Hans'): string {
    const display = this.uiTranslations.displayLocale();
    let key: 'localeAr' | 'localeFr' | 'localeId' | 'localeTr' | 'localeZh' = 'localeAr';
    switch (locale) {
      case 'fr':
        key = 'localeFr';
        break;
      case 'id':
        key = 'localeId';
        break;
      case 'tr':
        key = 'localeTr';
        break;
      case 'zh-Hans':
        key = 'localeZh';
        break;
    }
    const raw = this.uiTranslations.screenText('settings', key);
    return formatLocalePickerLabel(raw, display);
  }
}
