import type { IdentityType } from '../models/identity-type.model';

/** يطبّع استجابة API (Id/Name) إلى نموذج الواجهة (id/name). */
export function mapIdentityTypeFromApi(raw: IdentityType & { Id?: number; Name?: string }): IdentityType {
  const id = raw.id ?? raw.Id;
  const name = (raw.name ?? raw.Name ?? '').trim();
  return {
    ...(id != null ? { id: Number(id) } : {}),
    name,
  };
}
