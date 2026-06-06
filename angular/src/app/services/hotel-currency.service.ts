import { computed, Injectable, signal } from '@angular/core';
import {
  currencyIdForUiLocale,
  DEFAULT_HOTEL_CURRENCY_ID,
  HOTEL_CURRENCY_CUSTOM_ID,
  HOTEL_CURRENCY_PRESETS,
  mergeUiLocaleCurrencyPresets,
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

function normalizeCurrencyKey(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

@Injectable({ providedIn: 'root' })
export class HotelCurrencyService {
  private readonly managedPresets = signal<readonly HotelCurrencyPreset[] | null>(null);

  readonly presets = computed(() => {
    const managed = this.managedPresets();
    if (!managed) {
      return HOTEL_CURRENCY_PRESETS;
    }
    return mergeUiLocaleCurrencyPresets(managed);
  });

  private readonly selectedId = signal<HotelCurrencyPresetId>(DEFAULT_HOTEL_CURRENCY_ID);
  private readonly customSymbol = signal('YR');
  private readonly customCode = signal('CUSTOM');

  readonly id = this.selectedId.asReadonly();

  readonly symbol = computed(() => {
    if (this.selectedId() === HOTEL_CURRENCY_CUSTOM_ID) {
      const s = this.customSymbol().trim();
      return s || 'YR';
    }
    return this.resolvePreset(this.selectedId())?.symbol ?? 'YR';
  });

  readonly code = computed(() => {
    if (this.selectedId() === HOTEL_CURRENCY_CUSTOM_ID) {
      const c = this.customCode().trim();
      return c || 'CUSTOM';
    }
    return this.resolvePreset(this.selectedId())?.code ?? 'YER';
  });

  readonly activePreset = computed((): HotelCurrencyPreset | null => {
    if (this.selectedId() === HOTEL_CURRENCY_CUSTOM_ID) {
      return null;
    }
    return this.resolvePreset(this.selectedId()) ?? null;
  });

  readonly isCustom = computed(() => this.selectedId() === HOTEL_CURRENCY_CUSTOM_ID);

  setManagedPresets(presets: readonly HotelCurrencyPreset[]): void {
    this.managedPresets.set(presets);
    const current = this.selectedId();
    if (current === HOTEL_CURRENCY_CUSTOM_ID) {
      return;
    }
    const key = normalizeCurrencyKey(current);
    if (presets.some((p) => normalizeCurrencyKey(p.id) === key || normalizeCurrencyKey(p.code) === key)) {
      return;
    }
    if (
      HOTEL_CURRENCY_PRESETS.some(
        (p) => normalizeCurrencyKey(p.id) === key || normalizeCurrencyKey(p.code) === key,
      )
    ) {
      return;
    }
    const fallback = presets[0]?.id ?? DEFAULT_HOTEL_CURRENCY_ID;
    this.selectedId.set(fallback);
  }

  reloadFromStorage(): void {
    /* العملة تُحمَّل مع إعدادات الفندق من API */
  }

  applyFromStorage(data: HotelCurrencyStorage | null | undefined): void {
    const raw = (data?.currencyId ?? data?.currencyCode ?? DEFAULT_HOTEL_CURRENCY_ID).trim();
    if (normalizeCurrencyKey(raw) === normalizeCurrencyKey(HOTEL_CURRENCY_CUSTOM_ID)) {
      this.selectedId.set(HOTEL_CURRENCY_CUSTOM_ID);
      this.customSymbol.set((data?.currencySymbol ?? 'YR').trim() || 'YR');
      this.customCode.set((data?.currencyCode ?? 'CUSTOM').trim() || 'CUSTOM');
      return;
    }
    const preset = this.findPreset(raw);
    if (preset) {
      this.selectedId.set(preset.id);
      return;
    }
    this.selectedId.set(DEFAULT_HOTEL_CURRENCY_ID);
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

  syncForUiLocale(locale: HotelUiLocaleCode | string, options?: { persist?: boolean }): void {
    const id = currencyIdForUiLocale(locale);
    this.selectedId.set(id);
    if (options?.persist !== false) {
      this.persistToHotelSettings();
    }
    this.notifyChange();
  }

  selectPreset(id: HotelCurrencyPresetId): void {
    const preset = this.findPreset(id);
    this.selectedId.set(preset?.id ?? id);
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

  private findPreset(id: string): HotelCurrencyPreset | undefined {
    return this.resolvePreset(id);
  }

  private resolvePreset(id: HotelCurrencyPresetId | string): HotelCurrencyPreset | undefined {
    const key = normalizeCurrencyKey(id);
    if (!key) {
      return undefined;
    }
    const match = (list: readonly HotelCurrencyPreset[]) =>
      list.find(
        (p) => normalizeCurrencyKey(p.id) === key || normalizeCurrencyKey(p.code) === key,
      );
    return match(this.presets()) ?? match(HOTEL_CURRENCY_PRESETS);
  }

  private persistToHotelSettings(): void {
    this.saveToHotelSettings();
  }

  private notifyChange(): void {
    window.dispatchEvent(new Event(HOTEL_CURRENCY_UPDATED_EVENT));
  }
}
