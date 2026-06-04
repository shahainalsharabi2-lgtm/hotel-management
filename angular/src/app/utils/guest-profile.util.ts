import { GuestRegistry } from '../models/guest-registry.model';
import { splitGuestFullName } from './booking-display.util';

/** بيانات النزيل التفصيلية */
export interface GuestProfileDetails {
  registry_Id?: number;
  first_Name: string;
  middle_Name: string;
  last_Name: string;
  phone_Number: string;
  gender: string;
  nationality: string;
  country: string;
  birth_Date: string;
  id_Type: string;
  id_Issuing_Country: string;
  id_Number: string;
  purpose_Of_Stay?: string;
  relationship_Type?: string;
  price_Code?: string;
}

export const GUEST_PROFILE_MARKER = '[[guest-profile:v1]]';

export const GUEST_GENDER_OPTIONS = [
  { id: 'male', labelKey: 'guestGenderMale' },
  { id: 'female', labelKey: 'guestGenderFemale' },
] as const;

export function emptyGuestProfile(): GuestProfileDetails {
  return {
    first_Name: '',
    middle_Name: '',
    last_Name: '',
    phone_Number: '',
    gender: '',
    nationality: '',
    country: '',
    birth_Date: '',
    id_Type: '',
    id_Issuing_Country: '',
    id_Number: '',
    purpose_Of_Stay: '',
    relationship_Type: '',
    price_Code: '',
  };
}

export function guestRegistryToProfile(g: GuestRegistry): GuestProfileDetails {
  return {
    registry_Id: g.id,
    first_Name: g.first_Name ?? '',
    middle_Name: g.middle_Name ?? '',
    last_Name: g.last_Name ?? '',
    phone_Number: g.phone_Number ?? '',
    gender: g.gender ?? '',
    nationality: g.nationality ?? '',
    country: g.country ?? '',
    birth_Date: g.birth_Date ?? '',
    id_Type: g.id_Type ?? '',
    id_Issuing_Country: g.id_Issuing_Country ?? '',
    id_Number: g.id_Number ?? '',
    purpose_Of_Stay: g.purpose_Of_Stay ?? '',
    relationship_Type: g.relationship_Type ?? '',
    price_Code: g.price_Code ?? '',
  };
}

export function guestProfileToRegistry(
  p: GuestProfileDetails,
  registryId?: number | null,
): GuestRegistry {
  return {
    id: registryId ?? p.registry_Id,
    first_Name: p.first_Name,
    middle_Name: p.middle_Name,
    last_Name: p.last_Name,
    phone_Number: p.phone_Number,
    gender: p.gender,
    nationality: p.nationality,
    country: p.country,
    birth_Date: p.birth_Date,
    id_Type: p.id_Type,
    id_Issuing_Country: p.id_Issuing_Country,
    id_Number: p.id_Number,
    purpose_Of_Stay: p.purpose_Of_Stay ?? '',
    relationship_Type: p.relationship_Type ?? '',
    price_Code: p.price_Code ?? '',
  };
}

export function buildGuestDisplayFullName(
  p: Pick<GuestProfileDetails, 'first_Name' | 'middle_Name' | 'last_Name'>,
): string {
  return [p.first_Name, p.middle_Name, p.last_Name]
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .join(' ');
}

/** first_Name = الأول؛ last_Name = الثاني + الأخير */
export function guestProfileToBookingNameParts(profile: GuestProfileDetails): {
  first_Name: string;
  last_Name: string;
  guest_Full_Name: string;
} {
  const first = profile.first_Name.trim();
  const middle = profile.middle_Name.trim();
  const last = profile.last_Name.trim();
  const guest_Full_Name = buildGuestDisplayFullName(profile);
  const last_Name = [middle, last].filter(Boolean).join(' ');
  return { first_Name: first, last_Name: last_Name, guest_Full_Name };
}

export function stripGuestProfileFromNotes(notes: string): string {
  const raw = String(notes ?? '');
  const idx = raw.indexOf(GUEST_PROFILE_MARKER);
  if (idx < 0) {
    return raw.trim();
  }
  return raw.slice(0, idx).trim();
}

export function parseGuestProfileFromNotes(notes: string): GuestProfileDetails | null {
  const raw = String(notes ?? '');
  const idx = raw.indexOf(GUEST_PROFILE_MARKER);
  if (idx < 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw.slice(idx + GUEST_PROFILE_MARKER.length)) as GuestProfileDetails;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return { ...emptyGuestProfile(), ...parsed };
  } catch {
    return null;
  }
}

export function guestCodingFromFormValue(
  raw: Record<string, unknown>,
): Pick<GuestProfileDetails, 'purpose_Of_Stay' | 'relationship_Type' | 'price_Code'> {
  return {
    purpose_Of_Stay: String(raw['purpose_Of_Stay'] ?? '').trim(),
    relationship_Type: String(raw['relationship_Type'] ?? '').trim(),
    price_Code: String(raw['price_Code'] ?? '').trim(),
  };
}

export function buildGuestRegistryFromCheckIn(
  bookingRaw: Record<string, unknown>,
  snapshot: GuestProfileDetails | null,
  registryId: number | null | undefined,
): GuestRegistry | null {
  const idNumber = String(bookingRaw['id_Number'] ?? snapshot?.id_Number ?? '').trim();
  const regId = registryId ?? snapshot?.registry_Id ?? undefined;
  if (!idNumber && !(regId != null && regId > 0)) {
    return null;
  }

  const coding = guestCodingFromFormValue(bookingRaw);
  if (snapshot) {
    return guestProfileToRegistry({ ...snapshot, ...coding }, regId);
  }

  const full = String(bookingRaw['guest_Full_Name'] ?? '').trim();
  let first_Name = String(bookingRaw['first_Name'] ?? '').trim();
  let last_Name = String(bookingRaw['last_Name'] ?? '').trim();
  if (full && !first_Name && !last_Name) {
    const split = splitGuestFullName(full);
    first_Name = split.first;
    last_Name = split.last;
  }

  return {
    id: regId,
    first_Name,
    middle_Name: '',
    last_Name,
    phone_Number: String(bookingRaw['phone_Number'] ?? '').trim(),
    gender: '',
    nationality: '',
    country: '',
    birth_Date: '',
    id_Type: String(bookingRaw['id_Type'] ?? '').trim(),
    id_Issuing_Country: '',
    id_Number: idNumber,
    ...coding,
  };
}

export function mergeGuestNotesWithProfile(
  userNotes: string,
  profile: GuestProfileDetails | null,
): string {
  const base = stripGuestProfileFromNotes(userNotes);
  if (!profile) {
    return base;
  }
  const hasData = Object.values(profile).some((v) => String(v ?? '').trim());
  if (!hasData) {
    return base;
  }
  const block = `${GUEST_PROFILE_MARKER}${JSON.stringify(profile)}`;
  return base ? `${base}\n\n${block}` : block;
}
