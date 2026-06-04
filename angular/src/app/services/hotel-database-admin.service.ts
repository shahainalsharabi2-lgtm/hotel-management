import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface HotelDatabaseBackupResult {
  success: boolean;
  message: string;
  fileName: string;
  jsonContent: string;
}

export interface HotelDatabaseOperationResult {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class HotelDatabaseAdminService {
  private readonly http = inject(HttpClient);

  private get baseUrl(): string {
    return `${environment.apis.default.url}/api/app/hotel-database-admin`;
  }

  createBackup(): Observable<HotelDatabaseBackupResult> {
    return this.http.post<HotelDatabaseBackupResult>(`${this.baseUrl}/backup`, {});
  }

  updateDatabase(): Observable<HotelDatabaseOperationResult> {
    return this.http.put<HotelDatabaseOperationResult>(`${this.baseUrl}/database`, {});
  }
}
