import type {
  CreateUpdateGeneralCodeItem,
  GeneralCodeItem,
} from '../general-codes/general-codes.service';
import { resolveArabicRegionProfile } from './arabic-region-profile.util';
import { prefCategoryDialCode, normalizeFlagFile } from './pref-category.util';

/** يُخزَّن في Description في SQL عندما API لا يدعم الأعمدة الجديدة بعد */
const PREF_CATEGORY_DESC_PREFIX = '__pref__:';
const ROOM_CLASS_DESC_PREFIX = '__roomClass__:';
const MAX_PREF_DESCRIPTION_LENGTH = 1024;

/** أقصى حجم تقريبي لحقل الصورة — يُحسب بدقة عبر prefCategoryFlagDataBudget */
export const MAX_PREF_FLAG_DATA_IN_DESC = 920;

export { MAX_PREF_DESCRIPTION_LENGTH };

/** مساحة data URL المتاحة بعد احتساب الرمز (بدون اسم ملف طويل عند وجود صورة) */
export function prefCategoryFlagDataBudget(
  countryDialCode: string | null | undefined,
  options?: { flagImageName?: string | null; withImage?: boolean },
): number {
  const dial = (countryDialCode ?? '+0').trim();
  const withImage = options?.withImage ?? false;
  const compact: Record<string, string> = { d: dial };
  if (!withImage) {
    const name = (options?.flagImageName ?? '').trim();
    if (name) {
      compact.f = name;
    }
  }
  compact.i = '';
  const overhead = `${PREF_CATEGORY_DESC_PREFIX}${JSON.stringify(compact)}`.length;
  return Math.max(160, MAX_PREF_DESCRIPTION_LENGTH - overhead);
}

function pickStr(raw: Record<string, unknown>, camel: string, pascal: string): string | null {
  const value = raw[camel] ?? raw[pascal];
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
}

function pickInt(raw: Record<string, unknown>, camel: string, pascal: string): number | null {
  const value = raw[camel] ?? raw[pascal];
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.trunc(num) : null;
}

export function normalizeGeneralCodeItem(raw: unknown): GeneralCodeItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const id = String(record['id'] ?? record['Id'] ?? '').trim();
  if (!id) {
    return null;
  }
  return {
    id,
    category: String(record['category'] ?? record['Category'] ?? '') as GeneralCodeItem['category'],
    name: String(record['name'] ?? record['Name'] ?? ''),
    fName: pickStr(record, 'fName', 'FName'),
    description: pickStr(record, 'description', 'Description'),
    countryDialCode: pickStr(record, 'countryDialCode', 'CountryDialCode'),
    flagImageName: pickStr(record, 'flagImageName', 'FlagImageName'),
    flagImageData: pickStr(record, 'flagImageData', 'FlagImageData'),
    roomCount: pickInt(record, 'roomCount', 'RoomCount'),
    regularBedCount:
      pickInt(record, 'regularBedCount', 'RegularBedCount') ??
      pickInt(record, 'bedCount', 'BedCount'),
    familyBedCount: pickInt(record, 'familyBedCount', 'FamilyBedCount'),
    displayOrder: Number(record['displayOrder'] ?? record['DisplayOrder'] ?? 0),
  };
}

export function normalizeGeneralCodeList(raw: unknown): GeneralCodeItem[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((entry) => normalizeGeneralCodeItem(entry))
    .filter((entry): entry is GeneralCodeItem => entry !== null);
}

export interface RoomClassStoredCounts {
  roomCount?: number | null;
  regularBedCount?: number | null;
  familyBedCount?: number | null;
}

