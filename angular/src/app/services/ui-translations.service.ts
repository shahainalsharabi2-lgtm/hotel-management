import { Injectable, Injector, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, forkJoin, map, of, tap } from 'rxjs';
import {
  extractLocaleFile,
  localeFileToJson,
  mergeLocaleFileIntoPayload,
  normalizeLocaleFileForSave,
  parseLocaleFileJson,
  prepareLocaleFileForForm,
} from '../utils/ui-translations-locale.util';
import type { UiLocaleFilePayload } from '../utils/ui-translations-locale.util';
import { environment } from '../../environments/environment';
import type {
  UiExtraLocaleCode,
  UiManualTranslationsPayload,
  UiTranslationsBlobDto,
} from '../utils/ui-translation.constants';
import {
  HOTEL_UI_LOCALE_STORAGE_KEY,
  SIDEBAR_NAV_KEYS,
  UI_AR_SCREEN_COPY_ASSET_OVERRIDES,
  UI_CHROME_KEYS,
  UI_EXTRA_LOCALES,
} from '../utils/ui-translation.constants';
import { roomTypeTranslationKey } from '../utils/room-type-i18n';
import { HotelCurrencyService, HOTEL_CURRENCY_UPDATED_EVENT } from './hotel-currency.service';
import { ArabicPreferenceCategoryService } from './arabic-preference-category.service';
import { HotelSystemSettingsLoader } from './hotel-system-settings.loader';
import type { HotelUiLocaleCode } from '../utils/hotel-currency.presets';
import { UiMessageService } from './ui-message.service';
import { uiLocalePickerOption } from '../utils/ui-locale-picker.util';

const DEFAULT_UI_LOCALE: UiExtraLocaleCode | 'ar' = 'ar';

@Injectable({
  providedIn: 'root',
})
export class UiTranslationsService {
  private readonly http = inject(HttpClient);
  private readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly injector = inject(Injector);

  /** يُحمَّل من ملفات JSON على الخادم (UiTranslations/*.json) */
  private readonly payload = signal<UiManualTranslationsPayload>({});

  readonly displayLocale = signal<UiExtraLocaleCode | 'ar'>(DEFAULT_UI_LOCALE);

  readonly extraLocales = UI_EXTRA_LOCALES;

  private get apiUrl(): string {
    return `${environment.apis.default.url}/api/app/ui-translations-blob`;
  }

  constructor() {
    this.restoreLocaleFromStorage();
  }

  private restoreLocaleFromStorage(): void {
    try {
      const raw = localStorage.getItem(HOTEL_UI_LOCALE_STORAGE_KEY);
      if (raw === 'ar' || raw === 'fr' || raw === 'id' || raw === 'tr' || raw === 'zh-Hans') {
        this.displayLocale.set(raw);
        if (raw !== 'ar') {
          this.hotelCurrency.syncForUiLocale(raw as HotelUiLocaleCode, { persist: false });
        }
      }
    } catch {
      /* ignore */
    }
  }

