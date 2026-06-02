import type { Booking } from '../models/booking.model';
import type { Room } from '../models/room.model';
import type { SystemNotificationParams } from '../services/system-notifications.service';

export function guestNameFromBooking(b: Pick<Booking, 'first_Name' | 'last_Name'>): string {
  const name = `${b.first_Name ?? ''} ${b.last_Name ?? ''}`.trim();
  return name || '—';
}

export function bookingNotifyParams(b: Pick<Booking, 'first_Name' | 'last_Name' | 'room_Number'>): SystemNotificationParams {
  return {
    guest: guestNameFromBooking(b),
    room: String(b.room_Number ?? '').trim() || '—',
  };
}

export function roomNotifyParams(room: Pick<Room, 'roomNumber' | 'status'>): SystemNotificationParams {
  return {
    room: String(room.roomNumber ?? '').trim() || '—',
    status: String(room.status ?? '').trim() || '—',
  };
}
