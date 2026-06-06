import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { distinctUntilChanged, finalize, forkJoin, fromEvent, map } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BookingService } from '../services/booking.service';
import { GuestRegistryService } from '../services/guest-registry.service';
import { RoomService } from '../services/room.service';
import { IdentityTypeService } from '../services/identity-type.service';
import {
  GeneralCodesService,
  type GeneralCodeItem,
} from '../general-codes/general-codes.service';
import { Booking } from '../models/booking.model';
import { Room } from '../models/room.model';
import { IdentityType } from '../models/identity-type.model';
import { UiTranslationsService } from '../services/ui-translations.service';
import { UiMessageService } from '../services/ui-message.service';
import { HotelCurrencyService } from '../services/hotel-currency.service';
import { PaymentMethodService } from '../services/payment-method.service';
import { bindUiTranslationRefresh } from '../utils/ui-screen-i18n.helper';
import { todayLocalDateString, toDateOnlyString } from '../utils/date-only';
import { parseRoomFeatures, roomFeaturesSummary } from '../utils/room-features.util';
import { HotelAuthService } from '../services/hotel-auth.service';
import { ArabicPreferenceCategoryService } from '../services/arabic-preference-category.service';
import { localePhoneDisplay, type LocalePhoneDisplay } from '../utils/locale-phone';
import {
  ID_NUMBER_FIXED_LENGTH,
  identityRequiresTwelveDigits,
} from '../utils/identity-number-rules';
import { formatAbpRequestError, mapBookingFromApi } from '../utils/booking-api-map.util';
import {
  findReservedBookingForCheckIn,
  guestFullName,
  splitGuestFullName,
  syncBookingOccupancyCounts,
} from '../utils/booking-display.util';
import {
  filterKnownGuests,
  mergeKnownGuestSources,
  type KnownGuestProfile,
} from '../utils/guest-picker.util';
import {
  type BookingPickedRoom,
  consumePickedRoom,
  normalizeRoomNumber,
  roomsMatchNumber,
  saveBookingPickRoomReturnUrl,
} from '../utils/booking-room-pick.util';
import { pushRecentRoomTransfer } from '../utils/room-transfer-display.util';
import { LocaleNumberPipe } from '../shared/pipes/locale-number.pipe';
import { bookingNotifyParams } from '../utils/booking-notify-params.util';
import {
  BOOKING_KIND_OPTIONS,
  BOOKING_SOURCE_OPTIONS,
  type BookingKindId,
  isBookingKindId,
} from '../utils/booking-meta.options';
import {
  applyPriceCodeDiscount,
  formatPriceCodeWithDiscountLabel,
  parsePriceCodeDiscountPercent,
  priceCodeDiscountPercentForName,
  priceCodeDiscountPercentLabel,
} from '../utils/price-code.util';
import {
  buildGuestRegistryFromCheckIn,
  emptyGuestProfile,
  GUEST_GENDER_OPTIONS,
  guestProfileToBookingNameParts,
  guestProfileToRegistry,
  guestRegistryToProfile,
  parseGuestProfileFromNotes,
  stripGuestProfileFromNotes,
  type GuestProfileDetails,
} from '../utils/guest-profile.util';

export { BOOKING_KIND_OPTIONS };

const TRANSFER_ROOM_STORAGE_KEY = 'hotelTransferRoomBooking';
const EDIT_BOOKING_STORAGE_KEY = 'hotelEditBooking';
export const CHECKIN_BOOKING_STORAGE_KEY = 'hotelCheckInBooking';
export const ADD_GUEST_BOOKING_STORAGE_KEY = 'hotelAddGuestBooking';

@Component({
  selector: 'app-booking-form',
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, LocaleNumberPipe],
})
export class BookingFormComponent implements OnInit {
  readonly ui = inject(UiTranslationsService);
  private readonly arabicPref = inject(ArabicPreferenceCategoryService);
  private readonly uiMsg = inject(UiMessageService);
  private readonly hotelAuth = inject(HotelAuthService);
  private readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  bookingForm: FormGroup;
  loading = false;
  /** تحميل بيانات حجز للتسكين — يمنع الحفظ قبل ربط الحجز الأصلي */
  checkInPrefillBusy = false;
  submitted = false;
  private bookingsCache: Booking[] = [];
  success = false;
  /** وضع نقل غرفة من سجلات الحجز */
  transferRoomMode = false;
  /** وضع تعديل حجز موجود من سجلات الحجز */
  editBookingMode = false;
  /** حجز غرفة إضافية لنفس النزيل (غرفة مختلفة) */
  addGuestBookingMode = false;
  /** حجز مسبق باسم فقط (من قسم الحجوزات) */
  reservationMode = false;
  /** تسكين نزيل قادم من حجز مسبق (المكتب الأمامية) */
  checkInMode = false;
  /** تسكين مباشر — نزيل جديد دون حجز مسبق (من القائمة الجانبية) */
  walkInCheckInMode = false;
  /** تمديد إقامة من المقيمون (نفس واجهة checkIn مع بيانات محمّلة) */
  extendStayMode = false;
  /** حجز مسبق مع دفعة مقدمة */
  advanceDepositMode = false;
  bookingKindPickerOpen = false;
  /** للعرض في القالب */
  transferCurrentRoomNumber: string | null = null;
  editBookingInvoice: string | null = null;
  checkInBookingInvoice: string | null = null;
  private existingBookingId: number | null = null;
  private initialRoomNumber: string | null = null;
  private savedCurrencyCode = 'YER';
  private savedCurrencySymbol = 'YR';
  private savedBookingStatus = 'active';
  availableRooms: Room[] = [];
  selectedRoom?: Room;
  paymentMethods: string[] = [];
  identityTypes: IdentityType[] = [];
  /** بادئة الهاتف حسب لغة الواجهة النشطة */
  phoneDisplay: LocalePhoneDisplay = localePhoneDisplay('ar');
  idNumberMaxLength = ID_NUMBER_FIXED_LENGTH;
  idNumberHint = '';
  /** يُعاد تطبيقه بعد تحميل أنواع الهوية (حجز إضافي لنفس النزيل) */
  private pendingGuestIdentity: { id_Number: string; id_Type: string } | null = null;

  /** تسكين مباشر — اختيار نزيل من السجل */
  guestPickerOpen = false;
  guestPickerLoading = false;
  knownGuests: KnownGuestProfile[] = [];

  /** حجز مسبق — نموذج بيانات النزيل التفصيلية */
  guestProfileModalOpen = false;
  guestProfileSubmitted = false;
  guestProfileSaving = false;
  guestProfileForm: FormGroup;
  private guestProfileSnapshot: GuestProfileDetails | null = null;
  private guestProfileRegistryId: number | null = null;
  readonly guestGenderOptions = GUEST_GENDER_OPTIONS;

  /** قوائم المدخلات (ترميزات عامة) — صفحة التسكين */
  purposeOfStayOptions: GeneralCodeItem[] = [];
  relationshipTypeOptions: GeneralCodeItem[] = [];
  priceCodeOptions: GeneralCodeItem[] = [];
  guestCodingOptionsLoading = false;
  private guestCodingPersistBusy = false;

  /** القيم الافتراضية عند فتح التسكين (إن وُجدت في المدخلات) */
  private readonly defaultGuestCodingByField = {
    purpose_Of_Stay: 'سياحة وترفيه',
    relationship_Type: 'نزيل',
    price_Code: 'سعر الافراد',
  } as const;

  stars = Array.from({ length: 50 }, () => ({
    top: Math.random() * 100,
    left: Math.random() * 100,
    delay: Math.random() * 5
  }));

