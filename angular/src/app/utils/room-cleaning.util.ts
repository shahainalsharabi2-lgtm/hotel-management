/** مدة التنظيف قبل أن تصبح الغرفة جاهزة */
export const ROOM_CLEANING_DURATION_MS = 10 * 60 * 1000;

const STORAGE_KEY = 'hotelRoomCleaningUntil';

type CleaningSchedule = Record<string, number>;

function readSchedule(): CleaningSchedule {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as CleaningSchedule;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSchedule(schedule: CleaningSchedule): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
  } catch {
    /* ignore */
  }
}

export function getRoomCleaningReadyAt(roomId: number | undefined | null): number | null {
  if (roomId == null) {
    return null;
  }
  const at = readSchedule()[String(roomId)];
  return typeof at === 'number' && at > 0 ? at : null;
}

export function setRoomCleaningReadyAt(roomId: number, readyAtMs: number): void {
  const schedule = readSchedule();
  schedule[String(roomId)] = readyAtMs;
  writeSchedule(schedule);
}

export function clearRoomCleaningReadyAt(roomId: number): void {
  const schedule = readSchedule();
  delete schedule[String(roomId)];
  writeSchedule(schedule);
}

/** وقت الجاهزية بصيغة ساعة:دقيقة (12 ساعة) */
export function formatCleaningReadyClock(readyAtMs: number, locale = 'ar-SA'): string {
  return new Date(readyAtMs).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** مدة متبقية بصيغة MM:SS (عرض ثابت لتجنّب اهتزاز البطاقة) */
export function formatCleaningRemainingClock(diffMs: number): string {
  if (diffMs <= 0) {
    return '00:00';
  }
  const totalSec = Math.ceil(diffMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function cleaningRemainingMs(readyAtMs: number | null): number {
  if (!readyAtMs) {
    return 0;
  }
  return Math.max(0, readyAtMs - Date.now());
}