/** ترميز عدد الغرف والأسرّة داخل Description (متوافق مع API القديم على Render) */
export function encodeRoomClassDescription(counts: RoomClassStoredCounts): string | null {
  const roomCount = counts.roomCount ?? null;
  const regularBedCount = counts.regularBedCount ?? null;
  const familyBedCount = counts.familyBedCount ?? null;
  if (roomCount == null && regularBedCount == null && familyBedCount == null) {
    return null;
  }
  const compact: Record<string, number> = {};
  if (roomCount != null) {
    compact.r = roomCount;
  }
  if (regularBedCount != null) {
    compact.b = regularBedCount;
  }
  if (familyBedCount != null) {
    compact.f = familyBedCount;
  }
  return `${ROOM_CLASS_DESC_PREFIX}${JSON.stringify(compact)}`;
}

export function decodeRoomClassDescription(
  description: string | null | undefined,
): RoomClassStoredCounts {
  const raw = (description ?? '').trim();
  if (!raw.startsWith(ROOM_CLASS_DESC_PREFIX)) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw.slice(ROOM_CLASS_DESC_PREFIX.length)) as Record<string, unknown>;
    const read = (short: string, long: string): number | null => {
      const value = parsed[short] ?? parsed[long];
      if (value === null || value === undefined || value === '') {
        return null;
      }
      const num = Number(value);
      return Number.isFinite(num) && num >= 0 ? Math.trunc(num) : null;
    };
    return {
      roomCount: read('r', 'roomCount'),
      regularBedCount: read('b', 'regularBedCount') ?? read('b', 'bedCount'),
      familyBedCount: read('f', 'familyBedCount'),
    };
  } catch {
    return {};
  }
}

/** يسترجع الأعداد من الأعمدة أو من Description في SQL */
export function applyRoomClassDescription(item: GeneralCodeItem): GeneralCodeItem {
  if (item.category !== 'room-classes') {
    return item;
  }
  const fromDesc = decodeRoomClassDescription(item.description);
  return {
    ...item,
    roomCount: item.roomCount ?? fromDesc.roomCount ?? null,
    regularBedCount: item.regularBedCount ?? fromDesc.regularBedCount ?? null,
    familyBedCount: item.familyBedCount ?? fromDesc.familyBedCount ?? null,
  };
}

export function withRoomClassPayloadDescription(
  payload: CreateUpdateGeneralCodeItem,
): CreateUpdateGeneralCodeItem {
  return {
    ...payload,
    description: encodeRoomClassDescription({
      roomCount: payload.roomCount,
      regularBedCount: payload.regularBedCount,
      familyBedCount: payload.familyBedCount,
    }),
  };
}

export function roomClassCountsPersisted(
  saved: GeneralCodeItem,
  payload: CreateUpdateGeneralCodeItem,
): boolean {
  const resolved = applyRoomClassDescription(saved);
  const pairs: Array<[number | null | undefined, number | null | undefined]> = [
    [payload.roomCount, resolved.roomCount],
    [payload.regularBedCount, resolved.regularBedCount],
    [payload.familyBedCount, resolved.familyBedCount],
  ];
  for (const [sent, got] of pairs) {
    if (sent == null) {
      continue;
    }
    if (got !== sent) {
      return false;
    }
  }
  return true;
}

export interface PrefCategoryStoredExtras {
  countryDialCode?: string | null;
  flagImageName?: string | null;
  flagImageData?: string | null;
  currencyCode?: string | null;
  currencySymbol?: string | null;
}

/** ترميز رمز الدولة والعلم داخل Description (متوافق مع API القديم على Render) */
export function encodePrefCategoryDescription(
  extras: PrefCategoryStoredExtras,
  options?: { embedFlagImageInDescription?: boolean },
): string | null {
  const countryDialCode = (extras.countryDialCode ?? '').trim() || null;
  const flagImageName = (extras.flagImageName ?? '').trim() || null;
  const flagImageData = (extras.flagImageData ?? '').trim() || null;
  const currencyCode = (extras.currencyCode ?? '').trim().toUpperCase() || null;
  const currencySymbol = (extras.currencySymbol ?? '').trim() || null;
  const embedFlagImage = options?.embedFlagImageInDescription === true;

  if (!countryDialCode && !flagImageName && !flagImageData && !currencyCode && !currencySymbol) {
    return null;
  }

  const compact: Record<string, string> = {};
  if (countryDialCode) {
    compact.d = countryDialCode;
  }
  if (currencyCode) {
    compact.c = currencyCode;
  }
  if (currencySymbol && currencySymbol.toUpperCase() !== currencyCode) {
    compact.s = currencySymbol;
  }
  // الصورة المرفوعة تُحفظ في عمود FlagImageData — لا في Description إلا للـ API القديم
  if (embedFlagImage && flagImageData) {
    compact.i = flagImageData;
  } else if (flagImageName) {
    compact.f = flagImageName;
  }

  const encoded = `${PREF_CATEGORY_DESC_PREFIX}${JSON.stringify(compact)}`;
  if (encoded.length > MAX_PREF_DESCRIPTION_LENGTH) {
    return null;
  }
  return encoded;
}

