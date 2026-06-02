import { Injectable, inject } from '@angular/core';
import type { UiExtraLocaleCode } from '../utils/ui-translation.constants';
import { UiTranslationsService } from './ui-translations.service';
import type { HotelSettingsDto } from './hotel-settings.service';

export type HotelProfileLocale = UiExtraLocaleCode | 'ar';

export interface HotelProfileFields {
  hotelName: string;
  hotelAddress: string;
  hotelLandline: string;
  hotelMobile: string;
  hotelEmail: string;
}

export interface HotelBrandingView {
  name: string;
  address: string;
  phone: string;
  landline: string;
  mobile: string;
  email: string;
  imageSrc: string;
}

const LOCALES: HotelProfileLocale[] = ['ar', 'fr', 'id', 'tr', 'zh-Hans'];

function emptyFields(): HotelProfileFields {
  return {
    hotelName: '',
    hotelAddress: '',
    hotelLandline: '',
    hotelMobile: '',
    hotelEmail: '',
  };
}

function emptyByLocale(): Record<HotelProfileLocale, HotelProfileFields> {
  return {
    ar: emptyFields(),
    fr: emptyFields(),
    id: emptyFields(),
    tr: emptyFields(),
    'zh-Hans': emptyFields(),
  };
}

@Injectable({ providedIn: 'root' })
export class HotelBrandingStoreService {
  private readonly ui = inject(UiTranslationsService);

  readonly profileByLocale = emptyByLocale();
  hotelImageDataUrl = '';
  password = '123';

  activeProfile(): HotelProfileFields {
    const loc = this.ui.displayLocale();
    return this.profileByLocale[loc] ?? this.profileByLocale.ar;
  }

  applyFromDto(dto: HotelSettingsDto): void {
    this.password = dto.password?.trim() || '123';
    this.hotelImageDataUrl =
      typeof dto.hotelImageDataUrl === 'string' && dto.hotelImageDataUrl.startsWith('data:image/')
        ? dto.hotelImageDataUrl
        : '';

    try {
      const parsed = JSON.parse(dto.profileJson || '{}') as Record<string, HotelProfileFields>;
      if (parsed && typeof parsed === 'object') {
        for (const loc of LOCALES) {
          const row = parsed[loc];
          if (row && typeof row === 'object') {
            this.profileByLocale[loc] = {
              hotelName: String(row.hotelName ?? ''),
              hotelAddress: String(row.hotelAddress ?? ''),
              hotelLandline: String(row.hotelLandline ?? ''),
              hotelMobile: String(row.hotelMobile ?? ''),
              hotelEmail: String(row.hotelEmail ?? ''),
            };
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  buildSettingsDto(currency: {
    currencyId?: string;
    currencySymbol?: string;
    currencyCode?: string;
  }): HotelSettingsDto {
    return {
      password: this.password,
      hotelImageDataUrl: this.hotelImageDataUrl || null,
      profileJson: JSON.stringify(this.profileByLocale),
      currencyId: currency.currencyId ?? 'sar',
      currencySymbol: currency.currencySymbol ?? null,
      currencyCode: currency.currencyCode ?? null,
    };
  }

  /** @deprecated استخدم applyFromDto بعد جلب الإعدادات من API */
  loadFromStorage(): void {
    /* no-op: البيانات من قاعدة البيانات عبر HotelSettingsService */
  }

  brandingView(locale?: HotelProfileLocale): HotelBrandingView {
    const loc = locale ?? this.ui.displayLocale();
    const f = this.profileByLocale[loc] ?? emptyFields();
    const phone = (f.hotelMobile || f.hotelLandline || '').trim();
    return {
      name: f.hotelName.trim(),
      address: f.hotelAddress.trim(),
      phone,
      landline: f.hotelLandline.trim(),
      mobile: f.hotelMobile.trim(),
      email: f.hotelEmail.trim(),
      imageSrc: this.hotelImageDataUrl,
    };
  }

  displayName(): string {
    return this.brandingView().name;
  }

  displayAddress(): string {
    return this.brandingView().address;
  }

  /** @deprecated */
  saveToStorage(_extra: Record<string, unknown>): void {
    /* no-op */
  }

  /** @deprecated */
  readRawStorage(): Record<string, unknown> {
    return {};
  }
}
