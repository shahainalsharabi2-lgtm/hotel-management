import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Floor } from '../models/floor.model';
import { PagedResultDto } from '../models/paged-result-dto.model';

@Injectable({
  providedIn: 'root',
})
export class FloorService {
  private readonly http = inject(HttpClient);

  private get apiUrl(): string {
    return `${environment.apis.default.url}/api/app/floor`;
  }

  getFloors(): Observable<Floor[]> {
    return this.http
      .get<PagedResultDto<Floor>>(this.apiUrl, {
        params: { skipCount: '0', maxResultCount: '1000' },
      })
      .pipe(map((r) => r.items ?? []));
  }

  addFloor(floor: Floor): Observable<Floor> {
    return this.http.post<Floor>(this.apiUrl, this.normalizeFloor(floor));
  }

  updateFloor(id: number, floor: Floor): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, this.normalizeFloor(floor));
  }

  deleteFloor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private normalizeFloor(floor: Floor): Floor {
    return {
      ...floor,
      level: Number(floor.level) || 1,
      roomsCount: Number(floor.roomsCount) || 1,
    };
  }
}
