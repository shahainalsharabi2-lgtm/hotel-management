import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, from, map, mergeMap, of, switchMap, tap, toArray } from 'rxjs';
import { environment } from '../../environments/environment';
import { Room } from '../models/room.model';
import { PagedResultDto } from '../models/paged-result-dto.model';
import { HotelCurrencyService } from './hotel-currency.service';
import { UiTranslationsService } from './ui-translations.service';
import { withRoomCurrencyForSave } from '../utils/room-currency';
import { roomNotifyParams } from '../utils/booking-notify-params.util';
import {
  SystemNotificationsService,
  type SystemNotificationInput,
} from './system-notifications.service';

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private readonly http = inject(HttpClient);
  private readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly uiTranslations = inject(UiTranslationsService);
  private readonly notifications = inject(SystemNotificationsService);

  private get apiUrl(): string {
    return `${environment.apis.default.url}/api/app/room`;
  }

  getRooms(): Observable<Room[]> {
    return this.http
      .get<PagedResultDto<Room>>(this.apiUrl, {
        params: { skipCount: '0', maxResultCount: '1000' },
      })
      .pipe(map((r) => r.items ?? []));
  }

  getRoomById(id: number): Observable<Room> {
    return this.http.get<Room>(`${this.apiUrl}/${id}`);
  }

  addRoom(room: Room, notify?: SystemNotificationInput | false): Observable<Room> {
    return this.http.post<Room>(this.apiUrl, this.normalizeRoom(room)).pipe(
      tap((created) => {
        if (notify === false) {
          return;
        }
        this.notifications.record(
          notify ?? { kind: 'room_created', params: roomNotifyParams(created) },
        );
      }),
    );
  }

  updateRoom(id: number, room: Room, notify?: SystemNotificationInput | false): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, this.normalizeRoom(room)).pipe(
      tap(() => {
        if (notify === false) {
          return;
        }
        this.notifications.record(
          notify ?? { kind: 'room_updated', params: roomNotifyParams(room) },
        );
      }),
    );
  }

  deleteRoom(id: number, notify?: SystemNotificationInput | false): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        if (notify === false) {
          return;
        }
        this.notifications.record(notify ?? { kind: 'room_deleted' });
      }),
    );
  }

  resetAllRoomStatuses(
    targetStatus: Room['status'] = 'available',
    preserveMaintenanceAndSuspended = true,
  ): Observable<{ updatedCount: number; totalRooms: number; targetStatus: string }> {
    return this.resetAllRoomStatusesViaUpdates(targetStatus, preserveMaintenanceAndSuspended);
  }

  private resetAllRoomStatusesViaUpdates(
    targetStatus: Room['status'],
    preserveMaintenanceAndSuspended: boolean,
  ): Observable<{ updatedCount: number; totalRooms: number; targetStatus: string }> {
    const target = targetStatus || 'available';
    const preserved = new Set(['maintenance', 'maint', 'suspended', 'stopped', 'halt']);

    return this.getRooms().pipe(
      switchMap((rooms) => {
        const toUpdate = rooms.filter((r) => {
          const s = (r.status || '').trim().toLowerCase();
          if (s === target) {
            return false;
          }
          if (preserveMaintenanceAndSuspended && preserved.has(s)) {
            return false;
          }
          return true;
        });

        if (toUpdate.length === 0) {
          return of({
            updatedCount: 0,
            totalRooms: rooms.length,
            targetStatus: target,
          });
        }

        return from(toUpdate).pipe(
          mergeMap((room) => {
            const id = this.roomId(room);
            if (!id) {
              return of(false);
            }
            return this.updateRoom(id, { ...room, status: target }, false).pipe(
              map(() => true),
              catchError((err) => {
                console.error('reset room status', id, err);
                return of(false);
              }),
            );
          }, 4),
          toArray(),
          map((results) => ({
            updatedCount: results.filter(Boolean).length,
            totalRooms: rooms.length,
            targetStatus: target,
          })),
        );
      }),
    );
  }

  private roomId(room: Room): number | null {
    const raw = room.id ?? (room as unknown as Record<string, unknown>)['Id'];
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private normalizeRoom(room: Room): Room {
    const base: Room = {
      ...room,
      roomNumber: room.roomNumber?.toString() || '',
      type: room.type || 'غرفة عادية',
      status: room.status || 'available',
      maintenanceReason: room.maintenanceReason?.toString().trim() || null,
      price: Number(room.price) || 0,
      floor: Number(room.floor) || 1,
    };
    return withRoomCurrencyForSave(base, this.hotelCurrency, this.uiTranslations.displayLocale());
  }
}