export function decodePrefCategoryDescription(
  description: string | null | undefined,
): PrefCategoryStoredExtras {
  const raw = (description ?? '').trim();
  if (!raw.startsWith(PREF_CATEGORY_DESC_PREFIX)) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw.slice(PREF_CATEGORY_DESC_PREFIX.length)) as Record<string, unknown>;
    const read = (key: string, longKey: string): string | null => {
      const v = parsed[key] ?? parsed[longKey];
      if (typeof v !== 'string') {
        return null;
      }
      const text = v.trim();
      return text || null;
    };
    return {
      countryDialCode: read('d', 'countryDialCode'),
      flagImageName: read('f', 'flagImageName'),
      flagImageData: read('i', 'flagImageData'),
      currencyCode: read('c', 'currencyCode'),
      currencySymbol: read('s', 'currencySymbol'),
    };
  } catch {
    return {};
  }
}

/** يسترجع الحقول من الأعمدة أو من Description في SQL */
export function applyPrefCategoryDescription(item: GeneralCodeItem): GeneralCodeItem {
  if (item.category !== 'preference-category') {
    return item;
  }
  const fromDesc = decodePrefCategoryDescription(item.description);
  return {
    ...item,
    countryDialCode: item.countryDialCode ?? fromDesc.countryDialCode ?? null,
    flagImageName: item.flagImageName ?? fromDesc.flagImageName ?? null,
    flagImageData: item.flagImageData ?? fromDesc.flagImageData ?? null,
  };
}

export function withPrefCategoryPayloadDescription(
  payload: CreateUpdateGeneralCodeItem,
  currency?: Pick<PrefCategoryStoredExtras, 'currencyCode' | 'currencySymbol'>,
  options?: { embedFlagImageInDescription?: boolean },
): CreateUpdateGeneralCodeItem {
  const encoded = encodePrefCategoryDescription(
    {
      countryDialCode: payload.countryDialCode,
      flagImageName: payload.flagImageName,
      flagImageData: payload.flagImageData,
      currencyCode: currency?.currencyCode,
      currencySymbol: currency?.currencySymbol,
    },
    options,
  );
  return {
    ...payload,
    description: encoded,
  };
}

/** هل يمكن ترميز البيانات الوصفية (بدون صورة مرفوعة) داخل Description؟ */
export function canEncodePrefCategoryMetadata(
  payload: CreateUpdateGeneralCodeItem,
  currency?: Pick<PrefCategoryStoredExtras, 'currencyCode' | 'currencySymbol'>,
): boolean {
  const encoded = encodePrefCategoryDescription(
    {
      countryDialCode: payload.countryDialCode,
      flagImageName: payload.flagImageName,
      flagImageData: null,
      currencyCode: currency?.currencyCode,
      currencySymbol: currency?.currencySymbol,
    },
    { embedFlagImageInDescription: false },
  );
  if (encoded) {
    return true;
  }
  return !(payload.countryDialCode || payload.flagImageName || currency?.currencyCode);
}

