import { Room } from '../models/room.model';

export const BOOKING_PICK_ROOM_RETURN_KEY = 'hotelBookingPickRoomReturn';
/** @deprecated use BOOKING_PICKED_ROOM_KEY with JSON snapshot */
export const BOOKING_PICKED_ROOM_KEY = 'hotelBookingPickedRoom';

export interface BookingPickedRoom {
  roomNumber: string;
  type?: string;
  floor?: number;
  price?: number;
  status?: Room['status'];
}

export function saveBookingPickRoomReturnUrl(url: string): void {
  try {
    sessionStorage.setItem(BOOKING_PICK_ROOM_RETURN_KEY, url.trim() || '/booking');
  } catch {
    /* ignore */
  }
}

export function setPickedRoom(room: Pick<Room, 'roomNumber' | 'type' | 'floor' | 'price' | 'status'>): void {
  const snapshot: BookingPickedRoom = {
    roomNumber: String(room.roomNumber ?? '').trim(),
    type: room.type,
    floor: Number(room.floor) || 1,
    price: Number(room.price) || 0,
    status: room.status,
  };
  if (!snapshot.roomNumber) {
    return;
  }
  try {
    sessionStorage.setItem(BOOKING_PICKED_ROOM_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

/** @deprecated use setPickedRoom */
export function setPickedRoomNumber(roomNumber: string): void {
  setPickedRoom({ roomNumber, type: '', floor: 1, price: 0, status: 'available' });
}

export function consumePickedRoom(): BookingPickedRoom | null {
  try {
    const raw = sessionStorage.getItem(BOOKING_PICKED_ROOM_KEY);
    sessionStorage.removeItem(BOOKING_PICKED_ROOM_KEY);
    if (!raw) {
      return null;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed) as BookingPickedRoom;
      const roomNumber = String(parsed?.roomNumber ?? '').trim();
      return roomNumber ? { ...parsed, roomNumber } : null;
    }
    return { roomNumber: trimmed };
  } catch {
    return null;
  }
}

export function consumePickedRoomNumber(): string | null {
  return consumePickedRoom()?.roomNumber ?? null;
}

export function readBookingPickRoomReturnUrl(): string {
  try {
    return sessionStorage.getItem(BOOKING_PICK_ROOM_RETURN_KEY)?.trim() || '/booking';
  } catch {
    return '/booking';
  }
}

export function clearBookingPickRoomSession(): void {
  try {
    sessionStorage.removeItem(BOOKING_PICK_ROOM_RETURN_KEY);
    sessionStorage.removeItem(BOOKING_PICKED_ROOM_KEY);
  } catch {
    /* ignore */
  }
}

export function normalizeRoomNumber(value: unknown): string {
  return String(value ?? '').trim();
}

export function roomsMatchNumber(a: unknown, b: unknown): boolean {
  return normalizeRoomNumber(a) === normalizeRoomNumber(b);
}
