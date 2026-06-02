import { computed, Injectable, signal } from '@angular/core';
import {
  currencyIdForUiLocale,
  DEFAULT_HOTEL_CURRENCY_ID,
  HOTEL_CURRENCY_CUSTOM_ID,
  HOTEL_CURRENCY_PRESETS,
  type HotelCurrencyPreset,
  type HotelCurrencyPresetId,
  type HotelUiLocaleCode,
} from '../utils/hotel-currency.presets';

export const HOTEL_CURRENCY_UPDATED_EVENT = 'hotelCurrencyUpdated';

export type HotelCurrencyStorage = {
  currencyId?: string;
  currencySymbol?: string;
  currencyCode?: string;
};

@Injectable({ providedIn: 'root' })
export class HotelCurrencyService {
  readonly presets: readonly HotelCurrencyPreset[] = HOTEL_CURRENCY_PRESETS;

  private readonly selectedId = signal<HotelCurrencyPresetId>(DEFAULT_HOTEL_CURRENCY_ID);
  private readonly customSymbol = signal('YR');
  private readonly customCode = signal('CUSTOM');

  readonly id = this.selectedId.asReadonly();

  readonly symbol = computed(() => {
    if (this.selectedId() === HOTEL_CURRENCY_CUSTOM_ID) {
      const s = this.customSymbol().trim();
      return s || 'YR';
    }
    return this.presets.find((p) => p.id === this.selectedId())?.symbol ?? 'YR';
  });

  readonly code = computed(() => {
    if (this.selectedId() === HOTEL_CURRENCY_CUSTOM_ID) {
      const c = this.customCode().trim();
      return c || 'CUSTOM';
    }
    return this.presets.find((p) => p.id === this.selectedId())?.code ?? 'YER';
  });

  readonly activePreset = computed((): HotelCurrencyPreset | null => {
    if (this.selectedId() === HOTEL_CURRENCY_CUSTOM_ID) {
      return null;
    }
    return this.presets.find((p) => p.id === this.selectedId()) ?? null;
  });

  readonly isCustom = computed(() => this.selectedId() === HOTEL_CURRENCY_CUSTOM_ID);

  constructor() {
    this.reloadFromStorage();
  }

  reloadFromStorage(): void {
    /* العملة تُحمَّل مع إعدادات الفندق من API */
  }

  applyFromStorage(data: HotelCurrencyStorage | null | undefined): void {
    const id = (data?.currencyId ?? DEFAULT_HOTEL_CURRENCY_ID) as HotelCurrencyPresetId;
    if (id === HOTEL_CURRENCY_CUSTOM_ID) {
      this.selectedId.set(HOTEL_CURRENCY_CUSTOM_ID);
      this.customSymbol.set((data?.currencySymbol ?? 'YR').trim() || 'YR');
      this.customCode.set((data?.currencyCode ?? 'CUSTOM').trim() || 'CUSTOM');
      return;
    }
    const preset = this.presets.find((p) => p.id === id);
    if (preset) {
      this.selectedId.set(preset.id);
    } else {
      this.selectedId.set(DEFAULT_HOTEL_CURRENCY_ID);
    }
  }

  toStorageFields(): HotelCurrencyStorage {
    if (this.selectedId() === HOTEL_CURRENCY_CUSTOM_ID) {
      return {
        currencyId: HOTEL_CURRENCY_CUSTOM_ID,
        currencySymbol: this.customSymbol().trim() || 'YR',
        currencyCode: this.customCode().trim() || 'CUSTOM',
      };
    }
    const preset = this.activePreset();
    return {
      currencyId: preset?.id ?? DEFAULT_HOTEL_CURRENCY_ID,
      currencySymbol: preset?.symbol,
      currencyCode: preset?.code,
    };
  }

  /** ربط العملة بلغة الواجهة (عربي → ريال سعودي، فرنسي → يورو، إندونيسي → روبية، …) */
  syncForUiLocale(locale: HotelUiLocaleCode | string, options?: { persist?: boolean }): void {
    const id = currencyIdForUiLocale(locale);
    this.selectedId.set(id);
    if (options?.persist !== false) {
      this.persistToHotelSettings();
    }
    this.notifyChange();
  }

  selectPreset(id: HotelCurrencyPresetId): void {
    this.selectedId.set(id);
    this.notifyChange();
  }

  setCustom(symbol: string, code?: string): void {
    this.selectedId.set(HOTEL_CURRENCY_CUSTOM_ID);
    this.customSymbol.set(symbol);
    if (code !== undefined) {
      this.customCode.set(code);
    }
    this.notifyChange();
  }

  formatWithSymbol(amount: number | null | undefined, fractionDigits = 0): string {
    const n = Number(amount ?? 0);
    const formatted = new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(n);
    return `${formatted} ${this.symbol()}`;
  }

  saveToHotelSettings(): void {
    /* تُحفظ مع HotelSettingsService عند حفظ الإعدادات */
  }

  private persistToHotelSettings(): void {
    this.saveToHotelSettings();
  }

  private notifyChange(): void {
    window.dispatchEvent(new Event(HOTEL_CURRENCY_UPDATED_EVENT));
  }
}