  setDisplayLocale(locale: UiExtraLocaleCode | 'ar', options?: { skipToast?: boolean }): void {
    const previous = this.displayLocale();
    if (previous === locale) {
      return;
    }
    this.displayLocale.set(locale);
    try {
      localStorage.setItem(HOTEL_UI_LOCALE_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    if (locale === 'ar') {
      this.injector.get(ArabicPreferenceCategoryService).applyCurrencyForSelectedCategory();
    } else {
      this.hotelCurrency.syncForUiLocale(locale as HotelUiLocaleCode, { persist: false });
      this.injector.get(HotelSystemSettingsLoader).save().subscribe({
        next: () => window.dispatchEvent(new Event(HOTEL_CURRENCY_UPDATED_EVENT)),
        error: () => window.dispatchEvent(new Event(HOTEL_CURRENCY_UPDATED_EVENT)),
      });
    }
    window.dispatchEvent(new Event('hotelUiLocaleChanged'));
    if (!options?.skipToast) {
      this.showLocaleChangedToast(locale);
    }
  }

  private showLocaleChangedToast(locale: UiExtraLocaleCode | 'ar'): void {
    const opt = uiLocalePickerOption(locale);
    const label = this.screenText('settings', opt.labelKey);
    const message = this.chromeLabel('toastLocaleChanged').replace('{0}', label);
    this.injector.get(UiMessageService).success(message, {
      title: this.chromeLabel('toastLocaleChangedTitle'),
    });
  }

  reloadFromBackend(done?: () => void): void {
    this.fetchFromBackend(() => {
      window.dispatchEvent(new Event('hotelUiTranslationsUpdated'));
      done?.();
    });
  }

  fetchFromBackend(done?: () => void): void {
    this.http.get<UiTranslationsBlobDto>(this.apiUrl).subscribe({
      next: (dto) => {
        this.applyPayloadJson(dto?.payloadJson);
        this.mergeArabicSettingsScreenCopyFromAssets(done);
      },
      error: () => {
        this.loadFallbackFromAssets(done);
      },
    });
  }

  /** يكمّل مفاتيح العربية الناقصة من ملف ar.json المحلي */
  private mergeArabicSettingsScreenCopyFromAssets(done?: () => void): void {
    this.http
      .get<UiLocaleFilePayload>('/assets/ui-translations/ar.json')
      .pipe(catchError(() => of(null)))
      .subscribe((file) => {
        const fromAssets = file?.screenCopy;
        if (fromAssets) {
          const current = this.payload();
          const arScreen = { ...(current.screenCopy?.ar ?? {}) };
          for (const [screenId, msgs] of Object.entries(fromAssets)) {
            if (!msgs || typeof msgs !== 'object') {
              continue;
            }
            const merged = { ...(arScreen[screenId] ?? {}) };
            const forceFromAssets = UI_AR_SCREEN_COPY_ASSET_OVERRIDES.has(screenId);
            for (const [key, value] of Object.entries(msgs)) {
              const trimmed = (value ?? '').trim();
              if (!trimmed) {
                continue;
              }
              const existing = (merged[key] ?? '').trim();
              if (forceFromAssets || !existing || existing === key) {
                merged[key] = trimmed;
              }
            }
            arScreen[screenId] = merged;
          }
          this.payload.set({
            ...current,
            screenCopy: { ...current.screenCopy, ar: arScreen },
          });
          window.dispatchEvent(new Event('hotelUiTranslationsUpdated'));
        }
        done?.();
      });
  }

  /** When API is unavailable (e.g. Render down), use bundled locale JSON files. */
  private loadFallbackFromAssets(done?: () => void): void {
    const locales: Array<UiExtraLocaleCode | 'ar'> = ['ar', 'fr', 'id', 'tr', 'zh-Hans'];
    forkJoin(
      locales.map((locale) =>
        this.http.get<UiLocaleFilePayload>(`/assets/ui-translations/${locale}.json`).pipe(
          catchError(() => of(null)),
        ),
      ),
    ).subscribe((files) => {
      let payload: UiManualTranslationsPayload = {};
      locales.forEach((locale, index) => {
        const file = files[index];
        if (file) {
          payload = mergeLocaleFileIntoPayload(payload, locale, file);
        }
      });
      this.payload.set(payload);
      window.dispatchEvent(new Event('hotelUiTranslationsUpdated'));
      this.mergeArabicSettingsScreenCopyFromAssets(done);
    });
  }

  applyPayloadJson(json: string | undefined | null): void {
    if (!json || json.trim() === '') {
      this.payload.set({});
      return;
    }
    try {
      const parsed = JSON.parse(json) as UiManualTranslationsPayload;
      this.payload.set(parsed && typeof parsed === 'object' ? parsed : {});
    } catch {
      this.payload.set({});
    }
  }

  getPayload(): UiManualTranslationsPayload {
    return structuredClone(this.payload()) as UiManualTranslationsPayload;
  }

  readPayloadForEdit(): UiManualTranslationsPayload {
    return structuredClone(this.payload()) as UiManualTranslationsPayload;
  }

  savePayload(payload: UiManualTranslationsPayload) {
    const body: UiTranslationsBlobDto = {
      payloadJson: JSON.stringify(payload ?? {}, null, 0),
    };
    return this.http.put<void>(this.apiUrl, body).pipe(
      tap(() => {
        this.payload.set(JSON.parse(JSON.stringify(payload ?? {})) as UiManualTranslationsPayload);
        window.dispatchEvent(new Event('hotelUiTranslationsUpdated'));
      }),
      map(() => true as const),
      catchError((err) => {
        console.error('UiTranslationsService.savePayload', err);
        return of(false as const);
      }),
    );
  }

  serializeLocaleForEdit(locale: UiExtraLocaleCode | 'ar'): string {
    return localeFileToJson(extractLocaleFile(this.getPayload(), locale));
  }

  loadLocaleFileForForm(locale: UiExtraLocaleCode | 'ar'): UiLocaleFilePayload {
    const file = extractLocaleFile(this.getPayload(), locale);
    const reference = extractLocaleFile(this.getPayload(), 'ar');
    return prepareLocaleFileForForm(file, reference);
  }

  saveLocaleFileForm(locale: UiExtraLocaleCode | 'ar', form: UiLocaleFilePayload) {
    const file = normalizeLocaleFileForSave(form);
    const merged = mergeLocaleFileIntoPayload(this.getPayload(), locale, file);
    return this.savePayload(merged);
  }

  saveLocaleFileJson(locale: UiExtraLocaleCode | 'ar', jsonText: string) {
    try {
      const file = parseLocaleFileJson(jsonText);
      const merged = mergeLocaleFileIntoPayload(this.getPayload(), locale, file);
      return this.savePayload(merged);
    } catch (err) {
      console.error('UiTranslationsService.saveLocaleFileJson', err);
      return of(false as const);
    }
  }

  sidebarLabel(routeKey: string): string {
    const locale = this.displayLocale();
    const fallbackAr =
      SIDEBAR_NAV_KEYS.find((k) => k.routeKey === routeKey)?.arabic ?? routeKey;
    const arabicResolved =
      this.payload().sidebarNav?.ar?.[routeKey]?.trim() || fallbackAr;
    return this.resolveLocalized(
      locale,
      () => arabicResolved,
      () => this.payload().sidebarNav?.[locale]?.[routeKey],
      routeKey,
    );
  }

  brandSubtitleDefaultArabic(): string {
    return 'إدارة الفندق';
  }

  brandSubtitle(): string {
    const fallbackAr = this.brandSubtitleDefaultArabic();
    const arabicResolved =
      this.payload().brandSubtitle?.ar?.trim() || fallbackAr;
    const locale = this.displayLocale();
    return this.resolveLocalized(
      locale,
      () => arabicResolved,
      () => this.payload().brandSubtitle?.[locale],
      fallbackAr,
    );
  }

  chromeLabel(key: string): string {
    const fallbackAr = UI_CHROME_KEYS.find((k) => k.key === key)?.arabic ?? key;
    const arabicResolved = this.payload().chrome?.ar?.[key]?.trim() || fallbackAr;
    const locale = this.displayLocale();
    return this.resolveLocalized(
      locale,
      () => arabicResolved,
      () => this.payload().chrome?.[locale]?.[key],
      key,
    );
  }

  roomTypeLabel(storedType: string | null | undefined): string {
    const raw = (storedType ?? '').trim();
    if (!raw) {
      return '—';
    }
    const msgKey = roomTypeTranslationKey(raw);
    if (!msgKey) {
      return raw;
    }
    return this.screenText('rooms', msgKey);
  }

  screenText(screenId: string, msgKey: string): string {
    const arabicResolved =
      this.payload().screenCopy?.ar?.[screenId]?.[msgKey]?.trim() || msgKey;
    const locale = this.displayLocale();
    return this.resolveLocalized(
      locale,
      () => arabicResolved,
      () => this.payload().screenCopy?.[locale]?.[screenId]?.[msgKey],
      msgKey,
    );
  }

  private resolveLocalized(
    locale: UiExtraLocaleCode | 'ar',
    arabic: () => string | undefined,
    fromPayload: () => string | undefined,
    lastResort: string,
  ): string {
    const ar = arabic()?.trim();
    if (locale === 'ar') {
      return ar || lastResort;
    }
    const raw = fromPayload();
    if (raw !== undefined) {
      return raw.trim();
    }
    return ar || lastResort;
  }
}
