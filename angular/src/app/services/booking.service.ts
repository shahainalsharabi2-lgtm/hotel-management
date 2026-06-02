import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Booking } from '../models/booking.model';
import { Room } from '../models/room.model';
import { PagedResultDto } from '../models/paged-result-dto.model';
import { HotelCurrencyService } from './hotel-currency.service';
import { UiTranslationsService } from './ui-translations.service';
import { withBookingCurrencyForSave } from '../utils/booking-currency';
import { mapBookingFromApi, sanitizeBookingForApi } from '../utils/booking-api-map.util';
import { bookingNotifyParams } from '../utils/booking-notify-params.util';
import {
  SystemNotificationsService,
  type SystemNotificationInput,
} from './system-notifications.service';

@Injectable({
  providedIn: 'root',
})
export class BookingService {
  private readonly http = inject(HttpClient);
  private readonly hotelCurrency = inject(HotelCurrencyService);
  private readonly uiTranslations = inject(UiTranslationsService);
  private readonly notifications = inject(SystemNotificationsService);
  private lastRoomForBooking: Room | null = null;

  setRoomContextForNextSave(room: Room | null): void {
    this.lastRoomForBooking = room;
  }

  private get apiUrl(): string {
    return `${environment.apis.default.url}/api/app/booking`;
  }

  getBookings(): Observable<Booking[]> {
    return this.http
      .get<PagedResultDto<Booking>>(this.apiUrl, {
        params: { skipCount: '0', maxResultCount: '1000' },
      })
      .pipe(map((r) => (r.items ?? []).map((item) => mapBookingFromApi(item as Booking))));
  }

  saveBooking(
    booking: Booking,
    notify?: SystemNotificationInput | false,
  ): Observable<Booking> {
    return this.http.post<Booking>(this.apiUrl, this.normalizeBooking(booking)).pipe(
      map((item) => mapBookingFromApi(item as Booking)),
      tap((saved) => {
        if (notify === false) {
          return;
        }
        this.notifications.record(
          notify ?? { kind: 'booking_created', params: bookingNotifyParams(saved) },
        );
      }),
    );
  }

  updateBooking(
    id: number,
    booking: Booking,
    notify?: SystemNotificationInput | false,
  ): Observable<Booking> {
    const { id: _omitId, lastModificationTime: _omitLm, ...body } = booking;
    return this.http.put<Booking>(`${this.apiUrl}/${id}`, this.normalizeBooking(body as Booking)).pipe(
      map((item) => mapBookingFromApi(item as Booking)),
      tap((saved) => {
        if (notify === false) {
          return;
        }
        this.notifications.record(
          notify ?? { kind: 'booking_updated', params: bookingNotifyParams(saved) },
        );
      }),
    );
  }

  deleteBooking(id: number, notify?: SystemNotificationInput | false): Observable<unknown> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        if (notify === false) {
          return;
        }
        this.notifications.record(notify ?? { kind: 'booking_deleted' });
      }),
    );
  }

  private normalizeBooking(booking: Booking): Booking {
    const cleaned = sanitizeBookingForApi(booking);
    const base: Booking = {
      ...cleaned,
      status: cleaned.status || 'active',
    };
    const stamped = withBookingCurrencyForSave(
      base,
      this.hotelCurrency,
      this.uiTranslations.displayLocale(),
      this.lastRoomForBooking,
    );
    this.lastRoomForBooking = null;
    return stamped;
  }
}
