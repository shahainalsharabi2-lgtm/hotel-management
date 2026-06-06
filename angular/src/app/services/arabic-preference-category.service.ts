import { Injectable, inject, signal } from '@angular/core';
import { GeneralCodesService, type GeneralCodeItem } from '../general-codes/general-codes.service';
import { UiTranslationsService } from './ui-translations.service';
import {
  resolveArabicRegionProfile,
  formatArabicCategoryLabel,
  type ArabicRegionProfile,
} from '../utils/arabic-region-profile.util';
import type { LocalePhoneDisplay } from '../utils/locale-phone';
import { SYSTEM_UI_LANGUAGES, prefCategoryProfile } from '../utils/pref-category.util';
import { prefCategoryCurrencyCode } from '../utils/pref-category-currency.util';
import {
  HOTEL_CURRENCY_UPDATED_EVENT,
  HotelCurrencyService,
} from './hotel-currency.service';
import { HotelSystemSettingsLoader } from './hotel-system-settings.loader';

export interface ArabicPreferenceCategoryView {
  id: string;
  language: string;
  region: string;
  label: string;
  displayOrder: number;
  currencyCode: string;
  profile: ArabicRegionProfile;
}

interface CachedArabicPreferenceProfile {
  flagEmoji: string;
  flagSrc: string;
  dialCode: string;
  maxLength: number;
  localeTag: string;
  shortCode: string;
  label?: string;
  region?: string;
}

const STORAGE_KEY = 'hotelArabicPreferenceCategoryId';
const PROFILE_CACHE_KEY = 'hotelArabicPreferenceCategoryProfile';

@Injectable({ providedIn: 'root' })
export class ArabicPreferenceCategoryService {
  private readonly generalCodes = inject(GeneralCodesService);
  private readonly ui = inject(UiTranslationsService);
  private readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly hotelSystemSettings = inject(HotelSystemSettingsLoader);

  readonly categories = signal<ArabicPreferenceCategoryView[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly loading = signal(false);

  private readonly cachedProfile = signal<CachedArabicPreferenceProfile | null>(null);

  constructor() {
    this.restoreSelection();
    this.restoreProfileCache();
    this.loadCategories();
  }

  selectedCategory(): ArabicPreferenceCategoryView | null {
    const id = this.selectedId();
    const list = this.categories();
    if (id && list.length) {
      const hit = list.find((c) => c.id === id);
      if (hit) {
        return hit;
      }
    }
    if (!id && list.length) {
      return list[0];
    }
    return null;
  }

  /** يعمل فوراً بعد التحديث — من الذاكرة المحلية قبل اكتمال تحميل API */
  selectedProfile(): ArabicRegionProfile {
    const cat = this.selectedCategory();
    if (cat) {
      return cat.profile;
    }
    const cached = this.cachedProfile();
    if (cached && this.selectedId()) {
      return {
        flagEmoji: cached.flagEmoji,
        flagSrc: cached.flagSrc,
        dialCode: cached.dialCode,
        maxLength: cached.maxLength,
        localeTag: cached.localeTag,
        shortCode: cached.shortCode,
      };
    }
    return resolveArabicRegionProfile('');
  }

  phoneDisplay(): LocalePhoneDisplay {
    const { flagEmoji, flagSrc, dialCode, maxLength } = this.selectedProfile();
    return { flagEmoji, flagSrc, dialCode, maxLength };
  }

  localeTag(): string {
    return this.selectedProfile().localeTag;
  }

  activeFlagSrc(): string {
    return this.selectedProfile().flagSrc;
  }

  activeShortCode(): string {
    return this.selectedProfile().shortCode;
  }

  activeLabel(): string {
    const cat = this.selectedCategory();
    if (cat) {
      return cat.label;
    }
    const cached = this.cachedProfile();
    if (cached?.label) {
      return cached.label;
    }
    return 'العربية';
  }

  selectCategory(id: string, options?: { persistCurrency?: boolean; syncCurrency?: boolean }): void {
    if (!this.categories().some((c) => c.id === id)) {
      return;
    }
    this.selectedId.set(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    const cat = this.categories().find((c) => c.id === id);
    if (cat) {
      this.persistProfileCache(cat);
      if (options?.syncCurrency !== false) {
        this.syncCurrencyForCategory(cat, options?.persistCurrency !== false);
      }
    }
    this.notifyCategoryChanged();
  }

  /** يطبّق عملة الفئة المختارة (مثلاً عند التبديل إلى العربية). */
  applyCurrencyForSelectedCategory(persist = true): void {
    const cat = this.selectedCategory();
    if (!cat?.currencyCode) {
      this.hotelCurrency.syncForUiLocale('ar', { persist });
      return;
    }
    this.syncCurrencyForCategory(cat, persist);
  }

  reload(): void {
    this.loadCategories();
  }

  private restoreSelection(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)?.trim();
      if (raw) {
        this.selectedId.set(raw);
      }
    } catch {
      /* ignore */
    }
  }

