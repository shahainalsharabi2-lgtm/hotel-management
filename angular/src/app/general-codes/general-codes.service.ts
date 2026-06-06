import { Injectable, inject } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';

import {

  enrichPrefCategoryItem,

  applyRoomClassDescription,

  normalizeGeneralCodeItem,

  normalizeGeneralCodeList,

} from '../utils/general-code-item.util';

import type { GeneralCodeCategoryId } from './general-codes.constants';

function enrichCategoryItem(item: GeneralCodeItem): GeneralCodeItem {

  if (item.category === 'preference-category') {

    return enrichPrefCategoryItem(item);

  }

  if (item.category === 'room-classes') {

    return applyRoomClassDescription(item);

  }

  return item;

}



export interface GeneralCodeItem {

  id: string;

  category: GeneralCodeCategoryId;

  name: string;

  fName?: string | null;

  description?: string | null;

  countryDialCode?: string | null;

  flagImageName?: string | null;

  flagImageData?: string | null;

  roomCount?: number | null;

  regularBedCount?: number | null;

  familyBedCount?: number | null;

  displayOrder: number;

}



export interface CreateUpdateGeneralCodeItem {

  name: string;

  fName?: string | null;

  description?: string | null;

  countryDialCode?: string | null;

  flagImageName?: string | null;

  flagImageData?: string | null;

  roomCount?: number | null;

  regularBedCount?: number | null;

  familyBedCount?: number | null;

  displayOrder: number;

}



@Injectable({ providedIn: 'root' })

export class GeneralCodesService {

  private readonly http = inject(HttpClient);



  private get apiUrl(): string {

    return `${environment.apis.default.url}/api/app/general-codes`;

  }



  getList(category: GeneralCodeCategoryId): Observable<GeneralCodeItem[]> {

    return this.http.get<unknown>(this.apiUrl, { params: { category } }).pipe(

      map((raw) => normalizeGeneralCodeList(raw)),

      map((items) => items.map((item) => enrichCategoryItem(item))),

    );

  }



  create(category: GeneralCodeCategoryId, input: CreateUpdateGeneralCodeItem): Observable<GeneralCodeItem> {

    return this.http.post<unknown>(this.apiUrl, { category, ...input }).pipe(

      map((raw) => normalizeGeneralCodeItem(raw)),

      map((apiItem) => {

        if (!apiItem) {

          throw new Error('Invalid general code create response');

        }

        return enrichCategoryItem(apiItem);

      }),

    );

  }



  update(id: string, input: CreateUpdateGeneralCodeItem): Observable<GeneralCodeItem> {

    return this.http.put<unknown>(`${this.apiUrl}/${id}`, input).pipe(

      map((raw) => normalizeGeneralCodeItem(raw)),

      map((apiItem) => {

        if (!apiItem) {

          throw new Error('Invalid general code update response');

        }

        return enrichCategoryItem(apiItem);

      }),

    );

  }



  delete(id: string): Observable<void> {

    return this.http.delete<void>(`${this.apiUrl}/${id}`);

  }

}


