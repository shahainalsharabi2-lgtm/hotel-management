/** آخر عمليات نقل غرفة — للعرض «من → إلى» في الغرف والحجوزات */
export const RECENT_ROOM_TRANSFERS_KEY = 'hotelRecentRoomTransfers';
const MAX_RECENT = 80;

export interface RecentRoomTransfer {
  bookingId?: number;
  fromRoom: string;
  toRoom: string;
  guestName?: string;
  at: string;
}

export type RoomTransferRole = 'from' | 'to';

export interface RoomTransferHint {
  role: RoomTransferRole;
  otherRoom: string;
  guestName?: string;
  at: string;
}

export function readRecentRoomTransfers(): RecentRoomTransfer[] {
  try {
    const raw = sessionStorage.getItem(RECENT_ROOM_TRANSFERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => normalizeTransfer(item))
      .filter((t): t is RecentRoomTransfer => t != null);
  } catch {
    return [];
  }
}

function normalizeTransfer(item: unknown): RecentRoomTransfer | null {
  if (!item || typeof item !== 'object') {
    return null;
  }
  const r = item as Record<string, unknown>;
  const fromRoom = String(r['fromRoom'] ?? r['FromRoom'] ?? '').trim();
  const toRoom = String(r['toRoom'] ?? r['ToRoom'] ?? '').trim();
  if (!fromRoom || !toRoom || fromRoom === toRoom) {
    return null;
  }
  const bookingId = r['bookingId'] != null ? Number(r['bookingId']) : undefined;
  return {
    bookingId: Number.isFinite(bookingId) ? bookingId : undefined,
    fromRoom,
    toRoom,
    guestName: String(r['guestName'] ?? '').trim() || undefined,
    at: String(r['at'] ?? new Date().toISOString()),
  };
}

export function pushRecentRoomTransfer(
  entry: Omit<RecentRoomTransfer, 'at'> & { at?: string }
): void {
  const fromRoom = entry.fromRoom.trim();
  const toRoom = entry.toRoom.trim();
  if (!fromRoom || !toRoom || fromRoom === toRoom) {
    return;
  }
  const row: RecentRoomTransfer = {
    bookingId: entry.bookingId,
    fromRoom,
    toRoom,
    guestName: entry.guestName?.trim() || undefined,
    at: entry.at ?? new Date().toISOString(),
  };
  const list = readRecentRoomTransfers().filter(
    (t) =>
      !(
        t.fromRoom === row.fromRoom &&
        t.toRoom === row.toRoom &&
        t.bookingId === row.bookingId
      )
  );
  list.unshift(row);
  try {
    sessionStorage.setItem(
      RECENT_ROOM_TRANSFERS_KEY,
      JSON.stringify(list.slice(0, MAX_RECENT))
    );
    window.dispatchEvent(new CustomEvent(ROOM_TRANSFERS_CHANGED_EVENT));
  } catch {
    /* ignore quota */
  }
}

/** أرقام الغرف المشاركة في آخر عمليات النقل */
export function roomNumbersInRecentTransfers(list: RecentRoomTransfer[]): Set<string> {
  const nums = new Set<string>();
  for (const t of list) {
    if (t.fromRoom) {
      nums.add(t.fromRoom);
    }
    if (t.toRoom) {
      nums.add(t.toRoom);
    }
  }
  return nums;
}

/** أحدث تلميح لكل غرفة (مصدر النقل أو وجهته) */
export function buildRoomTransferLookup(
  list: RecentRoomTransfer[]
): Map<string, RoomTransferHint> {
  const map = new Map<string, RoomTransferHint>();
  for (const t of list) {
    const from = t.fromRoom.trim();
    const to = t.toRoom.trim();
    if (from && !map.has(from)) {
      map.set(from, {
        role: 'from',
        otherRoom: to,
        guestName: t.guestName,
        at: t.at,
      });
    }
    if (to && !map.has(to)) {
      map.set(to, {
        role: 'to',
        otherRoom: from,
        guestName: t.guestName,
        at: t.at,
      });
    }
  }
  return map;
}

/** يُطلق بعد تسجيل نقل جديد (نفس التبويب) */
export const ROOM_TRANSFERS_CHANGED_EVENT = 'hotelRoomTransfersChanged';

export function getTransferHintForBooking(
  list: RecentRoomTransfer[],
  bookingId?: number,
  currentRoom?: string
): RecentRoomTransfer | null {
  const room = String(currentRoom ?? '').trim();
  for (const t of list) {
    if (bookingId != null && t.bookingId === bookingId) {
      return t;
    }
    if (room && (t.toRoom === room || t.fromRoom === room)) {
      return t;
    }
  }
  return null;
}