  private restoreProfileCache(): void {
    try {
      const raw = localStorage.getItem(PROFILE_CACHE_KEY)?.trim();
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as CachedArabicPreferenceProfile;
      if (parsed?.flagSrc && parsed?.dialCode) {
        this.cachedProfile.set(parsed);
      }
    } catch {
      /* ignore */
    }
  }

  private persistProfileCache(cat: ArabicPreferenceCategoryView): void {
    const snapshot: CachedArabicPreferenceProfile = {
      flagEmoji: cat.profile.flagEmoji,
      flagSrc: cat.profile.flagSrc,
      dialCode: cat.profile.dialCode,
      maxLength: cat.profile.maxLength,
      localeTag: cat.profile.localeTag,
      shortCode: cat.profile.shortCode,
      label: cat.label,
      region: cat.region,
    };
    this.cachedProfile.set(snapshot);
    try {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      /* ignore */
    }
  }

  private notifyCategoryChanged(): void {
    window.dispatchEvent(new Event('hotelArabicCategoryChanged'));
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.generalCodes.getList('preference-category').subscribe({
      next: (items) => {
        const views = this.toViews(items);
        this.categories.set(views);
        this.ensureValidSelection(views);
        this.loading.set(false);
        this.notifyCategoryChanged();
      },
      error: () => {
        this.categories.set([]);
        this.loading.set(false);
        this.notifyCategoryChanged();
      },
    });
  }

  private languageDisplay(code: string): string {
    const hit = SYSTEM_UI_LANGUAGES.find((x) => x.code === code);
    if (hit) {
      return this.ui.screenText('settings', hit.labelKey);
    }
    return code;
  }

  private toViews(items: GeneralCodeItem[]): ArabicPreferenceCategoryView[] {
    return [...items]
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((item) => {
        const languageCode = (item.name ?? '').trim();
        const region = (item.fName ?? '').trim();
        const language = this.languageDisplay(languageCode);
        const profile = prefCategoryProfile(item);
        return {
          id: item.id,
          language,
          region,
          label: formatArabicCategoryLabel(language, region),
          displayOrder: item.displayOrder ?? 0,
          currencyCode: prefCategoryCurrencyCode(item),
          profile,
        };
      });
  }

  private ensureValidSelection(views: ArabicPreferenceCategoryView[]): void {
    if (!views.length) {
      this.selectedId.set(null);
      return;
    }
    const current = this.selectedId();
    if (current) {
      const hit = views.find((v) => v.id === current);
      if (hit) {
        this.persistProfileCache(hit);
        return;
      }
    }
    this.selectCategory(views[0].id, { persistCurrency: false, syncCurrency: false });
  }

  private syncCurrencyForCategory(cat: ArabicPreferenceCategoryView, persist: boolean): void {
    const code = cat.currencyCode?.trim().toUpperCase();
    if (!code) {
      return;
    }
    const hit = this.hotelCurrency.presets().find((p) => p.id === code || p.code === code);
    this.hotelCurrency.selectPreset(hit?.id ?? code);
    if (persist) {
      this.hotelSystemSettings.save().subscribe({
        next: () => {
          window.dispatchEvent(new Event('hotelSettingsUpdated'));
          window.dispatchEvent(new Event(HOTEL_CURRENCY_UPDATED_EVENT));
        },
        error: () => {
          window.dispatchEvent(new Event(HOTEL_CURRENCY_UPDATED_EVENT));
        },
      });
    } else {
      window.dispatchEvent(new Event(HOTEL_CURRENCY_UPDATED_EVENT));
    }
  }
}
