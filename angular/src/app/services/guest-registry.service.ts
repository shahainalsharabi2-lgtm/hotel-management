import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { GuestRegistry } from '../models/guest-registry.model';
import { PagedResultDto } from '../models/paged-result-dto.model';
import {
  guestRegistryToSavePayload,
  mapGuestRegistryFromApi,
} from '../utils/guest-registry-api-map.util';

@Injectable({
  providedIn: 'root',
})
export class GuestRegistryService {
  private readonly http = inject(HttpClient);

  private get apiUrl(): string {
    return `${environment.apis.default.url}/api/app/guest-registry`;
  }

  getGuests(): Observable<GuestRegistry[]> {
    return this.http
      .get<PagedResultDto<GuestRegistry>>(this.apiUrl, {
        params: { skipCount: '0', maxResultCount: '1000', sorting: 'LastModificationTime desc' },
      })
      .pipe(
        map((r) =>
          (r.items ?? []).map((item) =>
            mapGuestRegistryFromApi(item as unknown as Record<string, unknown>),
          ),
        ),
      );
  }

  saveProfile(profile: GuestRegistry, registryId?: number | null): Observable<GuestRegistry> {
    const payload = guestRegistryToSavePayload(profile, registryId ?? profile.id);
    const id = payload.id;
    const body = { ...payload };
    delete body.id;
    if (id != null && id > 0) {
      return this.http
        .put<GuestRegistry>(`${this.apiUrl}/${id}`, body)
        .pipe(map((item) => mapGuestRegistryFromApi(item as unknown as Record<string, unknown>)));
    }
    return this.http
      .post<GuestRegistry>(this.apiUrl, body)
      .pipe(map((item) => mapGuestRegistryFromApi(item as unknown as Record<string, unknown>)));
  }
}
