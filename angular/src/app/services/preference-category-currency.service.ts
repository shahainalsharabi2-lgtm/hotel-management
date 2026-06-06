import { Injectable, inject, signal } from '@angular/core';
import { GeneralCodesService } from '../general-codes/general-codes.service';
import { HotelCurrencyService } from './hotel-currency.service';
import { HOTEL_CURRENCY_PRESETS, mergeUiLocaleCurrencyPresets, type HotelCurrencyPreset } from '../utils/hotel-currency.presets';
import { mapPrefCategoryCurrencies } from '../utils/pref-category-currency.util';

@Injectable({ providedIn: 'root' })
export class PreferenceCategoryCurrencyService {
  private readonly generalCodes = inject(GeneralCodesService);
  private readonly hotelCurrency = inject(HotelCurrencyService);

  readonly currencies = signal<readonly HotelCurrencyPreset[]>(HOTEL_CURRENCY_PRESETS);
  readonly loading = signal(false);

  constructor() {
    this.reload();
    window.addEventListener('hotelArabicCategoryChanged', () => this.reload());
  }

  reload(): void {
    this.loading.set(true);
    this.generalCodes.getList('preference-category').subscribe({
      next: (items) => {
        const mapped = mapPrefCategoryCurrencies(items);
        const base = mapped.length ? mapped : [...HOTEL_CURRENCY_PRESETS];
        const next = mergeUiLocaleCurrencyPresets(base);
        this.currencies.set(next);
        this.hotelCurrency.setManagedPresets(next);
        this.loading.set(false);
      },
      error: () => {
        const next = mergeUiLocaleCurrencyPresets([...HOTEL_CURRENCY_PRESETS]);
        this.currencies.set(next);
        this.hotelCurrency.setManagedPresets(next);
        this.loading.set(false);
      },
    });
  }
}
