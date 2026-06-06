import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { UiTranslationsService } from '../../services/ui-translations.service';
import { UiMessageService } from '../../services/ui-message.service';
import { bindUiTranslationRefresh } from '../../utils/ui-screen-i18n.helper';
import type { GeneralCodeCategoryId } from '../general-codes.constants';
import { generalCodeShowsForeignName, generalCodeShowsDescription } from '../general-codes.constants';
import {
  CreateUpdateGeneralCodeItem,
  GeneralCodeItem,
  GeneralCodesService,
} from '../general-codes.service';
import {
  FLAG_UPLOAD_ACCEPT,
  isAllowedFlagUploadFile,
  MAX_FLAG_UPLOAD_BYTES,
  prepareFlagDataUrlForDbStorage,
  readFlagUploadAsDataUrl,
} from '../../utils/flag-upload.util';
import { resolveArabicRegionProfile } from '../../utils/arabic-region-profile.util';
import { ArabicPreferenceCategoryService } from '../../services/arabic-preference-category.service';
import { HotelAuthService } from '../../services/hotel-auth.service';
import { PreferenceCategoryCurrencyService } from '../../services/preference-category-currency.service';
import {
  decodePrefCategoryDescription,
  applyPrefCategoryDescription,
  canEncodePrefCategoryMetadata,
  prefCategoryFieldsPersisted,
  prefCategoryFlagFilePersisted,
  prefCategoryFlagDataBudget,
  prefCategoryImageTooLargeForDb,
  resolvePrefCategoryFlagFile,
  withPrefCategoryPayloadDescription,
  withRoomClassPayloadDescription,
  roomClassCountsPersisted,
} from '../../utils/general-code-item.util';
import { formatPriceCodeDiscountDisplay, normalizePriceCodeDiscountInput } from '../../utils/price-code.util';
import {
  prefCategoryCurrencyCode,
  suggestCurrencyForRegion,
} from '../../utils/pref-category-currency.util';
import {
  PRESET_FLAG_FILES,
  SYSTEM_UI_LANGUAGES,
  isKnownSystemLanguageCode,
  normalizeFlagFile,
  prefCategoryDialCode,
  prefCategoryFlagSrc,
  type SystemUiLanguageCode,
} from '../../utils/pref-category.util';

@Component({
  selector: 'app-general-code-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './general-code-panel.component.html',
  styleUrls: ['./general-code-panel.component.scss'],
})
export class GeneralCodePanelComponent implements OnInit, OnChanges {
  @Input({ required: true }) category!: GeneralCodeCategoryId;
  @Input({ required: true }) titleKey!: string;
  @Input({ required: true }) descriptionKey!: string;

  readonly ui = inject(UiTranslationsService);
  private readonly uiMsg = inject(UiMessageService);
  private readonly auth = inject(HotelAuthService);
  private readonly arabicPref = inject(ArabicPreferenceCategoryService);
  private readonly api = inject(GeneralCodesService);
  private readonly prefCategoryCurrency = inject(PreferenceCategoryCurrencyService);
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly systemLanguages = SYSTEM_UI_LANGUAGES;
  readonly presetFlags = PRESET_FLAG_FILES;
  readonly flagUploadAccept = FLAG_UPLOAD_ACCEPT;

  items: GeneralCodeItem[] = [];
  loading = false;
  saving = false;
  modalOpen = false;
  editingId: string | null = null;
  errorMessage = '';
  flagImageDataDraft = '';
  uploadedFlagFileName = '';
  pendingFlagFile: File | null = null;
  pendingFlagFileName = '';
  flagUploadApplying = false;

  readonly form = this.fb.group({
    languageCode: ['ar' as SystemUiLanguageCode, Validators.required],
    name: ['', [Validators.required, Validators.maxLength(256)]],
    fName: ['', Validators.maxLength(256)],
    countryDialCode: ['', Validators.maxLength(32)],
    flagImageName: ['', Validators.maxLength(256)],
    description: ['', Validators.maxLength(1024)],
    displayOrder: [0, [Validators.required, Validators.min(0)]],
    prefCurrencyCode: ['', Validators.maxLength(16)],
    roomCount: [null as number | null, [Validators.min(0)]],
    regularBedCount: [null as number | null, [Validators.min(0)]],
    familyBedCount: [null as number | null, [Validators.min(0)]],
  });

