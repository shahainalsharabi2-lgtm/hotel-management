/** Normalizes API or form dates to YYYY-MM-DD for comparisons and filters. */
export function toDateOnlyString(value: string | Date | undefined | null): string {
  if (value == null || value === '') {
    return '';
  }
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value).trim();
  // تواريخ ISO مع وقت: اليوم التقويمي بالتوقيت المحلي (لا جزء UTC قبل T)
  if (s.includes('T')) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  const head = s.split('T')[0];
  return head || s;
}

/** Today's calendar date in local timezone as YYYY-MM-DD (avoids UTC drift from toISOString). */
export function todayLocalDateString(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
