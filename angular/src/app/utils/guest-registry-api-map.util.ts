import { GuestRegistry } from '../models/guest-registry.model';

function pickStr(raw: Record<string, unknown>, camel: string, pascal: string): string {
  const v = raw[camel] ?? raw[pascal];
  return v == null ? '' : String(v).trim();
}

function pickOptionalStr(raw: Record<string, unknown>, camel: string, pascal: string): string | undefined {
  const s = pickStr(raw, camel, pascal);
  return s || undefined;
}

export function mapGuestRegistryFromApi(raw: Record<string, unknown> | GuestRegistry): GuestRegistry {
  const r = raw as Record<string, unknown>;
  const idRaw = r['id'] ?? r['Id'];
  const lm = r['lastModificationTime'] ?? r['LastModificationTime'];
  return {
    id: idRaw == null ? undefined : Number(idRaw),
    first_Name: pickStr(r, 'first_Name', 'First_Name'),
    middle_Name: pickOptionalStr(r, 'middle_Name', 'Middle_Name'),
    last_Name: pickStr(r, 'last_Name', 'Last_Name'),
    phone_Number: pickStr(r, 'phone_Number', 'Phone_Number'),
    gender: pickStr(r, 'gender', 'Gender'),
    nationality: pickStr(r, 'nationality', 'Nationality'),
    country: pickStr(r, 'country', 'Country'),
    birth_Date: pickStr(r, 'birth_Date', 'Birth_Date'),
    id_Type: pickStr(r, 'id_Type', 'Id_Type'),
    id_Issuing_Country: pickStr(r, 'id_Issuing_Country', 'Id_Issuing_Country'),
    id_Number: pickStr(r, 'id_Number', 'Id_Number'),
    purpose_Of_Stay: pickOptionalStr(r, 'purpose_Of_Stay', 'Purpose_Of_Stay'),
    relationship_Type: pickOptionalStr(r, 'relationship_Type', 'Relationship_Type'),
    price_Code: pickOptionalStr(r, 'price_Code', 'Price_Code'),
    lastModificationTime: lm == null ? undefined : String(lm),
  };
}

export function guestRegistryToSavePayload(
  profile: GuestRegistry,
  registryId?: number | null,
): GuestRegistry {
  return {
    id: registryId && registryId > 0 ? registryId : profile.id,
    first_Name: profile.first_Name?.trim() ?? '',
    middle_Name: profile.middle_Name?.trim() ?? '',
    last_Name: profile.last_Name?.trim() ?? '',
    phone_Number: profile.phone_Number?.trim() ?? '',
    gender: profile.gender?.trim() ?? '',
    nationality: profile.nationality?.trim() ?? '',
    country: profile.country?.trim() ?? '',
    birth_Date: profile.birth_Date?.trim() ?? '',
    id_Type: profile.id_Type?.trim() ?? '',
    id_Issuing_Country: profile.id_Issuing_Country?.trim() ?? '',
    id_Number: profile.id_Number?.trim() ?? '',
    purpose_Of_Stay: profile.purpose_Of_Stay?.trim() ?? '',
    relationship_Type: profile.relationship_Type?.trim() ?? '',
    price_Code: profile.price_Code?.trim() ?? '',
  };
}
