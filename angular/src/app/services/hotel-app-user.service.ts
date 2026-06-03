import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PagedResultDto } from '../models/paged-result-dto.model';

export interface HotelAppUserDto {
  id: number;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
}

export interface CreateUpdateHotelAppUserDto {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class HotelAppUserService {
  private readonly http = inject(HttpClient);

  private get apiUrl(): string {
    return `${environment.apis.default.url}/api/app/hotel-app-user`;
  }

  get(id: number): Observable<HotelAppUserDto> {
    return this.http.get<HotelAppUserDto>(`${this.apiUrl}/${id}`);
  }

  getAll(): Observable<HotelAppUserDto[]> {
    return this.http
      .get<PagedResultDto<HotelAppUserDto>>(this.apiUrl, {
        params: { skipCount: '0', maxResultCount: '1000' },
      })
      .pipe(map((r) => r.items ?? []));
  }

  create(input: CreateUpdateHotelAppUserDto): Observable<HotelAppUserDto> {
    return this.http.post<HotelAppUserDto>(this.apiUrl, input);
  }

  update(id: number, input: CreateUpdateHotelAppUserDto): Observable<HotelAppUserDto> {
    return this.http.put<HotelAppUserDto>(`${this.apiUrl}/${id}`, input);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
