import { Booking } from '../models/booking.model';
import { GuestRegistry } from '../models/guest-registry.model';
import { guestFullName, guestIdentityKey, syncBookingOccupancyCounts } from './booking-display.util';
import {
  buildGuestDisplayFullName,
  guestRegistryToProfile,
  type GuestProfileDetails,
} from './guest-profile.util';

export interface KnownGuestProfile {
  key: string;
  fullName: string;
  first_Name: string;
  last_Name: string;
  middle_Name?: string;
  phone_Number?: string;
  id_Number?: string;
  id_Type?: string;
  id_Issuing_Country?: string;
  gender?: string;
  nationality?: string;
  country?: string;
  birth_Date?: string;
  registry_Id?: number;
  profile?: GuestProfileDetails;
  fromRegistry?: boolean;
  payment_Method?: string;
  people_Count?: number;
  adults_Count?: number;
  children_Count?: number;
}

function bookingRecencyKey(b: Booking): number {
  const t = b.lastModificationTime;
  if (t) {
    const ms = Date.parse(t);
    if (!Number.isNaN(ms)) {
      return ms;
    }
  }
  return b.id ?? 0;
}

/** نزلاء فريدون من سجل الحجوزات (أحدث بيانات لكل نزيل) */
export function knownGuestsFromBookings(bookings: Booking[]): KnownGuestProfile[] {
  const byKey = new Map<string, { profile: KnownGuestProfile; recency: number }>();

  for (const b of bookings) {
    const name = guestFullName(b);
    if (!name) {
      continue;
    }
    const key = guestIdentityKey(b) || `name:${name.toLowerCase()}`;
    const recency = bookingRecencyKey(b);
    const occ = syncBookingOccupancyCounts(b);
    const profile: KnownGuestProfile = {
      key,
      fullName: name,
      first_Name: String(b.first_Name ?? '').trim(),
      last_Name: String(b.last_Name ?? '').trim(),
      phone_Number: String(b.phone_Number ?? '').trim() || undefined,
      id_Number: String(b.id_Number ?? '').trim() || undefined,
      id_Type: String(b.id_Type ?? '').trim() || undefined,
      payment_Method: String(b.payment_Method ?? '').trim() || undefined,
      people_Count: occ.people_Count,
      adults_Count: occ.adults_Count,
      children_Count: occ.children_Count,
    };

    const existing = byKey.get(key);
    if (!existing || recency >= existing.recency) {
      byKey.set(key, { profile, recency });
    }
  }

  return [...byKey.values()]
    .map((e) => e.profile)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ar'));
}

function registryRecencyKey(g: GuestRegistry): number {
  const t = g.lastModificationTime;
  if (t) {
    const ms = Date.parse(t);
    if (!Number.isNaN(ms)) {
      return ms;
    }
  }
  return g.id ?? 0;
}

export function knownGuestsFromRegistry(registry: GuestRegistry[]): KnownGuestProfile[] {
  const sorted = [...registry].sort((a, b) => registryRecencyKey(b) - registryRecencyKey(a));
  const rows: KnownGuestProfile[] = [];
  for (const g of sorted) {
    const profile = guestRegistryToProfile(g);
    const fullName = buildGuestDisplayFullName(profile);
    if (!fullName) {
      continue;
    }
    const occ = syncBookingOccupancyCounts({});
    rows.push({
      key: `reg:${g.id ?? fullName}`,
      registry_Id: g.id,
      fullName,
      first_Name: profile.first_Name,
      last_Name: profile.last_Name,
      middle_Name: profile.middle_Name,
      phone_Number: profile.phone_Number || undefined,
      id_Number: profile.id_Number || undefined,
      id_Type: profile.id_Type || undefined,
      id_Issuing_Country: profile.id_Issuing_Country || undefined,
      gender: profile.gender || undefined,
      nationality: profile.nationality || undefined,
      country: profile.country || undefined,
      birth_Date: profile.birth_Date || undefined,
      profile,
      fromRegistry: true,
      people_Count: occ.people_Count,
      adults_Count: occ.adults_Count,
      children_Count: occ.children_Count,
    });
  }
  return rows;
}

function guestMatchesRegistry(bookingGuest: KnownGuestProfile, reg: KnownGuestProfile): boolean {
  const idn = (bookingGuest.id_Number ?? '').trim();
  const rid = (reg.id_Number ?? '').trim();
  if (idn && rid && idn === rid) {
    return true;
  }
  const phone = (bookingGuest.phone_Number ?? '').trim();
  const rphone = (reg.phone_Number ?? '').trim();
  return (
    bookingGuest.fullName.toLowerCase() === reg.fullName.toLowerCase() &&
    !!phone &&
    phone === rphone
  );
}

/** سجل النزلاء في النظام أولاً، ثم نزلاء من الحجوزات غير المكررين */
export function mergeKnownGuestSources(
  registry: GuestRegistry[],
  bookings: Booking[],
): KnownGuestProfile[] {
  const fromRegistry = knownGuestsFromRegistry(registry);
  const fromBookings = knownGuestsFromBookings(bookings).filter(
    (b) => !fromRegistry.some((r) => guestMatchesRegistry(b, r)),
  );
  return [...fromRegistry, ...fromBookings].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, 'ar'),
  );
}

export function filterKnownGuests(
  guests: KnownGuestProfile[],
  query: string,
): KnownGuestProfile[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return guests;
  }
  return guests.filter((g) => {
    const hay = [
      g.fullName,
      g.phone_Number ?? '',
      g.id_Number ?? '',
      g.id_Type ?? '',
      g.nationality ?? '',
      g.country ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}