  get isRoomClasses(): boolean {
    return this.category === 'room-classes';
  }

  get isPrefCategory(): boolean {
    return this.category === 'preference-category';
  }

  get isPriceCodeType(): boolean {
    return this.category === 'preference-type';
  }

  get showForeignName(): boolean {
    return generalCodeShowsForeignName(this.category);
  }

  get showDescription(): boolean {
    return generalCodeShowsDescription(this.category);
  }

  get nameColumnLabelKey(): string {
    return this.isPrefCategory ? 'prefCatColName' : 'colName';
  }

  get foreignNameColumnLabelKey(): string {
    return this.isPrefCategory ? 'prefCatColRegion' : 'colFName';
  }

  get nameFieldPlaceholder(): string {
    return this.isPrefCategory ? this.ui.screenText('generalCodes', 'prefCatNamePlaceholder') : '';
  }

  get foreignNameFieldPlaceholder(): string {
    return this.isPrefCategory ? this.ui.screenText('generalCodes', 'prefCatRegionPlaceholder') : '';
  }

  panelDescription(): string {
    return (this.ui.screenText('generalCodes', this.descriptionKey) ?? '').trim();
  }

  get canSaveForm(): boolean {
    if (this.saving || !this.canEdit) {
      return false;
    }
    const nameOk = this.form.get('name')?.valid ?? false;
    const orderOk = this.form.get('displayOrder')?.valid ?? false;
    if (this.isPrefCategory) {
      const region = (this.form.get('fName')?.value ?? '').trim();
      const dial = (this.form.get('countryDialCode')?.value ?? '').trim();
      const currencyCode = (this.form.get('prefCurrencyCode')?.value ?? '').trim();
      return nameOk && orderOk && !!region && !!dial && !!currencyCode;
    }
    return nameOk && orderOk;
  }

  get canEdit(): boolean {
    return this.auth.canManageSettings();
  }

