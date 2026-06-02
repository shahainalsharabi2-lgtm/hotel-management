import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { IdentityType } from '../models/identity-type.model';
import { PagedResultDto } from '../models/paged-result-dto.model';
import { mapIdentityTypeFromApi } from '../utils/identity-type-api-map.util';

@Injectable({
  providedIn: 'root',
})
export class IdentityTypeService {
  private readonly http = inject(HttpClient);

  private get apiUrl(): string {
    return `${environment.apis.default.url}/api/app/identity-type`;
  }

  getIdentityTypes(): Observable<IdentityType[]> {
    return this.http
      .get<PagedResultDto<IdentityType>>(this.apiUrl, {
        params: { skipCount: '0', maxResultCount: '1000' },
      })
      .pipe(map((r) => (r.items ?? []).map((item) => mapIdentityTypeFromApi(item as IdentityType))));
  }

  addIdentityType(type: IdentityType): Observable<IdentityType> {
    return this.http
      .post<IdentityType>(this.apiUrl, this.normalizeIdentityType(type))
      .pipe(map((item) => mapIdentityTypeFromApi(item as IdentityType)));
  }

  deleteIdentityType(id: number): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  private normalizeIdentityType(type: IdentityType): IdentityType {
    return {
      ...type,
      name: type.name?.trim() || '',
    };
  }
}
