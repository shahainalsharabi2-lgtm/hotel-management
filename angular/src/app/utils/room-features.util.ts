/** تخزين مميزات الغرفة كمصفوفة JSON في قاعدة البيانات */
export function parseRoomFeatures(raw: string | null | undefined): string[] {
  const text = String(raw ?? '').trim();
  if (!text) {
    return [];
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((x) => String(x ?? '').trim()).filter(Boolean);
    }
  } catch {
    /* قيم قديمة مفصولة بفاصلة */
  }
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeRoomFeatures(features: readonly string[]): string | null {
  const list = [...new Set(features.map((s) => String(s ?? '').trim()).filter(Boolean))];
  if (!list.length) {
    return null;
  }
  return JSON.stringify(list);
}

export function roomFeaturesSummary(features: readonly string[], max = 3): string {
  if (!features.length) {
    return '';
  }
  if (features.length <= max) {
    return features.join(' · ');
  }
  return `${features.slice(0, max).join(' · ')} +${features.length - max}`;
}