  ngOnInit(): void {
    bindUiTranslationRefresh(this.cdr, this.destroyRef);
    this.form
      .get('fName')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((region) => {
        if (!this.isPrefCategory || !this.modalOpen) {
          return;
        }
        if (this.flagImageDataDraft || this.pendingFlagFile) {
          return;
        }
        const profile = resolveArabicRegionProfile(region);
        const suggestedFlag = profile.flagSrc.replace(/^assets\/flags\//, '');
        const dial = (this.form.get('countryDialCode')?.value ?? '').trim();
        const currencyCode = (this.form.get('prefCurrencyCode')?.value ?? '').trim();
        const patch: {
          flagImageName?: string;
          countryDialCode?: string;
          prefCurrencyCode?: string;
        } = {};
        if (suggestedFlag) {
          patch.flagImageName = suggestedFlag;
        }
        if (!dial && profile.dialCode) {
          patch.countryDialCode = profile.dialCode;
        }
        if (!currencyCode) {
          patch.prefCurrencyCode = suggestCurrencyForRegion(region).code;
        }
        if (Object.keys(patch).length) {
          this.form.patchValue(patch, { emitEvent: false });
          this.cdr.markForCheck();
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['category'] && this.category) {
      this.loadItems();
    }
  }

  loadItems(): void {
    this.loading = true;
    this.errorMessage = '';
    this.api
      .getList(this.category)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (items) => {
          this.items = items;
          this.syncPrefCategoryViews();
        },
        error: () => {
          this.errorMessage = this.ui.screenText('generalCodes', 'loadFailed');
        },
      });
  }

  languageLabel(code: string): string {
    const hit = SYSTEM_UI_LANGUAGES.find((x) => x.code === code);
    if (hit) {
      return this.ui.screenText('settings', hit.labelKey);
    }
    return code || '—';
  }

  itemFlagSrc(item: GeneralCodeItem): string {
    const view = this.isPrefCategory ? applyPrefCategoryDescription(item) : item;
    return prefCategoryFlagSrc(view);
  }

  itemDialCode(item: GeneralCodeItem): string {
    return prefCategoryDialCode(item);
  }

  itemFinancialValue(item: GeneralCodeItem): string {
    return formatPriceCodeDiscountDisplay(item.description);
  }

  itemPrefCurrencyCode(item: GeneralCodeItem): string {
    return prefCategoryCurrencyCode(item);
  }

  modalFlagPreview(): string {
    if (this.flagImageDataDraft) {
      return this.flagImageDataDraft;
    }
    const region = (this.form.get('fName')?.value ?? '').trim();
    const name = (this.form.get('flagImageName')?.value ?? '').trim();
    const flagFile = normalizeFlagFile(name) || resolvePrefCategoryFlagFile({ flagImageName: name, flagImageData: null, fName: region, description: null });
    if (flagFile) {
      return prefCategoryFlagSrc({ flagImageName: flagFile, flagImageData: null, fName: region });
    }
    return resolveArabicRegionProfile(region).flagSrc;
  }

  onPresetFlagPick(fileName: string): void {
    this.flagImageDataDraft = '';
    this.uploadedFlagFileName = '';
    this.clearPendingFlagFile();
    this.form.patchValue({ flagImageName: normalizeFlagFile(fileName) || fileName });
    this.cdr.markForCheck();
  }

  onFlagFileChosen(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!isAllowedFlagUploadFile(file)) {
      this.errorMessage = this.ui.screenText('generalCodes', 'prefCatFlagInvalidType');
      return;
    }
    if (file.size > MAX_FLAG_UPLOAD_BYTES) {
      this.errorMessage = this.ui.screenText('generalCodes', 'prefCatFlagTooLarge');
      return;
    }
    this.pendingFlagFile = file;
    this.pendingFlagFileName = file.name;
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  applyPendingFlagUpload(): void {
    const file = this.pendingFlagFile;
    if (!file || this.flagUploadApplying) {
      return;
    }
    this.flagUploadApplying = true;
    void readFlagUploadAsDataUrl(file)
      .then((dataUrl) => {
        const dial = (this.form.get('countryDialCode')?.value ?? '').trim();
        const budget = prefCategoryFlagDataBudget(dial, { withImage: true });
        return prepareFlagDataUrlForDbStorage(dataUrl, budget);
      })
      .then((stored) => {
        if (!stored) {
          this.errorMessage = this.ui.screenText('generalCodes', 'prefCatFlagCompressFailed');
          return;
        }
        this.flagImageDataDraft = stored;
        this.uploadedFlagFileName = file.name;
        this.form.patchValue({ flagImageName: file.name });
        this.clearPendingFlagFile();
        this.errorMessage = '';
        this.cdr.markForCheck();
      })
      .catch(() => {
        this.errorMessage = this.ui.screenText('generalCodes', 'prefCatFlagReadFailed');
      })
      .finally(() => {
        this.flagUploadApplying = false;
        this.cdr.markForCheck();
      });
  }

  clearUploadedFlag(): void {
    this.flagImageDataDraft = '';
    this.uploadedFlagFileName = '';
    this.clearPendingFlagFile();
    this.form.patchValue({ flagImageName: '' });
    this.cdr.markForCheck();
  }

  private clearPendingFlagFile(): void {
    this.pendingFlagFile = null;
    this.pendingFlagFileName = '';
  }

  openCreate(): void {
    if (!this.canEdit) {
      return;
    }
    this.editingId = null;
    this.flagImageDataDraft = '';
    this.uploadedFlagFileName = '';
    this.clearPendingFlagFile();
    if (this.isPrefCategory) {
      this.form.reset({
        languageCode: 'ar',
        name: 'ar',
        fName: '',
        countryDialCode: '',
        flagImageName: '',
        description: '',
        displayOrder: this.nextDisplayOrder(),
        prefCurrencyCode: '',
        roomCount: null,
        regularBedCount: null,
        familyBedCount: null,
      });
    } else {
      this.form.reset({
        languageCode: 'ar',
        name: '',
        fName: '',
        countryDialCode: '',
        flagImageName: '',
        description: '',
        displayOrder: this.nextDisplayOrder(),
        prefCurrencyCode: '',
        roomCount: null,
        regularBedCount: null,
        familyBedCount: null,
      });
    }
    this.modalOpen = true;
  }

  openEdit(item: GeneralCodeItem): void {
    if (!this.canEdit) {
      return;
    }
    const view = this.isPrefCategory ? applyPrefCategoryDescription(item) : item;
    this.editingId = view.id;
    this.flagImageDataDraft = (view.flagImageData ?? item.flagImageData ?? '').trim();
    this.uploadedFlagFileName = this.flagImageDataDraft ? (view.flagImageName ?? '').trim() : '';
    if (this.isPrefCategory) {
      const code = isKnownSystemLanguageCode(view.name) ? view.name : 'ar';
      const extras = decodePrefCategoryDescription(view.description);
      const region = view.fName ?? '';
      const suggested = suggestCurrencyForRegion(region);
      const flagFile = resolvePrefCategoryFlagFile(view) || resolveArabicRegionProfile(region).flagSrc.replace(/^assets\/flags\//, '');
      this.form.reset({
        languageCode: code,
        name: code,
        fName: region,
        countryDialCode: view.countryDialCode ?? extras.countryDialCode ?? '',
        flagImageName: flagFile,
        description: '',
        displayOrder: view.displayOrder,
        prefCurrencyCode: extras.currencyCode ?? suggested.code,
        roomCount: null,
        regularBedCount: null,
        familyBedCount: null,
      });
    } else {
      this.form.reset({
        languageCode: 'ar',
        name: item.name,
        fName: item.fName ?? '',
        countryDialCode: '',
        flagImageName: '',
        description: item.description ?? '',
        displayOrder: item.displayOrder,
        prefCurrencyCode: '',
        roomCount: item.roomCount ?? null,
        regularBedCount: item.regularBedCount ?? null,
        familyBedCount: item.familyBedCount ?? null,
      });
    }
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
    this.editingId = null;
    this.flagImageDataDraft = '';
    this.uploadedFlagFileName = '';
    this.clearPendingFlagFile();
    this.flagUploadApplying = false;
  }

  save(): void {
    if (!this.canEdit) {
      return;
    }
    if (this.isPrefCategory) {
      const code = this.form.get('languageCode')?.value ?? 'ar';
      this.form.patchValue({ name: code }, { emitEvent: false });
      const region = (this.form.get('fName')?.value ?? '').trim();
      const dial = (this.form.get('countryDialCode')?.value ?? '').trim();
      const currencyCode = (this.form.get('prefCurrencyCode')?.value ?? '').trim();
      if (!region || !dial || !currencyCode) {
        this.form.markAllAsTouched();
        return;
      }
    }

    if (!this.canSaveForm) {
      this.form.markAllAsTouched();
      return;
    }

    void this.persistSave();
  }

  private async persistSave(): Promise<void> {
    const raw = this.form.getRawValue();
    const payload = this.buildPayload(raw);
    const currencyCode = (raw.prefCurrencyCode ?? '').trim().toUpperCase();
    const currencyMeta = { currencyCode, currencySymbol: currencyCode };

    if (this.isPrefCategory && !canEncodePrefCategoryMetadata(payload, currencyMeta)) {
      this.errorMessage = this.ui.screenText('generalCodes', 'prefCatSaveApiIncomplete');
      this.cdr.markForCheck();
      return;
    }

    const savePayload = this.isPrefCategory
      ? withPrefCategoryPayloadDescription(payload, currencyMeta, {
          embedFlagImageInDescription: false,
        })
      : payload;

    const wasEdit = !!this.editingId;
    this.saving = true;
    this.cdr.markForCheck();
    const req$ = this.editingId
      ? this.api.update(this.editingId, savePayload)
      : this.api.create(this.category, savePayload);

    req$
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          if (this.isPrefCategory) {
            if (!prefCategoryFieldsPersisted(saved, payload) || !prefCategoryFlagFilePersisted(saved, payload)) {
              void this.tryLegacyDescriptionFlagSave(saved.id, payload, currencyMeta, wasEdit);
              return;
            }
          }
          if (this.isRoomClasses && !roomClassCountsPersisted(saved, payload)) {
            this.errorMessage = this.ui.screenText('generalCodes', 'saveFailed');
            this.loadItems();
            this.notifySaveError();
            return;
          }
          this.closeModal();
          this.loadItems();
          this.notifySaveSuccess(wasEdit);
        },
        error: () => {
          this.errorMessage = this.ui.screenText('generalCodes', 'saveFailed');
          this.notifySaveError();
        },
      });
  }

  /** للـ API القديم: إعادة المحاولة بحفظ العلم داخل Description */
  private async tryLegacyDescriptionFlagSave(
    id: string,
    payload: CreateUpdateGeneralCodeItem,
    currency: { currencyCode: string; currencySymbol: string },
    wasEdit = true,
  ): Promise<void> {
    const flagData = (payload.flagImageData ?? '').trim();
    if (!flagData) {
      await this.retryPresetFlagDescriptionSave(id, payload, currency, wasEdit);
      return;
    }

    const dial = (payload.countryDialCode ?? '').trim();
    const budget = prefCategoryFlagDataBudget(dial, {
      withImage: true,
      flagImageName: payload.flagImageName,
    });
    const compressed = await prepareFlagDataUrlForDbStorage(flagData, budget);
    if (!compressed) {
      this.errorMessage = this.ui.screenText('generalCodes', 'prefCatFlagCompressFailed');
      this.loadItems();
      this.cdr.markForCheck();
      return;
    }

    const legacyPayload = withPrefCategoryPayloadDescription(
      { ...payload, flagImageData: compressed, flagImageName: null },
      currency,
      { embedFlagImageInDescription: true },
    );
    if (
      !legacyPayload.description ||
      prefCategoryImageTooLargeForDb({ ...payload, flagImageData: compressed }, currency)
    ) {
      this.errorMessage = this.ui.screenText('generalCodes', 'prefCatFlagCompressFailed');
      this.loadItems();
      this.cdr.markForCheck();
      return;
    }

    this.runLegacyPrefCategoryUpdate(id, legacyPayload, payload, compressed, wasEdit);
  }

  private async retryPresetFlagDescriptionSave(
    id: string,
    payload: CreateUpdateGeneralCodeItem,
    currency: { currencyCode: string; currencySymbol: string },
    wasEdit = true,
  ): Promise<void> {
    const legacyPayload = withPrefCategoryPayloadDescription(payload, currency, {
      embedFlagImageInDescription: false,
    });
    if (!legacyPayload.description) {
      this.errorMessage = this.ui.screenText('generalCodes', 'prefCatSaveApiIncomplete');
      this.loadItems();
      this.cdr.markForCheck();
      return;
    }
    this.runLegacyPrefCategoryUpdate(id, legacyPayload, payload, undefined, wasEdit);
  }

  private runLegacyPrefCategoryUpdate(
    id: string,
    legacyPayload: CreateUpdateGeneralCodeItem,
    payload: CreateUpdateGeneralCodeItem,
    compressedFlagData?: string,
    wasEdit = true,
  ): void {
    this.saving = true;
    this.cdr.markForCheck();
    const verifyPayload = compressedFlagData ? { ...payload, flagImageData: compressedFlagData } : payload;
    this.api
      .update(id, legacyPayload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (saved) => {
          if (
            !prefCategoryFieldsPersisted(saved, verifyPayload) ||
            !prefCategoryFlagFilePersisted(saved, verifyPayload)
          ) {
            this.errorMessage = this.ui.screenText('generalCodes', 'prefCatSaveApiIncomplete');
            this.loadItems();
            return;
          }
          this.closeModal();
          this.loadItems();
          this.notifySaveSuccess(wasEdit);
        },
        error: () => {
          this.errorMessage = this.ui.screenText('generalCodes', 'saveFailed');
          this.notifySaveError();
        },
      });
  }

  private notifySaveSuccess(wasEdit: boolean): void {
    const message = this.ui.screenText('generalCodes', wasEdit ? 'saveSuccess' : 'addSuccess');
    this.uiMsg.success(message, { title: this.ui.chromeLabel('toastSavedTitle') });
  }

  private notifySaveError(messageKey = 'saveFailed'): void {
    this.uiMsg.error(this.ui.screenText('generalCodes', messageKey), {
      title: this.ui.chromeLabel('toastSaveFailedTitle'),
    });
  }

  deleteItem(item: GeneralCodeItem): void {
    if (!this.canEdit) {
      return;
    }
    const msg = this.ui.screenText('generalCodes', 'confirmDelete');
    const label = this.isPrefCategory
      ? `${this.languageLabel(item.name)} — ${item.fName ?? ''}`
      : item.name;
    if (!window.confirm(`${msg}\n${label}`)) {
      return;
    }

    this.api
      .delete(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loadItems();
          this.uiMsg.success(this.ui.screenText('generalCodes', 'deleteSuccess'), {
            title: this.ui.chromeLabel('toastSavedTitle'),
          });
        },
        error: () => {
          this.errorMessage = this.ui.screenText('generalCodes', 'deleteFailed');
          this.uiMsg.error(this.ui.screenText('generalCodes', 'deleteFailed'), {
            title: this.ui.chromeLabel('toastSaveFailedTitle'),
          });
        },
      });
  }

  private buildPayload(raw: ReturnType<typeof this.form.getRawValue>): CreateUpdateGeneralCodeItem {
    if (this.isPrefCategory) {
      const uploaded = this.flagImageDataDraft.trim();
      const fileName = normalizeFlagFile(raw.flagImageName);
      const region = (raw.fName ?? '').trim();
      const profile = resolveArabicRegionProfile(region);
      const regionFlagFile = normalizeFlagFile(profile.flagSrc.replace(/^assets\/flags\//, ''));
      let flagImageName = uploaded ? this.uploadedFlagFileName || fileName || null : fileName || regionFlagFile || null;
      if (flagImageName) {
        flagImageName = normalizeFlagFile(flagImageName) || flagImageName;
      }
      return {
        name: (raw.languageCode ?? raw.name ?? 'ar').trim(),
        fName: region,
        countryDialCode: (raw.countryDialCode ?? '').trim(),
        flagImageName,
        flagImageData: uploaded || null,
        description: null,
        displayOrder: raw.displayOrder ?? 0,
      };
    }

    if (this.isRoomClasses) {
      return withRoomClassPayloadDescription({
        name: raw.name ?? '',
        displayOrder: raw.displayOrder ?? 0,
        fName: this.resolveForeignName(raw.fName ?? ''),
        roomCount: this.normalizeOptionalCount(raw.roomCount),
        regularBedCount: this.normalizeOptionalCount(raw.regularBedCount),
        familyBedCount: this.normalizeOptionalCount(raw.familyBedCount),
      });
    }

    return {
      name: raw.name ?? '',
      description: this.resolveDescription(raw.description ?? ''),
      displayOrder: raw.displayOrder ?? 0,
      fName: this.resolveForeignName(raw.fName ?? ''),
    };
  }

  formatCount(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }
    return String(value);
  }

  private normalizeOptionalCount(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      return null;
    }
    return Math.trunc(num);
  }

  private normalizeFinancialDescription(formValue: string): string {
    return normalizePriceCodeDiscountInput(formValue);
  }

  private syncPrefCategoryViews(): void {
    if (this.category !== 'preference-category') {
      return;
    }
    this.arabicPref.reload();
    this.prefCategoryCurrency.reload();
  }

  private nextDisplayOrder(): number {
    if (!this.items.length) {
      return 1;
    }
    return Math.max(...this.items.map((x) => x.displayOrder)) + 1;
  }

  private resolveForeignName(formValue: string): string {
    if (this.showForeignName) {
      return formValue;
    }
    if (this.editingId) {
      return this.items.find((x) => x.id === this.editingId)?.fName ?? '';
    }
    return '';
  }

  private resolveDescription(formValue: string): string {
    if (this.isPriceCodeType) {
      return this.normalizeFinancialDescription(formValue);
    }
    if (this.showDescription) {
      return formValue;
    }
    if (this.editingId) {
      return this.items.find((x) => x.id === this.editingId)?.description ?? '';
    }
    return '';
  }
}
