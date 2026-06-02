import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HotelSettingsDto {
  password: string;
  hotelImageDataUrl?: string | null;
  profileJson: string;
  currencyId: string;
  currencySymbol?: string | null;
  currencyCode?: string | null;
}

@Injectable({ providedIn: 'root' })
export class HotelSettingsService {
  private readonly http = inject(HttpClient);

  private get apiUrl(): string {
    return `${environment.apis.default.url}/api/app/hotel-settings`;
  }

  get(): Observable<HotelSettingsDto> {
    return this.http.get<HotelSettingsDto>(this.apiUrl);
  }

  save(dto: HotelSettingsDto): Observable<HotelSettingsDto> {
    return this.http.put<HotelSettingsDto>(this.apiUrl, dto);
  }
}
