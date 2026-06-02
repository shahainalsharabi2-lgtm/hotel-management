import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import type { GeneralCodeCategoryId } from './general-codes.constants';

export interface GeneralCodeItem {
  id: string;
  category: GeneralCodeCategoryId;
  name: string;
  fName?: string | null;
  description?: string | null;
  displayOrder: number;
}

export interface CreateUpdateGeneralCodeItem {
  name: string;
  fName?: string | null;
  description?: string | null;
  displayOrder: number;
}

@Injectable({ providedIn: 'root' })
export class GeneralCodesService {
  private readonly http = inject(HttpClient);

  private get apiUrl(): string {
    return `${environment.apis.default.url}/api/app/general-codes`;
  }

  getList(category: GeneralCodeCategoryId): Observable<GeneralCodeItem[]> {
    return this.http.get<GeneralCodeItem[]>(this.apiUrl, { params: { category } });
  }

  create(category: GeneralCodeCategoryId, input: CreateUpdateGeneralCodeItem): Observable<GeneralCodeItem> {
    return this.http.post<GeneralCodeItem>(this.apiUrl, { category, ...input });
  }

  update(id: string, input: CreateUpdateGeneralCodeItem): Observable<GeneralCodeItem> {
    return this.http.put<GeneralCodeItem>(`${this.apiUrl}/${id}`, input);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