  constructor(
    private fb: FormBuilder,
    private bookingService: BookingService,
    private roomService: RoomService,
    private identityService: IdentityTypeService,
    private guestRegistryService: GuestRegistryService,
    private generalCodesService: GeneralCodesService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.bookingForm = this.fb.group({
      first_Name: ['', [Validators.required]],
      last_Name: ['', [Validators.required]],
      phone_Number: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(15),
        Validators.pattern('^[0-9]+$'),
      ]],
      payment_Amount: ['', [Validators.required]],
      id_Number: ['', [Validators.required]],
      id_Type: ['', [Validators.required]],
      room_Type: ['', [Validators.required]],
      room_Number: ['', [Validators.required]],
      floor: ['', [Validators.required]],
      booking_Date: ['', [Validators.required]],
      booking_Time: ['', [Validators.required]],
      bookingDateTime: [''],
      payment_Method: ['', [Validators.required]],
      people_Count: [1, [Validators.required, Validators.min(1)]],
      adults_Count: [1, [Validators.required, Validators.min(1)]],
      children_Count: [0, [Validators.min(0)]],
      stay_Days: [1, [Validators.required, Validators.min(1)]],
      invoice_Number: [{ value: '', disabled: true }],
      total_Price: [{ value: 0, disabled: true }],
      remaining_Amount: [{ value: 0, disabled: true }],
      guest_Notes: [''],
      booking_Confirmed: [true, [Validators.required]],
      booking_Source: ['direct', [Validators.required]],
      booking_Kind: ['confirmed' as BookingKindId, [Validators.required]],
      guest_Full_Name: [''],
      purpose_Of_Stay: [''],
      relationship_Type: [''],
      price_Code: [''],
    });
    this.guestProfileForm = this.fb.group({
      first_Name: ['', [Validators.required]],
      middle_Name: [''],
      last_Name: ['', [Validators.required]],
      phone_Number: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(15), Validators.pattern('^[0-9]+$')]],
      gender: ['', [Validators.required]],
      nationality: ['', [Validators.required]],
      country: ['', [Validators.required]],
      birth_Date: ['', [Validators.required]],
      id_Type: ['', [Validators.required]],
      id_Issuing_Country: ['', [Validators.required]],
      id_Number: ['', [Validators.required]],
    });
  }

  readonly bookingKindOptions = BOOKING_KIND_OPTIONS;
  readonly bookingSourceOptions = BOOKING_SOURCE_OPTIONS;

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    this.loadAvailableRooms();
    this.loadPaymentMethods();
    this.setupIdValidation();
    this.setupGuestProfileIdValidation();
    this.loadIdentityTypes();
    this.setupFinancialCalculations();
    this.setupPeopleCountSync();
    this.syncPhoneDisplayFromLocale();
    fromEvent(window, 'hotelUiLocaleChanged')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPhoneDisplayFromLocale());
    fromEvent(window, 'hotelArabicCategoryChanged')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPhoneDisplayFromLocale());

    this.route.queryParamMap
      .pipe(
        map(
          (p) =>
            `${p.get('mode') ?? ''}|${p.get('walkIn') ?? ''}|${p.get('bookingId') ?? ''}`,
        ),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.initFromRoute());
  }

  /** يُعاد عند تغيير queryParams (حجز ↔ تسكين) دون إعادة تحميل الصفحة */
  private initFromRoute(): void {
    this.resetBookingModes();
    const mode = this.route.snapshot.queryParamMap.get('mode');

    if (mode === 'transferRoom') {
      this.initPrefilledBooking(TRANSFER_ROOM_STORAGE_KEY, 'transfer');
    } else if (mode === 'editBooking') {
      this.initPrefilledBooking(EDIT_BOOKING_STORAGE_KEY, 'edit');
    } else if (mode === 'addGuestBooking') {
      this.initAddGuestBooking();
    } else if (mode === 'checkIn') {
      try {
        this.extendStayMode = sessionStorage.getItem('hotelExtendStayIntent') === '1';
        sessionStorage.removeItem('hotelExtendStayIntent');
      } catch {
        this.extendStayMode = false;
      }
      const walkIn = this.route.snapshot.queryParamMap.get('walkIn') === '1';
      if (walkIn) {
        if (!this.initWalkInCheckInFromStorage()) {
          const bookingId = Number(this.route.snapshot.queryParamMap.get('bookingId'));
          if (bookingId > 0) {
            this.loadCheckInBookingById(bookingId);
          } else {
            this.enterWalkInCheckInMode();
          }
        }
      } else {
        this.initPrefilledBooking(CHECKIN_BOOKING_STORAGE_KEY, 'checkIn');
        if (!this.checkInMode) {
          this.enterWalkInCheckInMode();
        }
      }
    } else {
      this.enterReservationMode();
    }
    if (mode === 'checkIn') {
      this.refreshBookingsCache();
      this.loadGuestCodingOptions();
    }
    this.syncBookingKindFromModes();
    this.cdr.markForCheck();
  }

  /** قوائم أغراض الإقامة / العلاقة / رمز السعر — تظهر في التسكين فقط */
  get showGuestCodingFields(): boolean {
    return this.checkInMode || this.walkInCheckInMode;
  }

  /** إظهار القوائم بعد تحميل المدخلات وتعيين القيم حتى لا يظهر «اختر» */
  get guestCodingFieldsReady(): boolean {
    return (
      !this.guestCodingOptionsLoading &&
      this.purposeOfStayOptions.length > 0 &&
      this.relationshipTypeOptions.length > 0 &&
      this.priceCodeOptions.length > 0
    );
  }

  /** تسمية حقل الغرفة: فئات الغرف في التسكين، نوع الغرفة في باقي الأوضاع */
  get roomTypeFieldLabelKey(): string {
    return this.showGuestCodingFields ? 'roomCategoryLabel' : 'roomTypeLabel';
  }

  private loadGuestCodingOptions(): void {
    if (this.guestCodingOptionsLoading) {
      return;
    }
    this.guestCodingOptionsLoading = true;
    forkJoin({
      purposes: this.generalCodesService.getList('purposes-of-stay'),
      relationships: this.generalCodesService.getList('relationship-types'),
      priceCodes: this.generalCodesService.getList('preference-type'),
    })
      .pipe(
        finalize(() => {
          this.guestCodingOptionsLoading = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ purposes, relationships, priceCodes }) => {
          this.purposeOfStayOptions = this.sortGeneralCodeOptions(purposes);
          this.relationshipTypeOptions = this.sortGeneralCodeOptions(relationships);
          this.priceCodeOptions = this.sortGeneralCodeOptions(priceCodes);
          this.applyDefaultGuestCodingIfEmpty();
          this.calculateFinances();
        },
        error: () => {
          this.purposeOfStayOptions = [];
          this.relationshipTypeOptions = [];
          this.priceCodeOptions = [];
        },
      });
  }

  private sortGeneralCodeOptions(items: GeneralCodeItem[]): GeneralCodeItem[] {
    return [...items].sort((a, b) => {
      const ao = Number(a.displayOrder ?? 0);
      const bo = Number(b.displayOrder ?? 0);
      if (ao !== bo) {
        return ao - bo;
      }
      return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ar');
    });
  }

  private ensureDefaultIdTypeIfEmpty(loadedTypes: IdentityType[]): void {
    const current = String(this.bookingForm.get('id_Type')?.value ?? '').trim();
    if (current) {
      return;
    }
    const first =
      (loadedTypes.length > 0 ? loadedTypes[0].name : this.defaultIdentityTypes[0].name) ?? '';
    if (first) {
      this.bookingForm.patchValue({ id_Type: first }, { emitEvent: false });
    }
  }

  private pickDefaultCodingValue(options: GeneralCodeItem[], preferred: string): string {
    const names = options.map((x) => String(x.name ?? '').trim()).filter(Boolean);
    if (!names.length) {
      return '';
    }
    const pref = preferred.trim();
    if (pref && names.includes(pref)) {
      return pref;
    }
    return names[0];
  }

  /** عند التسكين: تعبئة القيم الأولى كما في الصورة إذا الحقول فارغة */
  private applyDefaultGuestCodingIfEmpty(): void {
    if (!this.showGuestCodingFields) {
      return;
    }
    const raw = this.bookingForm.getRawValue();
    const patch: {
      purpose_Of_Stay?: string;
      relationship_Type?: string;
      price_Code?: string;
    } = {};

    if (!String(raw.purpose_Of_Stay ?? '').trim()) {
      patch.purpose_Of_Stay = this.pickDefaultCodingValue(
        this.purposeOfStayOptions,
        this.defaultGuestCodingByField.purpose_Of_Stay,
      );
    }
    if (!String(raw.relationship_Type ?? '').trim()) {
      patch.relationship_Type = this.pickDefaultCodingValue(
        this.relationshipTypeOptions,
        this.defaultGuestCodingByField.relationship_Type,
      );
    }
    if (!String(raw.price_Code ?? '').trim()) {
      patch.price_Code = this.pickDefaultCodingValue(
        this.priceCodeOptions,
        this.defaultGuestCodingByField.price_Code,
      );
    }

    if (Object.keys(patch).length) {
      this.bookingForm.patchValue(patch, { emitEvent: false });
      this.cdr.markForCheck();
    }
  }

  onGuestCodingFieldChange(): void {
    if (!this.showGuestCodingFields) {
      return;
    }
    this.calculateFinances();
    this.persistGuestRegistryCodingFields(false);
  }

  private persistGuestRegistryCodingFields(showSuccessToast: boolean): void {
    if (!this.showGuestCodingFields || this.guestCodingPersistBusy) {
      return;
    }
    const payload = buildGuestRegistryFromCheckIn(
      this.bookingForm.getRawValue() as Record<string, unknown>,
      this.guestProfileSnapshot,
      this.guestProfileRegistryId,
    );
    if (!payload) {
      return;
    }
    const hasCoding = !!(
      payload.purpose_Of_Stay?.trim() ||
      payload.relationship_Type?.trim() ||
      payload.price_Code?.trim()
    );
    if (!hasCoding) {
      return;
    }

    this.guestCodingPersistBusy = true;
    this.guestRegistryService
      .saveProfile(payload)
      .pipe(
        finalize(() => {
          this.guestCodingPersistBusy = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          this.guestProfileRegistryId = saved.id ?? this.guestProfileRegistryId;
          this.guestProfileSnapshot = guestRegistryToProfile(saved);
          if (showSuccessToast) {
            this.uiMsg.success(this.ui.screenText('booking', 'guestCodingSaved'));
          }
        },
        error: () => {
          /* لا نعيق التسكين — الحفظ يُعاد عند إتمام التسكين */
        },
      });
  }

  private loadGuestCodingFromRegistry(idNumber: string): void {
    const idn = idNumber.trim();
    if (!idn) {
      return;
    }
    this.guestRegistryService
      .getGuests()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (guests) => {
          const match = guests.find((g) => (g.id_Number ?? '').trim() === idn);
          if (!match) {
            return;
          }
          this.guestProfileRegistryId = match.id ?? this.guestProfileRegistryId;
          if (match.id) {
            this.guestProfileSnapshot = guestRegistryToProfile(match);
          }
          const patch: Record<string, string> = {};
          const purpose = String(match.purpose_Of_Stay ?? '').trim();
          const relationship = String(match.relationship_Type ?? '').trim();
          const priceCode = String(match.price_Code ?? '').trim();
          if (purpose) {
            patch['purpose_Of_Stay'] = purpose;
          }
          if (relationship) {
            patch['relationship_Type'] = relationship;
          }
          if (priceCode) {
            patch['price_Code'] = priceCode;
          }
          if (Object.keys(patch).length) {
            this.bookingForm.patchValue(patch, { emitEvent: false });
          }
          this.applyDefaultGuestCodingIfEmpty();
          this.cdr.markForCheck();
        },
      });
  }

  private resetBookingModes(): void {
    this.checkInPrefillBusy = false;
    this.transferRoomMode = false;
    this.editBookingMode = false;
    this.addGuestBookingMode = false;
    this.reservationMode = false;
    this.checkInMode = false;
    this.walkInCheckInMode = false;
    this.extendStayMode = false;
    this.advanceDepositMode = false;
    this.bookingKindPickerOpen = false;
    this.transferCurrentRoomNumber = null;
    this.editBookingInvoice = null;
    this.checkInBookingInvoice = null;
    this.existingBookingId = null;
    this.initialRoomNumber = null;
    this.pendingGuestIdentity = null;
    this.guestProfileModalOpen = false;
    this.guestProfileSubmitted = false;
    this.guestProfileSnapshot = null;
    this.guestProfileRegistryId = null;
    this.guestProfileSaving = false;
    this.submitted = false;
    this.success = false;
  }

  private enterReservationMode(confirmed = true, advanceDeposit = false): void {
    this.checkInPrefillBusy = false;
    this.checkInMode = false;
    this.walkInCheckInMode = false;
    this.advanceDepositMode = advanceDeposit;
    this.reservationMode = true;
    try {
      sessionStorage.removeItem(CHECKIN_BOOKING_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    if (advanceDeposit) {
      this.applyAdvanceDepositValidators();
    } else {
      this.applyReservationValidators();
    }
    this.applyUnifiedGuestNameValidators();
    this.syncGuestFullNameFromNameParts();
    this.setCurrentDateTime();
    if (!String(this.bookingForm.get('invoice_Number')?.value ?? '').trim()) {
      this.generateInvoiceNumber();
    }
    this.bookingForm.patchValue(
      { booking_Confirmed: confirmed, booking_Source: 'direct' },
      { emitEvent: false },
    );
    this.syncBookingKindFromModes();
    this.loadKnownGuestsForPicker();
    this.loadGuestCodingOptions();
  }

  private enterWalkInCheckInMode(): void {
    this.checkInPrefillBusy = false;
    this.reservationMode = false;
    this.advanceDepositMode = false;
    this.checkInMode = true;
    this.walkInCheckInMode = true;
    this.restoreFullBookingValidators();
    this.applyWalkInNameValidators();
    this.setCurrentDateTime();
    if (
      !this.checkInBookingInvoice &&
      !String(this.bookingForm.get('invoice_Number')?.value ?? '').trim()
    ) {
      this.generateInvoiceNumber();
    }
    this.bookingForm.patchValue(
      {
        id_Type: 'جواز سفر',
        booking_Confirmed: true,
        booking_Source: 'direct',
        guest_Full_Name: '',
        first_Name: '',
        last_Name: '',
      },
      { emitEvent: false },
    );
    this.loadKnownGuestsForPicker();
    this.loadGuestCodingOptions();
    this.applyWalkInMetaFieldValidators();
    this.syncBookingKindFromModes();
  }

  /** تسكين مباشر — أيام ومصدر الحجز اختياريان في الشريط العلوي */
  private applyWalkInMetaFieldValidators(): void {
    const source = this.bookingForm.get('booking_Source');
    source?.clearValidators();
    source?.updateValueAndValidity({ emitEvent: false });
  }

  /** تسكين حجز مسبق — واجهة walkIn مع بيانات النزيل المحفوظة من البطاقة */
  private initWalkInCheckInFromStorage(): boolean {
    try {
      const raw = sessionStorage.getItem(CHECKIN_BOOKING_STORAGE_KEY);
      if (!raw) {
        return false;
      }
      const booking = mapBookingFromApi(JSON.parse(raw) as Record<string, unknown>);
      this.setupWalkInCheckInFromBooking(booking);
      return true;
    } catch {
      return false;
    }
  }

  /** استرجاع حجز للتسكين عند فقدان sessionStorage (مثلاً إعادة فتح التبويب) */
  private loadCheckInBookingById(id: number): void {
    this.checkInPrefillBusy = true;
    this.bookingService.getBookings().subscribe({
      next: (list) => {
        this.bookingsCache = list;
        const booking = list.find((b) => b.id === id);
        if (!booking) {
          this.checkInPrefillBusy = false;
          this.enterWalkInCheckInMode();
          this.cdr.markForCheck();
          return;
        }
        this.setupWalkInCheckInFromBooking(booking);
        this.checkInPrefillBusy = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.checkInPrefillBusy = false;
        this.enterWalkInCheckInMode();
        this.cdr.markForCheck();
      },
    });
  }

  private setupWalkInCheckInFromBooking(booking: Booking): void {
    this.checkInPrefillBusy = false;
    this.checkInMode = true;
    this.walkInCheckInMode = true;
    this.checkInBookingInvoice = (booking.invoice_Number ?? '').trim() || null;
    this.existingBookingId = booking.id ?? null;
    this.initialRoomNumber = (booking.room_Number ?? '').trim() || null;
    this.savedCurrencyCode = booking.currencyCode?.trim() || 'YER';
    this.savedCurrencySymbol = booking.currencySymbol?.trim() || 'YR';
    this.savedBookingStatus = booking.status?.trim() || 'reserved';
    this.applyWalkInNameValidators();
    this.applyExistingBooking(booking);
    if (this.existingBookingId) {
      this.applyCheckInFromExistingBookingValidators();
    } else {
      this.restoreFullBookingValidators();
    }
    const fullName = guestFullName(booking);
    if (fullName) {
      this.bookingForm.patchValue({ guest_Full_Name: fullName }, { emitEvent: false });
    }
    this.syncRoomSelectionAfterPrefill();
    this.loadKnownGuestsForPicker();
    this.loadGuestCodingOptions();
    this.applyWalkInMetaFieldValidators();
    this.syncBookingKindFromModes();
  }

  get filteredKnownGuests(): KnownGuestProfile[] {
    const q = String(this.bookingForm.get('guest_Full_Name')?.value ?? '').trim();
    return filterKnownGuests(this.knownGuests, q);
  }

  private refreshBookingsCache(): void {
    this.bookingService.getBookings().subscribe({
      next: (list) => {
        this.bookingsCache = list;
        this.cdr.markForCheck();
      },
      error: () => {
        this.bookingsCache = [];
      },
    });
  }

  private loadKnownGuestsForPicker(): void {
    if (this.guestPickerLoading) {
      return;
    }
    this.guestPickerLoading = true;
    forkJoin({
      registry: this.guestRegistryService.getGuests(),
      bookings: this.bookingService.getBookings(),
    }).subscribe({
      next: ({ registry, bookings }) => {
        this.bookingsCache = bookings;
        this.knownGuests = mergeKnownGuestSources(registry, bookings);
        this.guestPickerLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.bookingService.getBookings().subscribe({
          next: (list) => {
            this.bookingsCache = list;
            this.knownGuests = mergeKnownGuestSources([], list);
            this.guestPickerLoading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.knownGuests = [];
            this.guestPickerLoading = false;
            this.cdr.markForCheck();
          },
        });
      },
    });
  }

  toggleGuestPicker(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.guestPickerOpen = !this.guestPickerOpen;
    if (this.guestPickerOpen && !this.knownGuests.length && !this.guestPickerLoading) {
      this.loadKnownGuestsForPicker();
    }
    this.cdr.markForCheck();
  }

  onGuestNameFieldFocus(): void {
    if (!this.guestPickerOpen) {
      this.guestPickerOpen = true;
      if (!this.knownGuests.length && !this.guestPickerLoading) {
        this.loadKnownGuestsForPicker();
      }
    }
    this.cdr.markForCheck();
  }

  onGuestNameFieldInput(): void {
    if (!this.guestPickerOpen) {
      this.guestPickerOpen = true;
      if (!this.knownGuests.length && !this.guestPickerLoading) {
        this.loadKnownGuestsForPicker();
      }
    }
    this.cdr.markForCheck();
  }

  openGuestProfileModal(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.guestPickerOpen = false;
    this.guestProfileSubmitted = false;
    this.populateGuestProfileForm();
    this.guestProfileModalOpen = true;
    this.cdr.markForCheck();
  }

  closeGuestProfileModal(): void {
    this.guestProfileModalOpen = false;
    this.guestProfileSubmitted = false;
    this.cdr.markForCheck();
  }

  confirmGuestProfileModal(): void {
    this.guestProfileSubmitted = true;
    this.guestProfileForm.markAllAsTouched();
    if (this.guestProfileForm.invalid || this.guestProfileSaving) {
      this.uiMsg.warning(this.guestProfileValidationMessage);
      this.scrollGuestProfileModalToTop();
      this.cdr.markForCheck();
      return;
    }
    const raw = this.guestProfileForm.getRawValue() as GuestProfileDetails;
    const profile: GuestProfileDetails = {
      ...emptyGuestProfile(),
      ...raw,
      registry_Id: this.guestProfileRegistryId ?? undefined,
      first_Name: String(raw.first_Name ?? '').trim(),
      middle_Name: String(raw.middle_Name ?? '').trim(),
      last_Name: String(raw.last_Name ?? '').trim(),
      phone_Number: String(raw.phone_Number ?? '').trim(),
      gender: String(raw.gender ?? '').trim(),
      nationality: String(raw.nationality ?? '').trim(),
      country: String(raw.country ?? '').trim(),
      birth_Date: String(raw.birth_Date ?? '').trim(),
      id_Type: String(raw.id_Type ?? '').trim(),
      id_Issuing_Country: String(raw.id_Issuing_Country ?? '').trim(),
      id_Number: String(raw.id_Number ?? '').trim(),
    };
    const bookingRaw = this.bookingForm.getRawValue() as Record<string, unknown>;
    profile.purpose_Of_Stay = String(bookingRaw['purpose_Of_Stay'] ?? profile.purpose_Of_Stay ?? '').trim();
    profile.relationship_Type = String(
      bookingRaw['relationship_Type'] ?? profile.relationship_Type ?? '',
    ).trim();
    profile.price_Code = String(bookingRaw['price_Code'] ?? profile.price_Code ?? '').trim();
    this.guestProfileSaving = true;
    this.guestRegistryService
      .saveProfile(guestProfileToRegistry(profile, this.guestProfileRegistryId))
      .pipe(
        finalize(() => {
          this.guestProfileSaving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (saved) => {
          this.guestProfileRegistryId = saved.id ?? null;
          this.guestProfileSnapshot = guestRegistryToProfile(saved);
          this.applyGuestProfileToBookingForm(this.guestProfileSnapshot);
          this.uiMsg.success(this.ui.screenText('booking', 'guestProfileSaveSuccess'));
          this.loadKnownGuestsForPicker();
          this.guestProfileModalOpen = false;
          this.guestProfileSubmitted = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.uiMsg.error(this.formatGuestProfileSaveError(err));
        },
      });
  }

  get guestProfileValidationMessage(): string {
    if (!this.guestProfileSubmitted || !this.guestProfileForm.invalid) {
      return '';
    }
    const idCtrl = this.guestProfileForm.get('id_Number');
    if (idCtrl?.hasError('minlength') || idCtrl?.hasError('maxlength') || idCtrl?.hasError('pattern')) {
      return this.ui
        .screenText('booking', 'idNumberExactLength')
        .replace('{n}', String(ID_NUMBER_FIXED_LENGTH));
    }
    return this.ui.screenText('booking', 'guestProfileFormInvalid');
  }

  private formatGuestProfileSaveError(err: unknown): string {
    const abp = formatAbpRequestError(err);
    if (abp) {
      return abp;
    }
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { error?: { message?: string; details?: string } } | string | null;
      const nested = typeof body === 'object' && body?.error ? body.error : null;
      const msg = (nested?.message ?? nested?.details ?? (typeof body === 'string' ? body : '')).trim();
      if (msg) {
        if (/AppGuestRegistries|Invalid object name/i.test(msg)) {
          return this.ui.screenText('booking', 'guestProfileSaveDbMissing');
        }
        return msg;
      }
      if (err.status === 0) {
        return this.ui.screenText('booking', 'guestProfileSaveOffline');
      }
      if (err.status === 404) {
        return this.ui.screenText('booking', 'guestProfileSaveNotFound');
      }
      if (err.status >= 500) {
        return this.ui.screenText('booking', 'guestProfileSaveServer');
      }
    }
    return this.ui.screenText('booking', 'guestProfileSaveError');
  }

  private scrollGuestProfileModalToTop(): void {
    const el = document.querySelector('.gp-modal-body');
    if (el instanceof HTMLElement) {
      el.scrollTop = 0;
    }
  }

  private setupGuestProfileIdValidation(): void {
    this.guestProfileForm
      .get('id_Type')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((idType: string) => {
        this.updateGuestProfileIdValidation(String(idType ?? ''));
      });
    const current = this.guestProfileForm.get('id_Type')?.value;
    if (current) {
      this.updateGuestProfileIdValidation(String(current));
    }
  }

  private updateGuestProfileIdValidation(idType: string): void {
    const idControl = this.guestProfileForm.get('id_Number');
    if (!idControl) {
      return;
    }
    const twelve = identityRequiresTwelveDigits(idType);
    if (twelve) {
      this.idNumberHint = this.ui
        .screenText('booking', 'idNumberExactLength')
        .replace('{n}', String(ID_NUMBER_FIXED_LENGTH));
      this.idNumberMaxLength = ID_NUMBER_FIXED_LENGTH;
      idControl.setValidators([
        Validators.required,
        Validators.minLength(ID_NUMBER_FIXED_LENGTH),
        Validators.maxLength(ID_NUMBER_FIXED_LENGTH),
        Validators.pattern('^[0-9]{12}$'),
      ]);
    } else {
      idControl.setValidators([
        Validators.required,
        Validators.maxLength(ID_NUMBER_FIXED_LENGTH),
        Validators.pattern('^[0-9]+$'),
      ]);
    }
    idControl.updateValueAndValidity({ emitEvent: false });
  }

  private applyGuestProfileToBookingForm(profile: GuestProfileDetails): void {
    const parts = guestProfileToBookingNameParts(profile);
    this.bookingForm.patchValue(
      {
        guest_Full_Name: parts.guest_Full_Name,
        first_Name: parts.first_Name,
        last_Name: parts.last_Name,
        phone_Number: profile.phone_Number,
        id_Type: profile.id_Type,
        id_Number: profile.id_Number,
        purpose_Of_Stay: profile.purpose_Of_Stay ?? '',
        relationship_Type: profile.relationship_Type ?? '',
        price_Code: profile.price_Code ?? '',
      },
      { emitEvent: false },
    );
    if (profile.id_Type || profile.id_Number) {
      this.applyGuestIdentityFields(profile.id_Type, profile.id_Number);
    }
  }

  private populateGuestProfileForm(): void {
    const fromSnapshot = this.guestProfileSnapshot;
    const fromNotes = parseGuestProfileFromNotes(
      String(this.bookingForm.get('guest_Notes')?.value ?? ''),
    );
    const base = fromSnapshot ?? fromNotes;
    if (base) {
      this.guestProfileRegistryId = base.registry_Id ?? this.guestProfileRegistryId;
      this.guestProfileForm.patchValue(base, { emitEvent: false });
      this.updateGuestProfileIdValidation(String(base.id_Type ?? ''));
      this.ensureGuestProfileSelectDefaults();
      return;
    }
    const full = String(this.bookingForm.get('guest_Full_Name')?.value ?? '').trim();
    const first = String(this.bookingForm.get('first_Name')?.value ?? '').trim();
    const last = String(this.bookingForm.get('last_Name')?.value ?? '').trim();
    const split = full ? splitGuestFullName(full) : { first: first, last: last };
    this.guestProfileForm.patchValue(
      {
        ...emptyGuestProfile(),
        first_Name: first || split.first,
        last_Name: last || split.last,
        phone_Number: String(this.bookingForm.get('phone_Number')?.value ?? '').trim(),
        id_Type: String(this.bookingForm.get('id_Type')?.value ?? '').trim(),
        id_Number: String(this.bookingForm.get('id_Number')?.value ?? '').trim(),
      },
      { emitEvent: false },
    );
    this.updateGuestProfileIdValidation(
      String(this.guestProfileForm.get('id_Type')?.value ?? ''),
    );
    this.ensureGuestProfileSelectDefaults();
  }

  private ensureGuestProfileSelectDefaults(): void {
    const gender = String(this.guestProfileForm.get('gender')?.value ?? '').trim();
    if (!gender && this.guestGenderOptions.length) {
      this.guestProfileForm.patchValue(
        { gender: this.guestGenderOptions[0].id },
        { emitEvent: false },
      );
    }
    const idType = String(this.guestProfileForm.get('id_Type')?.value ?? '').trim();
    if (idType) {
      return;
    }
    const fromBooking = String(this.bookingForm.get('id_Type')?.value ?? '').trim();
    const fallback =
      fromBooking ||
      this.identityTypes[0]?.name ||
      this.defaultIdentityTypes[0]?.name ||
      '';
    if (fallback) {
      this.ensureIdentityTypeOption(fallback);
      this.guestProfileForm.patchValue({ id_Type: fallback }, { emitEvent: false });
      this.updateGuestProfileIdValidation(fallback);
    }
  }

  selectKnownGuest(guest: KnownGuestProfile): void {
    const occ = syncBookingOccupancyCounts(guest);
    if (guest.profile) {
      this.guestProfileSnapshot = { ...guest.profile };
      this.guestProfileRegistryId = guest.registry_Id ?? guest.profile.registry_Id ?? null;
      this.applyGuestProfileToBookingForm(guest.profile);
    } else {
      this.guestProfileSnapshot = null;
      this.guestProfileRegistryId = null;
      this.bookingForm.patchValue(
        {
          guest_Full_Name: guest.fullName,
          first_Name: guest.first_Name,
          last_Name: guest.last_Name,
          phone_Number: guest.phone_Number ?? '',
          payment_Method: guest.payment_Method ?? '',
          people_Count: occ.people_Count,
          adults_Count: occ.adults_Count,
          children_Count: occ.children_Count,
        },
        { emitEvent: false },
      );
      if (guest.id_Type || guest.id_Number) {
        this.applyGuestIdentityFields(guest.id_Type ?? '', guest.id_Number ?? '');
      }
    }
    if (!guest.profile) {
      this.bookingForm.patchValue(
        {
          payment_Method: guest.payment_Method ?? '',
          people_Count: occ.people_Count,
          adults_Count: occ.adults_Count,
          children_Count: occ.children_Count,
        },
        { emitEvent: false },
      );
    }
    this.guestPickerOpen = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.booking-kind-picker-wrap')) {
      this.bookingKindPickerOpen = false;
    }
    if (this.guestProfileModalOpen) {
      if (target instanceof Element && target.closest('.guest-profile-modal-wrap .gp-modal-panel')) {
        return;
      }
      this.guestProfileModalOpen = false;
      this.guestProfileSubmitted = false;
    }
    if (!this.guestPickerOpen) {
      return;
    }
    if (target instanceof Element && target.closest('.guest-name-picker-wrap')) {
      return;
    }
    this.guestPickerOpen = false;
    this.cdr.markForCheck();
  }

  @HostListener('document:keydown.escape')
  onGuestPickerEscape(): void {
    this.guestProfileModalOpen = false;
    this.guestProfileSubmitted = false;
    this.guestPickerOpen = false;
    this.bookingKindPickerOpen = false;
    this.cdr.markForCheck();
  }

  private applyStandardNameValidators(): void {
    const full = this.bookingForm.get('guest_Full_Name');
    const first = this.bookingForm.get('first_Name');
    const last = this.bookingForm.get('last_Name');
    full?.clearValidators();
    first?.setValidators([Validators.required]);
    last?.setValidators([Validators.required]);
    full?.updateValueAndValidity({ emitEvent: false });
    first?.updateValueAndValidity({ emitEvent: false });
    last?.updateValueAndValidity({ emitEvent: false });
  }

  /** حجز مسبق: اسم واحد (أول + لقب) مع زر + لنموذج البيانات التفصيلية */
  private applyUnifiedGuestNameValidators(): void {
    const full = this.bookingForm.get('guest_Full_Name');
    const first = this.bookingForm.get('first_Name');
    const last = this.bookingForm.get('last_Name');
    full?.setValidators([Validators.required, Validators.minLength(2)]);
    first?.clearValidators();
    last?.clearValidators();
    full?.updateValueAndValidity({ emitEvent: false });
    first?.updateValueAndValidity({ emitEvent: false });
    last?.updateValueAndValidity({ emitEvent: false });
  }

  private syncGuestFullNameFromNameParts(): void {
    const first = String(this.bookingForm.get('first_Name')?.value ?? '').trim();
    const last = String(this.bookingForm.get('last_Name')?.value ?? '').trim();
    const current = String(this.bookingForm.get('guest_Full_Name')?.value ?? '').trim();
    if (current || (!first && !last)) {
      return;
    }
    this.bookingForm.patchValue(
      { guest_Full_Name: [first, last].filter(Boolean).join(' ') },
      { emitEvent: false },
    );
  }

  private applyGuestFullNameToNameParts(): void {
    const full = String(this.bookingForm.get('guest_Full_Name')?.value ?? '').trim();
    const { first, last } = splitGuestFullName(full);
    this.bookingForm.patchValue(
      { first_Name: first, last_Name: last },
      { emitEvent: false },
    );
  }

  private restoreFullBookingValidators(): void {
    const keys = [
      'payment_Amount',
      'id_Number',
      'id_Type',
      'payment_Method',
      'people_Count',
      'adults_Count',
      'children_Count',
    ] as const;
    this.bookingForm.get('payment_Amount')?.setValidators([Validators.required]);
    this.bookingForm.get('id_Number')?.setValidators([Validators.required]);
    this.bookingForm.get('id_Type')?.setValidators([Validators.required]);
    this.bookingForm.get('payment_Method')?.setValidators([Validators.required]);
    this.bookingForm.get('people_Count')?.setValidators([Validators.required, Validators.min(1)]);
    this.bookingForm.get('adults_Count')?.setValidators([Validators.required, Validators.min(1)]);
    this.bookingForm.get('children_Count')?.setValidators([Validators.min(0)]);
    for (const key of keys) {
      this.bookingForm.get(key)?.updateValueAndValidity({ emitEvent: false });
    }
    this.syncPhoneDisplayFromLocale();
  }

  syncPhoneDisplayFromLocale(): void {
    const locale = this.ui.displayLocale();
    const arabicProfile = locale === 'ar' ? this.arabicPref.selectedProfile() : null;
    this.phoneDisplay = localePhoneDisplay(locale, arabicProfile);
    this.applyPhoneValidators();
    this.cdr.markForCheck();
  }

  private applyAdvanceDepositValidators(): void {
    this.applyReservationValidators();
    this.bookingForm.get('payment_Amount')?.setValidators([Validators.required, Validators.min(0.01)]);
    this.bookingForm.get('payment_Method')?.setValidators([Validators.required]);
    this.bookingForm.get('payment_Amount')?.updateValueAndValidity({ emitEvent: false });
    this.bookingForm.get('payment_Method')?.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  }

  private applyReservationValidators(): void {
    const optional = [
      'phone_Number',
      'payment_Amount',
      'id_Number',
      'id_Type',
      'payment_Method',
      'people_Count',
      'adults_Count',
      'children_Count',
    ];
    for (const key of optional) {
      this.bookingForm.get(key)?.clearValidators();
      this.bookingForm.get(key)?.updateValueAndValidity({ emitEvent: false });
    }
    this.bookingForm.patchValue(
      {
        payment_Amount: 0,
        id_Type: '',
        id_Number: '',
        payment_Method: '',
      },
      { emitEvent: false }
    );
    this.applyPhoneValidators();
    this.cdr.markForCheck();
  }

  private get isCheckInExistingBooking(): boolean {
    return (
      this.existingBookingId != null &&
      (this.checkInMode || this.walkInCheckInMode) &&
      !this.extendStayMode
    );
  }

  /** حجز مسبق → تسكين: لا نُلزم حقولاً كانت اختيارية عند الحجز فقط */
  private applyCheckInFromExistingBookingValidators(): void {
    for (const key of ['id_Number', 'id_Type', 'payment_Method'] as const) {
      this.bookingForm.get(key)?.clearValidators();
      this.bookingForm.get(key)?.updateValueAndValidity({ emitEvent: false });
    }
    this.bookingForm.get('payment_Amount')?.setValidators([Validators.min(0)]);
    this.bookingForm.get('payment_Amount')?.updateValueAndValidity({ emitEvent: false });
    this.bookingForm
      .get('people_Count')
      ?.setValidators([Validators.required, Validators.min(1)]);
    this.bookingForm.get('adults_Count')?.setValidators([Validators.required, Validators.min(1)]);
    this.bookingForm.get('children_Count')?.setValidators([Validators.min(0)]);
    this.bookingForm.get('people_Count')?.updateValueAndValidity({ emitEvent: false });
    this.bookingForm.get('adults_Count')?.updateValueAndValidity({ emitEvent: false });
    this.bookingForm.get('children_Count')?.updateValueAndValidity({ emitEvent: false });
    this.applyPhoneValidators();
    this.cdr.markForCheck();
  }

  private applyPhoneValidators(): void {
    const phone = this.bookingForm.get('phone_Number');
    if (!phone) {
      return;
    }
    if (this.reservationMode || this.isCheckInExistingBooking) {
      phone.clearValidators();
      phone.updateValueAndValidity({ emitEvent: false });
      return;
    }
    const loc = this.ui.displayLocale();
    const maxLen = this.phoneDisplay.maxLength;
    if (loc === 'ar') {
      phone.setValidators([
        Validators.required,
        Validators.minLength(9),
        Validators.maxLength(maxLen),
        Validators.pattern('^5[0-9]{8}$'),
      ]);
    } else if (loc === 'fr') {
      phone.setValidators([
        Validators.required,
        Validators.minLength(9),
        Validators.maxLength(maxLen),
        Validators.pattern('^[0-9]{9}$'),
      ]);
    } else if (loc === 'id') {
      phone.setValidators([
        Validators.required,
        Validators.minLength(9),
        Validators.maxLength(maxLen),
        Validators.pattern('^8[0-9]{8,10}$'),
      ]);
    } else if (loc === 'tr') {
      phone.setValidators([
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(maxLen),
        Validators.pattern('^5[0-9]{9}$'),
      ]);
    } else if (loc === 'zh-Hans') {
      phone.setValidators([
        Validators.required,
        Validators.minLength(11),
        Validators.maxLength(maxLen),
        Validators.pattern('^1[3-9][0-9]{9}$'),
      ]);
    } else {
      phone.setValidators([
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(maxLen),
        Validators.pattern('^[0-9]+$'),
      ]);
    }
    phone.updateValueAndValidity({ emitEvent: false });
  }

  setupIdValidation(): void {
    this.bookingForm
      .get('id_Type')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((idType: string) => {
        this.updateIdNumberValidation(idType, { clearValue: false });
      });
    const current = this.bookingForm.get('id_Type')?.value;
    if (current) {
      this.updateIdNumberValidation(current, { clearValue: false });
    }
  }

  private ensureIdentityTypeOption(typeName: string): void {
    const name = String(typeName ?? '').trim();
    if (!name) {
      return;
    }
    if (!this.identityTypes.some((t) => t.name === name)) {
      this.identityTypes = [{ name }, ...this.identityTypes];
    }
  }

  private applyGuestIdentityFields(idType: string, idNumber: string): void {
    const type = String(idType ?? '').trim();
    const num = String(idNumber ?? '').trim().replace(/\D/g, '');
    if (type) {
      this.ensureIdentityTypeOption(type);
    }
    this.bookingForm.patchValue(
      {
        id_Type: type,
        id_Number: num,
      },
      { emitEvent: false }
    );
    if (type) {
      this.updateIdNumberValidation(type, { clearValue: false });
    }
    this.bookingForm.get('id_Number')?.updateValueAndValidity({ emitEvent: false });
    this.cdr.markForCheck();
  }

  updateIdNumberValidation(idType: string, options?: { clearValue?: boolean }): void {
    const idControl = this.bookingForm.get('id_Number');
    if (!idControl) {
      return;
    }
    if (this.reservationMode || this.isCheckInExistingBooking) {
      idControl.clearValidators();
      idControl.updateValueAndValidity({ emitEvent: false });
      return;
    }

    const clearValue = options?.clearValue ?? !this.keepsGuestIdentityPrefill;

    /** حجز محمّل مسبقاً: لا نُلزم 12 رقماً على بيانات محفوظة سابقاً */
    if (this.keepsGuestIdentityPrefill && !this.isCheckInExistingBooking) {
      this.idNumberHint = this.ui
        .screenText('booking', 'idNumberExactLength')
        .replace('{n}', String(ID_NUMBER_FIXED_LENGTH));
      this.idNumberMaxLength = ID_NUMBER_FIXED_LENGTH;
      idControl.setValidators([
        Validators.required,
        Validators.maxLength(ID_NUMBER_FIXED_LENGTH),
        Validators.pattern('^[0-9]+$'),
      ]);
      idControl.updateValueAndValidity({ emitEvent: false });
      if (clearValue) {
        idControl.setValue('');
      }
      return;
    }

    const twelve = identityRequiresTwelveDigits(idType);

    if (twelve) {
      this.idNumberHint = this.ui
        .screenText('booking', 'idNumberExactLength')
        .replace('{n}', String(ID_NUMBER_FIXED_LENGTH));
      this.idNumberMaxLength = ID_NUMBER_FIXED_LENGTH;
      idControl.setValidators([
        Validators.required,
        Validators.minLength(ID_NUMBER_FIXED_LENGTH),
        Validators.maxLength(ID_NUMBER_FIXED_LENGTH),
        Validators.pattern('^[0-9]{12}$'),
      ]);
    } else {
      this.idNumberHint = '';
      this.idNumberMaxLength = ID_NUMBER_FIXED_LENGTH;
      idControl.setValidators([
        Validators.required,
        Validators.maxLength(ID_NUMBER_FIXED_LENGTH),
        Validators.pattern('^[0-9]*$'),
      ]);
    }

    idControl.updateValueAndValidity();
    if (clearValue) {
      idControl.setValue('');
    }
  }

  private get isPrefilledMode(): boolean {
    return this.transferRoomMode || this.editBookingMode || this.checkInMode;
  }

  /** لا تُمسح بيانات الهوية عند تحميل أنواع الهوية الافتراضية */
  private get keepsGuestIdentityPrefill(): boolean {
    return this.isPrefilledMode || this.addGuestBookingMode;
  }

  private applyPendingGuestIdentity(): void {
    if (!this.pendingGuestIdentity) {
      return;
    }
    const { id_Number, id_Type } = this.pendingGuestIdentity;
    this.applyGuestIdentityFields(id_Type, id_Number);
    this.pendingGuestIdentity = null;
  }

  private readonly defaultIdentityTypes: IdentityType[] = [
    { name: 'جواز سفر' },
    { name: 'هوية وطنية' },
    { name: 'عقد زواج' },
  ];

  loadIdentityTypes(): void {
    this.identityService.getIdentityTypes().subscribe({
      next: (types) => {
        const prefilledType = String(
          this.pendingGuestIdentity?.id_Type ?? this.bookingForm.get('id_Type')?.value ?? ''
        ).trim();
        this.identityTypes = types.length > 0 ? types : this.defaultIdentityTypes;
        if (prefilledType) {
          this.ensureIdentityTypeOption(prefilledType);
        }
        if (this.keepsGuestIdentityPrefill) {
          this.applyPendingGuestIdentity();
          this.ensureDefaultIdTypeIfEmpty(types);
          const idType = this.bookingForm.get('id_Type')?.value;
          if (idType) {
            this.updateIdNumberValidation(idType, { clearValue: false });
          }
          return;
        }
        if (types.length > 0) {
          this.bookingForm.patchValue({ id_Type: types[0].name });
        } else {
          this.bookingForm.patchValue({ id_Type: this.defaultIdentityTypes[0].name });
        }
      },
      error: (err) => {
        console.error('Error loading identity types', err);
        const prefilledType = String(
          this.pendingGuestIdentity?.id_Type ?? this.bookingForm.get('id_Type')?.value ?? ''
        ).trim();
        this.identityTypes = this.defaultIdentityTypes;
        if (prefilledType) {
          this.ensureIdentityTypeOption(prefilledType);
        }
        if (this.keepsGuestIdentityPrefill) {
          this.applyPendingGuestIdentity();
          this.ensureDefaultIdTypeIfEmpty([]);
          const idType = this.bookingForm.get('id_Type')?.value;
          if (idType) {
            this.updateIdNumberValidation(idType, { clearValue: false });
          }
          return;
        }
        this.bookingForm.patchValue({ id_Type: this.defaultIdentityTypes[0].name });
      }
    });
  }

  setupFinancialCalculations(): void {
    this.bookingForm
      .get('stay_Days')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.calculateFinances());
    this.bookingForm
      .get('payment_Amount')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.calculateFinances());
    this.bookingForm
      .get('price_Code')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.calculateFinances());
  }

  private selectedPriceCodeDiscountPercent(): number {
    if (!this.showGuestCodingFields && !this.walkInCheckInMode) {
      return 0;
    }
    const code = String(this.bookingForm.get('price_Code')?.value ?? '').trim();
    return priceCodeDiscountPercentForName(this.priceCodeOptions, code);
  }

  priceCodeOptionPercent(item: GeneralCodeItem): number {
    return parsePriceCodeDiscountPercent(item.description);
  }

  selectedPriceCodeDisplay(): string {
    const code = String(this.bookingForm.get('price_Code')?.value ?? '').trim();
    return formatPriceCodeWithDiscountLabel(code, this.priceCodeOptions);
  }

  selectedPriceCodePercentBadge(): string {
    const code = String(this.bookingForm.get('price_Code')?.value ?? '').trim();
    return priceCodeDiscountPercentLabel(code, this.priceCodeOptions);
  }

  priceCodeDiscountHintText(): string {
    const pct = this.selectedPriceCodeDiscountPercent();
    if (pct <= 0) {
      return '';
    }
    return this.ui.screenText('booking', 'priceCodeDiscountHint').replace('{percent}', String(pct));
  }

  calculateFinances(): void {
    if (this.selectedRoom) {
      const pricePerDay = this.selectedRoom.price || 0;
      const days = this.bookingForm.get('stay_Days')?.value || 1;
      const paid = Number(this.bookingForm.get('payment_Amount')?.value) || 0;

      const baseTotal = pricePerDay * days;
      const discountPercent = this.selectedPriceCodeDiscountPercent();
      const total = applyPriceCodeDiscount(baseTotal, discountPercent);
      const remaining = total - paid;

      this.bookingForm.patchValue({
        total_Price: total,
        remaining_Amount: remaining > 0 ? remaining : 0
      }, { emitEvent: false });
    }
  }

  generateInvoiceNumber(): void {
    const randomNum = Math.floor(10000000 + Math.random() * 90000000);
    this.bookingForm.patchValue({ invoice_Number: randomNum.toString() });
  }

  loadPaymentMethods(): void {
    this.paymentMethodService.getAll().subscribe({
      next: (items) => {
        this.paymentMethods = items.map((x) => x.name);
        if (this.paymentMethods.length > 0 && !this.isPrefilledMode && !this.addGuestBookingMode && !this.reservationMode) {
          this.bookingForm.patchValue({ payment_Method: this.paymentMethods[0] });
        } else if (!this.paymentMethods.length && !this.isPrefilledMode && !this.addGuestBookingMode && !this.reservationMode) {
          this.bookingForm.patchValue({ payment_Method: 'نقداً' });
        }
      },
      error: () => {
        this.paymentMethods = ['نقداً', 'بطاقة ائتمان', 'تحويل بنكي'];
        if (!this.isPrefilledMode && !this.addGuestBookingMode && !this.reservationMode) {
          this.bookingForm.patchValue({ payment_Method: 'نقداً' });
        }
      },
    });
  }

  setCurrentDateTime(): void {
    const now = new Date();
    const dateStr = todayLocalDateString();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    this.bookingForm.patchValue({
      booking_Date: dateStr,
      booking_Time: timeStr,
      bookingDateTime: `${dateStr}T${timeStr}:00`,
    });
  }

  loadAvailableRooms(): void {
    this.roomService.getRooms().subscribe((rooms) => {
      const pickedFromChart = consumePickedRoom();
      const queryRoom = this.route.snapshot.queryParamMap.get('roomNumber');
      const preselectedNumber =
        pickedFromChart?.roomNumber ||
        (queryRoom ? normalizeRoomNumber(queryRoom) : '') ||
        '';

      const candidates = rooms.filter(
        (r) => r.status === 'available' || r.status === 'dirty',
      );
      const current = this.initialRoomNumber
        ? rooms.find((r) => roomsMatchNumber(r.roomNumber, this.initialRoomNumber))
        : undefined;
      this.availableRooms =
        current && !candidates.some((r) => roomsMatchNumber(r.roomNumber, current.roomNumber))
          ? [current, ...candidates]
          : candidates.length
            ? candidates
            : current
              ? [current]
              : [];

      if (preselectedNumber) {
        this.applyPreselectedRoom(rooms, preselectedNumber, pickedFromChart);
      } else if (this.initialRoomNumber) {
        this.selectRoomByNumber(this.initialRoomNumber, rooms);
      }
      this.cdr.markForCheck();
    });
  }

  /** غرفة من مخطط التوافير أو query — تُطبَّق حتى في تسكين مباشر / حجز مسبق */
  private applyPreselectedRoom(
    allRooms: Room[],
    roomNumber: string,
    snapshot: BookingPickedRoom | null,
  ): void {
    const norm = normalizeRoomNumber(roomNumber);
    if (!norm) {
      return;
    }
    const fromApi = allRooms.find((r) => roomsMatchNumber(r.roomNumber, norm));
    if (fromApi && !this.availableRooms.some((r) => roomsMatchNumber(r.roomNumber, norm))) {
      if (fromApi.status === 'available' || fromApi.status === 'dirty') {
        this.availableRooms = [fromApi, ...this.availableRooms];
      }
    }
    if (!this.selectRoomByNumber(norm, allRooms) && snapshot) {
      this.applyRoomSnapshot(snapshot);
    }
  }

  private applyRoomSnapshot(snapshot: BookingPickedRoom): void {
    const roomNumber = normalizeRoomNumber(snapshot.roomNumber);
    if (!roomNumber) {
      return;
    }
    this.selectedRoom = {
      id: 0,
      roomNumber,
      type: snapshot.type || '',
      status: snapshot.status || 'available',
      price: Number(snapshot.price) || 0,
      floor: Number(snapshot.floor) || 1,
    };
    if (!this.availableRooms.some((r) => roomsMatchNumber(r.roomNumber, roomNumber))) {
      this.availableRooms = [this.selectedRoom, ...this.availableRooms];
    }
    this.bookingForm.patchValue({
      room_Number: roomNumber,
      room_Type: this.selectedRoom.type,
      floor: this.selectedRoom.floor,
    });
    this.calculateFinances();
  }

  goPickRoomFromChart(): void {
    saveBookingPickRoomReturnUrl(this.router.url);
    void this.router.navigate(['/rooms'], { queryParams: { pickRoom: '1' } });
  }

  private initAddGuestBooking(): void {
    try {
      const raw = sessionStorage.getItem(ADD_GUEST_BOOKING_STORAGE_KEY);
      sessionStorage.removeItem(ADD_GUEST_BOOKING_STORAGE_KEY);
      if (!raw) {
        return;
      }
      const booking = mapBookingFromApi(JSON.parse(raw) as Record<string, unknown>);
      this.addGuestBookingMode = true;
      this.pendingGuestIdentity = {
        id_Number: String(booking.id_Number ?? '').trim(),
        id_Type: String(booking.id_Type ?? '').trim(),
      };
      this.bookingForm.patchValue({
        first_Name: booking.first_Name ?? '',
        last_Name: booking.last_Name ?? '',
        phone_Number: booking.phone_Number ?? '',
        payment_Method: booking.payment_Method ?? '',
        ...syncBookingOccupancyCounts(booking),
        room_Type: '',
        room_Number: '',
        floor: '',
        payment_Amount: '',
        stay_Days: 1,
        total_Price: 0,
        remaining_Amount: 0,
      });
      const { id_Type: guestIdType, id_Number: guestIdNumber } = this.pendingGuestIdentity;
      if (guestIdType || guestIdNumber) {
        this.applyGuestIdentityFields(guestIdType, guestIdNumber);
      }
      this.setCurrentDateTime();
      const sharedInvoice = String(booking.invoice_Number ?? '').trim();
      if (sharedInvoice) {
        this.bookingForm.get('invoice_Number')?.setValue(sharedInvoice);
      } else {
        this.generateInvoiceNumber();
      }
      this.selectedRoom = undefined;
    } catch {
      /* ignore */
    }
  }

  private applyWalkInNameValidators(): void {
    const full = this.bookingForm.get('guest_Full_Name');
    const first = this.bookingForm.get('first_Name');
    const last = this.bookingForm.get('last_Name');
    full?.setValidators([Validators.required, Validators.minLength(2)]);
    first?.clearValidators();
    last?.clearValidators();
    full?.updateValueAndValidity({ emitEvent: false });
    first?.updateValueAndValidity({ emitEvent: false });
    last?.updateValueAndValidity({ emitEvent: false });
  }

  private initPrefilledBooking(storageKey: string, kind: 'transfer' | 'edit' | 'checkIn'): void {
    try {
      const raw = sessionStorage.getItem(storageKey);
      sessionStorage.removeItem(storageKey);
      if (!raw) {
        return;
      }
      const booking = mapBookingFromApi(JSON.parse(raw) as Record<string, unknown>);
      if (kind === 'transfer') {
        this.transferRoomMode = true;
        this.transferCurrentRoomNumber = (booking.room_Number ?? '').trim() || null;
      } else if (kind === 'checkIn') {
        this.checkInMode = true;
        this.checkInBookingInvoice = (booking.invoice_Number ?? '').trim() || null;
      } else {
        this.editBookingMode = true;
        this.editBookingInvoice = (booking.invoice_Number ?? '').trim() || null;
      }
      this.existingBookingId = booking.id ?? null;
      this.initialRoomNumber = (booking.room_Number ?? '').trim() || null;
      this.savedCurrencyCode = booking.currencyCode?.trim() || 'YER';
      this.savedCurrencySymbol = booking.currencySymbol?.trim() || 'YR';
      this.savedBookingStatus = booking.status?.trim() || 'active';
      if (kind === 'checkIn') {
        this.applyStandardNameValidators();
        this.applyCheckInFromExistingBookingValidators();
      }
      this.applyExistingBooking(booking);
      if (kind === 'checkIn') {
        this.syncRoomSelectionAfterPrefill();
      }
    } catch {
      /* ignore */
    }
  }

  /** ربط الغرفة المحجوزة بعد تحميل البيانات (مهم عند التنقل دون إعادة تحميل الصفحة) */
  private syncRoomSelectionAfterPrefill(): void {
    const num = (this.initialRoomNumber ?? '').trim();
    if (!num) {
      return;
    }
    if (this.selectRoomByNumber(num)) {
      return;
    }
    this.roomService.getRooms().subscribe((rooms) => {
      const current = rooms.find((r) => roomsMatchNumber(r.roomNumber, num));
      if (current && !this.availableRooms.some((r) => roomsMatchNumber(r.roomNumber, num))) {
        this.availableRooms = [current, ...this.availableRooms];
      }
      this.selectRoomByNumber(num, rooms);
      this.cdr.markForCheck();
    });
  }

  private applyExistingBooking(booking: Booking): void {
    const rawDate = booking.booking_Date ?? '';
    const dateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.split(' ')[0];
    let timeStr = booking.booking_Time ?? '';
    if (!timeStr && rawDate.includes('T')) {
      timeStr = rawDate.split('T')[1]?.slice(0, 5) ?? '';
    }

    this.pendingGuestIdentity = {
      id_Number: String(booking.id_Number ?? '').trim(),
      id_Type: String(booking.id_Type ?? '').trim(),
    };

    const occ = syncBookingOccupancyCounts(booking);
    const fullName = guestFullName(booking);
    const rawNotes = booking.guest_Notes ?? '';
    const parsedNotesProfile = parseGuestProfileFromNotes(rawNotes);
    this.guestProfileSnapshot = parsedNotesProfile;
    if (parsedNotesProfile?.registry_Id) {
      this.guestProfileRegistryId = parsedNotesProfile.registry_Id;
    }
    const displayNotes = stripGuestProfileFromNotes(rawNotes);
    this.bookingForm.patchValue({
      guest_Full_Name: fullName,
      first_Name: booking.first_Name,
      last_Name: booking.last_Name,
      phone_Number: booking.phone_Number,
      payment_Amount: booking.payment_Amount ?? 0,
      room_Type: booking.room_Type,
      room_Number: booking.room_Number,
      floor: booking.floor,
      booking_Date: dateStr || todayLocalDateString(),
      booking_Time: timeStr,
      bookingDateTime: booking.bookingDateTime ?? '',
      payment_Method: booking.payment_Method ?? '',
      people_Count: occ.people_Count,
      adults_Count: occ.adults_Count,
      children_Count: occ.children_Count,
      stay_Days: booking.stay_Days ?? 1,
      invoice_Number: booking.invoice_Number ?? '',
      total_Price: booking.total_Price ?? 0,
      remaining_Amount: booking.remaining_Amount ?? 0,
      guest_Notes: displayNotes,
      booking_Confirmed: booking.booking_Confirmed !== false,
      booking_Source: booking.booking_Source?.trim() || 'direct',
    });

    const { id_Type: guestIdType, id_Number: guestIdNumber } = this.pendingGuestIdentity;
    if (guestIdType || guestIdNumber) {
      this.applyGuestIdentityFields(guestIdType, guestIdNumber);
    }
    if (this.showGuestCodingFields && guestIdNumber) {
      this.loadGuestCodingFromRegistry(guestIdNumber);
    }
  }

  /** قائمة نوع الحجز — حجز مسبق فقط */
  get showBookingKindPicker(): boolean {
    return (
      !this.transferRoomMode &&
      !this.editBookingMode &&
      !this.addGuestBookingMode &&
      !this.walkInCheckInMode &&
      !this.checkInMode &&
      !this.extendStayMode
    );
  }

  get bookingKindLocked(): boolean {
    return (
      this.transferRoomMode ||
      this.editBookingMode ||
      this.addGuestBookingMode ||
      this.extendStayMode ||
      this.checkInPrefillBusy
    );
  }

  get selectedBookingKind(): BookingKindId {
    const raw = this.bookingForm.get('booking_Kind')?.value;
    return isBookingKindId(raw) ? raw : this.resolveBookingKindFromModes();
  }

  get selectedBookingKindLabel(): string {
    const opt = BOOKING_KIND_OPTIONS.find((o) => o.id === this.selectedBookingKind);
    return opt ? this.ui.screenText('booking', opt.labelKey) : '';
  }

  /** المبلغ المدفوع وطريقة الدفع — تسكين/إقامة كاملة، أو حجز بدفعة مقدمة فقط */
  get showPaidAmountField(): boolean {
    return !this.reservationMode || this.advanceDepositMode;
  }

  get showPaymentMethodField(): boolean {
    return this.showPaidAmountField;
  }

  toggleBookingKindPicker(event: Event): void {
    event.stopPropagation();
    if (this.bookingKindLocked) {
      return;
    }
    this.bookingKindPickerOpen = !this.bookingKindPickerOpen;
    this.cdr.markForCheck();
  }

  clearBookingKind(event: Event): void {
    event.stopPropagation();
    if (this.bookingKindLocked) {
      return;
    }
    this.selectBookingKind('confirmed');
  }

  selectBookingKind(kind: BookingKindId): void {
    if (this.bookingKindLocked) {
      return;
    }
    this.bookingKindPickerOpen = false;
    this.bookingForm.patchValue({ booking_Kind: kind }, { emitEvent: false });
    switch (kind) {
      case 'confirmed':
        this.enterReservationMode(true, false);
        break;
      case 'unconfirmed':
        this.enterReservationMode(false, false);
        break;
      case 'advance_deposit':
        this.enterReservationMode(true, true);
        if (this.paymentMethods.length > 0) {
          this.bookingForm.patchValue(
            { payment_Method: this.paymentMethods[0] },
            { emitEvent: false },
          );
        }
        break;
    }
    this.calculateFinances();
    this.cdr.markForCheck();
  }

  private syncBookingKindFromModes(): void {
    const kind = this.resolveBookingKindFromModes();
    this.bookingForm.patchValue({ booking_Kind: kind }, { emitEvent: false });
  }

  private resolveBookingKindFromModes(): BookingKindId {
    if (this.reservationMode && this.advanceDepositMode) {
      return 'advance_deposit';
    }
    if (this.reservationMode) {
      return this.bookingForm.get('booking_Confirmed')?.value !== false ? 'confirmed' : 'unconfirmed';
    }
    return 'confirmed';
  }

  private setupPeopleCountSync(): void {
    const sync = () => this.syncPeopleCountFromOccupancy();
    this.bookingForm
      .get('adults_Count')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(sync);
    this.bookingForm
      .get('children_Count')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(sync);
  }

  /** يُحسب تلقائياً من البالغين + الأطفال (بدون حقل منفصل في الواجهة) */
  private syncPeopleCountFromOccupancy(): void {
    const adults = Number(this.bookingForm.get('adults_Count')?.value) || 0;
    const children = Number(this.bookingForm.get('children_Count')?.value) || 0;
    const total = adults + children;
    this.bookingForm.patchValue({ people_Count: total > 0 ? total : 1 }, { emitEvent: false });
  }

  selectRoomByNumber(roomNumber: string, allRooms?: Room[]): boolean {
    const norm = normalizeRoomNumber(roomNumber);
    const room =
      this.availableRooms.find((r) => roomsMatchNumber(r.roomNumber, norm)) ??
      allRooms?.find((r) => roomsMatchNumber(r.roomNumber, norm));
    if (room) {
      this.selectedRoom = room;
      this.bookingForm.patchValue({
        room_Number: normalizeRoomNumber(room.roomNumber),
        room_Type: room.type,
        floor: room.floor,
      });
      this.calculateFinances();
    }
    this.bookingForm.get('id_Number')?.updateValueAndValidity({ emitEvent: false });
    this.bookingForm.get('id_Type')?.updateValueAndValidity({ emitEvent: false });
    return !!room;
  }

  onRoomSelect(event: any): void {
    const roomNumber = event.target.value;
    this.selectRoomByNumber(roomNumber);
  }

  private phoneFieldAlertMessage(): string {
    const phone = this.bookingForm.get('phone_Number');
    if (phone?.errors?.['pattern']) {
      return this.ui.screenText('booking', 'phonePattern');
    }
    if (phone?.errors?.['minlength']) {
      return this.ui.screenText('booking', 'phoneMinLength');
    }
    return this.ui.screenText('booking', 'phoneRequired');
  }

  private alertFirstFormError(): void {
    const ar = this.ui.displayLocale() === 'ar';
    const fieldMessages: Array<{ key: string; ar: string; en: string }> = [
      {
        key: 'guest_Full_Name',
        ar: 'يرجى إدخال اسم النزيل.',
        en: 'Please enter the guest name.',
      },
      { key: 'first_Name', ar: 'يرجى إدخال الاسم الأول.', en: 'Please enter the first name.' },
      { key: 'last_Name', ar: 'يرجى إدخال اسم العائلة.', en: 'Please enter the last name.' },
      { key: 'id_Type', ar: 'يرجى اختيار نوع الهوية.', en: 'Please select an ID type.' },
      {
        key: 'id_Number',
        ar: 'يرجى إدخال رقم الهوية (أرقام فقط).',
        en: 'Please enter the ID number (digits only).',
      },
      {
        key: 'phone_Number',
        ar: this.phoneFieldAlertMessage(),
        en: this.phoneFieldAlertMessage(),
      },
      { key: 'room_Number', ar: 'يرجى اختيار الغرفة.', en: 'Please select a room.' },
      {
        key: 'room_Type',
        ar: this.showGuestCodingFields ? 'يرجى اختيار فئات الغرف.' : 'يرجى اختيار نوع الغرفة.',
        en: this.showGuestCodingFields ? 'Please select a room category.' : 'Please select a room type.',
      },
      { key: 'floor', ar: 'يرجى تحديد الطابق.', en: 'Please specify the floor.' },
      { key: 'payment_Amount', ar: 'يرجى إدخال المبلغ المدفوع.', en: 'Please enter the payment amount.' },
      { key: 'payment_Method', ar: 'يرجى اختيار طريقة الدفع.', en: 'Please select a payment method.' },
      { key: 'stay_Days', ar: 'يرجى إدخال عدد أيام الإقامة.', en: 'Please enter stay days.' },
      { key: 'booking_Date', ar: 'يرجى التأكد من تاريخ الحجز.', en: 'Please check the booking date.' },
      { key: 'booking_Time', ar: 'يرجى التأكد من وقت الحجز.', en: 'Please check the booking time.' },
    ];
    const skipInReservation = new Set([
      'id_Type',
      'id_Number',
      'phone_Number',
      'payment_Amount',
      'payment_Method',
    ]);
    const skipCheckInExisting = new Set(['id_Type', 'id_Number', 'payment_Method']);
    for (const { key, ar: msgAr, en: msgEn } of fieldMessages) {
      if (this.reservationMode && !this.advanceDepositMode && skipInReservation.has(key)) {
        continue;
      }
      if (this.isCheckInExistingBooking && skipCheckInExisting.has(key)) {
        continue;
      }
      if ((this.reservationMode || this.walkInCheckInMode) && (key === 'first_Name' || key === 'last_Name')) {
        continue;
      }
      if (!this.reservationMode && !this.walkInCheckInMode && key === 'guest_Full_Name') {
        continue;
      }
      const ctrl = this.bookingForm.get(key);
      if (ctrl?.invalid) {
        this.uiMsg.show(ar ? msgAr : msgEn, 'warning');
        return;
      }
    }
    this.uiMsg.show(
      ar ? 'يرجى إكمال جميع البيانات المطلوبة بشكل صحيح.' : 'Please complete all required fields.',
      'warning',
    );
  }

  /** يمنع إنشاء حجز جديد بدل تحديث حجز مسبق عند التسكين */
  private resolveExistingBookingIdForSubmit(): number | null {
    if (this.existingBookingId != null && this.existingBookingId > 0) {
      return this.existingBookingId;
    }
    const qId = Number(this.route.snapshot.queryParamMap.get('bookingId'));
    if (qId > 0) {
      return qId;
    }
    try {
      const raw = sessionStorage.getItem(CHECKIN_BOOKING_STORAGE_KEY);
      if (raw) {
        const stored = mapBookingFromApi(JSON.parse(raw) as Record<string, unknown>);
        if (stored.id != null && stored.id > 0) {
          return stored.id;
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  private tryResolveReservedBookingForCheckIn(bookingData: Booking): boolean {
    const match = findReservedBookingForCheckIn(this.bookingsCache, {
      id: this.resolveExistingBookingIdForSubmit(),
      invoice_Number:
        bookingData.invoice_Number ?? this.checkInBookingInvoice ?? undefined,
      room_Number: bookingData.room_Number,
      first_Name: bookingData.first_Name,
      last_Name: bookingData.last_Name,
      phone_Number: bookingData.phone_Number,
      id_Number: bookingData.id_Number,
    });
    if (!match?.id) {
      return false;
    }
    this.existingBookingId = match.id;
    this.savedBookingStatus = match.status?.trim() || 'reserved';
    if (!this.checkInBookingInvoice) {
      this.checkInBookingInvoice = (match.invoice_Number ?? '').trim() || null;
    }
    return true;
  }

  onSubmit(): void {
    if (this.loading || this.checkInPrefillBusy) {
      return;
    }
    this.submitted = true;

    const date = this.bookingForm.get('booking_Date')?.value;
    const time = this.bookingForm.get('booking_Time')?.value;

    if (date && time) {
      const t = time.length === 5 ? `${time}:00` : time;
      this.bookingForm.patchValue({ bookingDateTime: `${date}T${t}` });
    }

    if (this.reservationMode || this.walkInCheckInMode) {
      this.applyGuestFullNameToNameParts();
    }

    if (this.isCheckInExistingBooking) {
      if (!String(this.bookingForm.get('payment_Method')?.value ?? '').trim()) {
        this.bookingForm.patchValue(
          { payment_Method: this.paymentMethods[0] ?? 'نقداً' },
          { emitEvent: false },
        );
      }
    }

    if (this.bookingForm.invalid) {
      this.alertFirstFormError();
      return;
    }

    this.syncPeopleCountFromOccupancy();

    this.loading = true;
    this.bookingService.setRoomContextForNextSave(this.selectedRoom ?? null);
    const bookingData: any = { ...this.bookingForm.getRawValue() };
    delete bookingData.guest_Full_Name;
    delete bookingData.booking_Kind;
    if (this.walkInCheckInMode) {
      const src = String(bookingData.booking_Source ?? '').trim();
      bookingData.booking_Source = src || undefined;
    } else {
      bookingData.booking_Source = 'direct';
    }

    if (this.walkInCheckInMode) {
      bookingData.booking_Confirmed = true;
    }

    if (bookingData.payment_Amount) {
      bookingData.payment_Amount = Number(bookingData.payment_Amount);
    }
    const occ = syncBookingOccupancyCounts({
      people_Count: Number(bookingData.people_Count),
      adults_Count: Number(bookingData.adults_Count),
      children_Count: Number(bookingData.children_Count),
    });
    bookingData.people_Count = occ.people_Count;
    bookingData.adults_Count = occ.adults_Count;
    bookingData.children_Count = occ.children_Count;
    if (bookingData.stay_Days) bookingData.stay_Days = Number(bookingData.stay_Days);
    if (bookingData.total_Price) bookingData.total_Price = Number(bookingData.total_Price);
    if (bookingData.remaining_Amount !== undefined) bookingData.remaining_Amount = Number(bookingData.remaining_Amount);

    if (bookingData.floor !== undefined && bookingData.floor !== null) {
      bookingData.floor = bookingData.floor.toString();
    }
    if (this.reservationMode) {
      bookingData.status = 'reserved';
      bookingData.payment_Amount = Number(bookingData.payment_Amount) || 0;
      bookingData.id_Number = String(bookingData.id_Number ?? '').trim();
      bookingData.id_Type = String(bookingData.id_Type ?? '').trim();
      bookingData.phone_Number = String(bookingData.phone_Number ?? '').trim();
      bookingData.payment_Method = String(bookingData.payment_Method ?? '').trim();
      bookingData.booking_Confirmed = bookingData.booking_Confirmed !== false;
      bookingData.booking_Source = 'direct';
      const guests = Math.max(1, Number(bookingData.people_Count) || 1);
      bookingData.people_Count = guests;
      bookingData.adults_Count = guests;
      bookingData.children_Count = 0;
      bookingData.guest_Notes = stripGuestProfileFromNotes(String(bookingData.guest_Notes ?? ''));
    } else if (this.checkInMode || this.walkInCheckInMode) {
      bookingData.status = 'active';
      if (this.isCheckInExistingBooking) {
        bookingData.id_Number = String(bookingData.id_Number ?? '').trim();
        bookingData.id_Type = String(bookingData.id_Type ?? '').trim();
        bookingData.phone_Number = String(bookingData.phone_Number ?? '').trim();
        bookingData.payment_Method = String(bookingData.payment_Method ?? '').trim() || 'نقداً';
        bookingData.payment_Amount = Number(bookingData.payment_Amount) || 0;
      }
    } else {
      bookingData.status = bookingData.status || 'active';
    }

    const isCheckInFlow =
      (this.checkInMode || this.walkInCheckInMode) &&
      !this.addGuestBookingMode &&
      !this.extendStayMode;

    if (isCheckInFlow && !this.existingBookingId) {
      const resolvedId = this.resolveExistingBookingIdForSubmit();
      if (resolvedId) {
        this.existingBookingId = resolvedId;
      } else {
        this.tryResolveReservedBookingForCheckIn(bookingData);
      }
    }

    if (
      this.existingBookingId &&
      (this.transferRoomMode ||
        this.editBookingMode ||
        this.checkInMode ||
        (this.walkInCheckInMode && isCheckInFlow))
    ) {
      this.submitExistingBookingUpdate(bookingData);
      return;
    }

    if (isCheckInFlow && this.checkInBookingInvoice) {
      if (this.tryResolveReservedBookingForCheckIn(bookingData)) {
        this.submitExistingBookingUpdate(bookingData);
        return;
      }
    }

    const notifyKind = this.addGuestBookingMode ? 'booking_add_guest' as const : 'booking_created' as const;
    this.bookingService.saveBooking(bookingData, { kind: notifyKind, params: bookingNotifyParams(bookingData) }).subscribe({
      next: () => {
        const isWalkInCheckIn = this.checkInMode && !this.existingBookingId;
        this.uiMsg.success(
          this.reservationMode
            ? this.ui.screenText('booking', 'reservationSuccess')
            : isWalkInCheckIn
              ? this.ui.screenText('booking', 'checkInSuccess')
              : this.ui.screenText('booking', 'successMsg'),
        );
        if (!this.reservationMode && this.selectedRoom) {
          const updatedRoom: Room = { ...this.selectedRoom, status: 'occupied' } as Room;
          this.roomService.updateRoom(updatedRoom.id, updatedRoom, false).subscribe({
            error: (err) => {
              console.error('Error updating room status', err);
            },
          });
        }

        if (this.showGuestCodingFields) {
          this.persistGuestRegistryCodingFields(true);
        }
        this.success = true;
        this.loading = false;
        this.bookingForm.reset({
          id_Type: 'جواز سفر',
          room_Type: '',
          floor: '',
          payment_Amount: '',
          bookingDateTime: '',
          guest_Notes: '',
          booking_Confirmed: true,
          booking_Source: 'direct',
          guest_Full_Name: '',
          purpose_Of_Stay: '',
          relationship_Type: '',
          price_Code: '',
        });
        this.applyDefaultGuestCodingIfEmpty();
        this.setCurrentDateTime();
        this.selectedRoom = undefined;
        this.submitted = false;
        if (this.addGuestBookingMode) {
          this.addGuestBookingMode = false;
          void this.router.navigate(['/front-desk'], { queryParams: { pmsTab: 'multi' } });
          return;
        }
        if (isWalkInCheckIn) {
          this.walkInCheckInMode = false;
          this.checkInMode = false;
          void this.router.navigate(['/front-desk'], { queryParams: { pmsTab: 'staying' } });
          return;
        }
        if (this.reservationMode) {
          void this.router.navigate(['/bookings'], { queryParams: { view: 'records' } });
          return;
        }
        setTimeout(() => {
          this.success = false;
          this.router.navigate(['/rooms']);
        }, 5000);
      },
      error: (err) => {
        console.error('Error saving booking', err);
        const message =
          formatAbpRequestError(err) ||
          err?.error?.error?.message ||
          err?.message ||
          'حدث خطأ أثناء حفظ الحجز';
        this.uiMsg.error(`فشل حفظ الحجز: ${message}`);
        this.loading = false;
      }
    });
  }

  private submitExistingBookingUpdate(bookingData: Booking): void {
    const newRoomNum = (bookingData.room_Number ?? '').trim();
    const updated: Booking = {
      ...bookingData,
      id: this.existingBookingId!,
      status:
        this.extendStayMode
          ? 'active'
          : this.checkInMode
            ? 'active'
            : this.savedBookingStatus || 'active',
      currencyCode: this.savedCurrencyCode,
      currencySymbol: this.savedCurrencySymbol,
      guest_Notes: String(bookingData.guest_Notes ?? '').trim(),
    };

    const notify =
      this.transferRoomMode && this.initialRoomNumber
        ? {
            kind: 'booking_transfer' as const,
            params: {
              ...bookingNotifyParams(updated),
              fromRoom: this.initialRoomNumber,
              toRoom: newRoomNum,
            },
          }
        : { kind: 'booking_updated' as const, params: bookingNotifyParams(updated) };

    this.bookingService.updateBooking(this.existingBookingId!, updated, notify).subscribe({
      next: () => {
        const prev = this.initialRoomNumber;
        if (prev && prev !== newRoomNum) {
          this.setRoomStatus(prev, 'dirty');
          if (this.selectedRoom && newRoomNum) {
            this.setRoomStatus(newRoomNum, 'occupied');
          }
          if (this.transferRoomMode) {
            pushRecentRoomTransfer({
              bookingId: this.existingBookingId ?? undefined,
              fromRoom: prev,
              toRoom: newRoomNum,
              guestName: `${updated.first_Name ?? ''} ${updated.last_Name ?? ''}`.trim(),
            });
          }
        } else if (this.transferRoomMode && this.selectedRoom && newRoomNum) {
          this.setRoomStatus(newRoomNum, 'occupied');
        }
        sessionStorage.removeItem(TRANSFER_ROOM_STORAGE_KEY);
        sessionStorage.removeItem(EDIT_BOOKING_STORAGE_KEY);
        sessionStorage.removeItem(CHECKIN_BOOKING_STORAGE_KEY);
        if (this.checkInMode && !this.extendStayMode && newRoomNum) {
          this.setRoomStatus(newRoomNum, 'occupied');
        }
        this.uiMsg.success(
          this.extendStayMode
            ? this.ui.screenText('booking', 'extendStaySuccess')
            : this.checkInMode
              ? this.ui.screenText('booking', 'checkInSuccess')
              : this.transferRoomMode
                ? this.ui.screenText('booking', 'transferRoomSuccess')
                : this.ui.screenText('booking', 'editBookingSuccess'),
        );
        if (this.showGuestCodingFields) {
          this.persistGuestRegistryCodingFields(true);
        }
        this.loading = false;
        this.submitted = false;
        const returnToFrontDesk =
          this.extendStayMode || this.transferRoomMode || this.checkInMode;
        void this.router.navigate(returnToFrontDesk ? ['/front-desk'] : ['/bookings'], {
          queryParams:
            this.extendStayMode || this.checkInMode || this.transferRoomMode
              ? { pmsTab: 'staying' }
              : { view: 'records' },
        });
      },
      error: (err) => {
        console.error('existingBookingUpdate', err);
        const message =
          formatAbpRequestError(err) ||
          err?.error?.error?.message ||
          err?.message ||
          '';
        this.uiMsg.error(
          message ||
            (this.checkInMode
              ? 'تعذّر إتمام التسكين. تحقق من البيانات وحاول مرة أخرى.'
              : this.transferRoomMode
                ? this.ui.screenText('bookings', 'changeRoomError')
                : this.ui.screenText('bookings', 'editBookingError')),
        );
        this.loading = false;
      },
    });
  }

  private setRoomStatus(roomNumber: string, status: Room['status']): void {
    this.roomService.getRooms().subscribe((rooms) => {
      const room = rooms.find((r) => r.roomNumber === roomNumber);
      if (room) {
        this.roomService.updateRoom(room.id, { ...room, status }, false).subscribe();
      }
    });
  }

  roomOptionLabel(room: Room): string {
    return this.ui
      .screenText('booking', 'roomOptionFormat')
      .replace('{num}', String(room.roomNumber ?? ''))
      .replace('{type}', this.ui.roomTypeLabel(room.type));
  }

  get bookingPageTitle(): string {
    if (this.transferRoomMode) {
      return this.ui.screenText('booking', 'transferRoomTitle');
    }
    if (this.extendStayMode) {
      return this.ui.screenText('booking', 'extendStayTitle');
    }
    if (this.checkInMode) {
      if (this.walkInCheckInMode) {
        return '';
      }
      return this.ui.screenText('booking', 'checkInTitle');
    }
    if (this.editBookingMode) {
      return this.ui.screenText('booking', 'editBookingTitle');
    }
    if (this.reservationMode) {
      return this.ui.screenText('booking', 'reservationTitle');
    }
    return this.ui.screenText('booking', 'pageTitle');
  }

  get bookingPageSubtitle(): string {
    if (this.transferRoomMode) {
      return this.ui.screenText('booking', 'transferRoomSubtitle');
    }
    if (this.extendStayMode) {
      return this.ui.screenText('booking', 'extendStaySubtitle');
    }
    if (this.checkInMode) {
      if (this.walkInCheckInMode) {
        return '';
      }
      return this.ui.screenText('booking', 'checkInSubtitle');
    }
    if (this.editBookingMode) {
      return this.ui.screenText('booking', 'editBookingSubtitle');
    }
    if (this.reservationMode) {
      return this.ui.screenText('booking', 'reservationSubtitle');
    }
    return this.ui.screenText('booking', 'pageSubtitle');
  }

  get bookingSubmitLabel(): string {
    if (this.transferRoomMode) {
      return this.ui.screenText('booking', 'transferRoomSubmit');
    }
    if (this.extendStayMode) {
      return this.ui.screenText('booking', 'extendStaySubmit');
    }
    if (this.checkInMode) {
      return this.ui.screenText('booking', 'checkInSubmit');
    }
    if (this.editBookingMode) {
      return this.ui.screenText('booking', 'editBookingSubmit');
    }
    if (this.reservationMode) {
      return this.ui.screenText('booking', 'reservationSubmit');
    }
    return this.ui.screenText('booking', 'submitBtn');
  }

  get transferTargetRoomNumber(): string {
    return String(this.bookingForm.get('room_Number')?.value ?? '').trim();
  }

  /** حالة عرض النقل: انتظار اختيار / نفس الغرفة / جاهز للتأكيد */
  get transferDisplayState(): 'pending' | 'same' | 'ready' {
    const to = this.transferTargetRoomNumber;
    if (!to) {
      return 'pending';
    }
    const from = (this.transferCurrentRoomNumber ?? '').trim();
    if (from && to === from) {
      return 'same';
    }
    return 'ready';
  }

  transferStateLabel(): string {
    switch (this.transferDisplayState) {
      case 'pending':
        return this.ui.screenText('booking', 'transferRoomStatePending');
      case 'same':
        return this.ui.screenText('booking', 'transferRoomStateSame');
      default:
        return this.ui.screenText('booking', 'transferRoomStateReady');
    }
  }

  /** رمز العملة المعروض (غرفة محددة أو لغة الواجهة) */
  priceCurrencySymbol(): string {
    if (this.selectedRoom?.currencySymbol?.trim()) {
      return this.selectedRoom.currencySymbol.trim();
    }
    return this.hotelCurrency.symbol();
  }

  /** تسكين مباشر — اسم الموظف المسجّل */
  get walkInEmployeeName(): string {
    const user = this.hotelAuth.currentUser();
    if (!user) {
      return '—';
    }
    const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return full || user.userName?.trim() || '—';
  }

  /** تسكين مباشر — تاريخ المغادرة المتوقع */
  walkInCheckoutDate(): string {
    const start = toDateOnlyString(this.bookingForm.get('booking_Date')?.value);
    const days = Math.max(1, Number(this.bookingForm.get('stay_Days')?.value) || 1);
    if (!start) {
      return '—';
    }
    const d = new Date(`${start}T12:00:00`);
    d.setDate(d.getDate() + days);
    return toDateOnlyString(d) || '—';
  }

  /** تسكين مباشر — وقت المغادرة الافتراضي */
  walkInCheckoutTime(): string {
    return this.ui.screenText('booking', 'walkInDefaultCheckoutTime');
  }

  /** تسكين مباشر — وقت الوصول (نفس وقت الحجز) */
  walkInArrivalTime(): string {
    return String(this.bookingForm.get('booking_Time')?.value ?? '').trim() || '—';
  }

  /** عرض مصدر الحجز */
  bookingSourceDisplay(): string {
    const src = String(this.bookingForm.get('booking_Source')?.value ?? '').trim();
    if (!src) {
      return '—';
    }
    const keyBySource: Record<string, string> = {
      direct: 'sourceDirect',
      electronic: 'sourceElectronic',
      company: 'sourceCompany',
      institution: 'sourceInstitution',
      employee: 'sourceEmployee',
    };
    const key = keyBySource[src] ?? 'sourceDirect';
    return this.ui.screenText('booking', key);
  }

  /** تسكين مباشر — حالة الغرفة المحددة */
  walkInRoomStatusLabel(status?: Room['status'] | string | null): string {
    const keyByStatus: Record<string, string> = {
      available: 'statAvailable',
      dirty: 'statDirty',
      occupied: 'statOccupied',
      maintenance: 'statMaintenance',
      cleaning: 'statusCleaningShort',
      suspended: 'statSuspended',
    };
    const statusKey = keyByStatus[String(status ?? '').trim()] ?? 'statAvailable';
    const screen = statusKey === 'statusCleaningShort' ? 'bookings' : 'settings';
    return this.ui.screenText(screen, statusKey);
  }

  walkInSelectedRoomFeatures(): string[] {
    return parseRoomFeatures(this.selectedRoom?.roomFeatures);
  }

  walkInRoomFeaturesText(): string {
    const summary = roomFeaturesSummary(this.walkInSelectedRoomFeatures(), 6);
    return summary || '—';
  }

  walkInRoomDetail(value: string | number | null | undefined): string {
    const text = String(value ?? '').trim();
    return text || '—';
  }
}
