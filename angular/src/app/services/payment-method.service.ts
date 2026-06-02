import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PagedResultDto } from '../models/paged-result-dto.model';

export interface PaymentMethodDto {
  id: number;
  name: string;
  displayOrder: number;
}

@Injectable({ providedIn: 'root' })
export class PaymentMethodService {
  private readonly http = inject(HttpClient);

  private get apiUrl(): string {
    return `${environment.apis.default.url}/api/app/payment-method`;
  }

  getAll(): Observable<PaymentMethodDto[]> {
    return this.http
      .get<PagedResultDto<PaymentMethodDto>>(this.apiUrl, {
        params: { skipCount: '0', maxResultCount: '1000' },
      })
      .pipe(map((r) => (r.items ?? []).sort((a, b) => a.displayOrder - b.displayOrder)));
  }

  create(name: string, displayOrder: number): Observable<PaymentMethodDto> {
    return this.http.post<PaymentMethodDto>(this.apiUrl, { name: name.trim(), displayOrder });
  }

  update(id: number, name: string, displayOrder: number): Observable<PaymentMethodDto> {
    return this.http.put<PaymentMethodDto>(`${this.apiUrl}/${id}`, { name: name.trim(), displayOrder });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
