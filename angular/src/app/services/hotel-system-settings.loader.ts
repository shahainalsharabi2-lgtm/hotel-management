import { Injectable, inject } from '@angular/core';
import { HotelBrandingStoreService } from './hotel-branding-store.service';
import { HotelCurrencyService } from './hotel-currency.service';
import { HotelSettingsDto, HotelSettingsService } from './hotel-settings.service';
import { Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HotelSystemSettingsLoader {
  private readonly api = inject(HotelSettingsService);
  private readonly branding = inject(HotelBrandingStoreService);
  private readonly currency = inject(HotelCurrencyService);

  load(): Observable<HotelSettingsDto> {
    return this.api.get().pipe(
      tap((dto: HotelSettingsDto) => {
        this.branding.applyFromDto(dto);
        this.currency.applyFromStorage({
          currencyId: dto.currencyId,
          currencySymbol: dto.currencySymbol ?? undefined,
          currencyCode: dto.currencyCode ?? undefined,
        });
      }),
    );
  }

  save(): Observable<HotelSettingsDto> {
    const dto = this.branding.buildSettingsDto(this.currency.toStorageFields());
    return this.api.save(dto);
  }
}