/** يتحقق أن رمز الدولة والعلم وُجدتا في SQL (أعمدة أو Description) */
export function prefCategoryFieldsPersisted(
  saved: GeneralCodeItem,
  payload: CreateUpdateGeneralCodeItem,
): boolean {
  const resolved = applyPrefCategoryDescription(saved);
  const sentDial = (payload.countryDialCode ?? '').trim();
  const sentFlagData = (payload.flagImageData ?? '').trim();
  const sentFlagName = (payload.flagImageName ?? '').trim();

  if (sentDial && !(resolved.countryDialCode ?? '').trim()) {
    return false;
  }
  if (sentFlagName && !(resolved.flagImageName ?? '').trim() && !(resolved.flagImageData ?? '').trim()) {
    return false;
  }
  if (sentFlagData) {
    return !!(resolved.flagImageData ?? '').trim();
  }
  return true;
}

/** يتحقق أن اسم ملف العلم الجاهز وُجد في SQL */
export function prefCategoryFlagFilePersisted(
  saved: GeneralCodeItem,
  payload: CreateUpdateGeneralCodeItem,
): boolean {
  const sent = (payload.flagImageName ?? '').trim().replace(/^assets\/flags\//i, '').toLowerCase();
  if (!sent || (payload.flagImageData ?? '').trim()) {
    return true;
  }
  const resolved = applyPrefCategoryDescription(saved);
  const fromDesc = decodePrefCategoryDescription(saved.description);
  const got = (resolved.flagImageName ?? fromDesc.flagImageName ?? '')
    .trim()
    .replace(/^assets\/flags\//i, '')
    .toLowerCase();
  return got === sent;
}

/** اسم ملف العلم المحفوظ أو المقترح من المنطقة */
export function resolvePrefCategoryFlagFile(
  item: Pick<GeneralCodeItem, 'flagImageData' | 'flagImageName' | 'fName' | 'description'>,
): string {
  const data = (item.flagImageData ?? '').trim();
  if (data.startsWith('data:')) {
    return '';
  }
  const fromItem = normalizeFlagFile(item.flagImageName);
  if (fromItem) {
    return fromItem;
  }
  const fromDesc = normalizeFlagFile(decodePrefCategoryDescription(item.description).flagImageName);
  if (fromDesc) {
    return fromDesc;
  }
  const regionFile = resolveArabicRegionProfile(item.fName).flagSrc.replace(/^assets\/flags\//, '');
  return normalizeFlagFile(regionFile);
}

export function prefCategoryImageTooLargeForDb(
  payload: CreateUpdateGeneralCodeItem,
  currency?: Pick<PrefCategoryStoredExtras, 'currencyCode' | 'currencySymbol'>,
): boolean {
  const data = (payload.flagImageData ?? '').trim();
  if (!data) {
    return false;
  }
  const encoded = encodePrefCategoryDescription(
    {
      countryDialCode: payload.countryDialCode,
      flagImageName: payload.flagImageName,
      flagImageData: data,
      currencyCode: currency?.currencyCode,
      currencySymbol: currency?.currencySymbol,
    },
    { embedFlagImageInDescription: true },
  );
  return !encoded || encoded.length > MAX_PREF_DESCRIPTION_LENGTH;
}

/** يملأ رمز الدولة واسم العلم من المنطقة فقط عند غيابها تماماً */
export function enrichPrefCategoryItem(item: GeneralCodeItem): GeneralCodeItem {
  const withDesc = applyPrefCategoryDescription(item);
  const profile = resolveArabicRegionProfile(withDesc.fName);
  const regionFlagFile = profile.flagSrc.replace(/^assets\/flags\//, '');
  const dial = (withDesc.countryDialCode ?? '').trim();
  const flagData = (withDesc.flagImageData ?? '').trim();
  const flagFile = resolvePrefCategoryFlagFile(withDesc) || normalizeFlagFile(regionFlagFile);

  return {
    ...withDesc,
    countryDialCode: dial || prefCategoryDialCode(withDesc),
    flagImageName: flagFile || regionFlagFile,
    flagImageData: flagData || null,
  };
}
