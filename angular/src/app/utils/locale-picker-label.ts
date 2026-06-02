/** When UI is Arabic, show only the Arabic part of bilingual locale labels (e.g. «فرنسية» not «Français — فرنسية»). */
export function formatLocalePickerLabel(label: string, displayLocale: string): string {
  const trimmed = label.trim();
  if (displayLocale !== 'ar' || !trimmed) {
    return trimmed;
  }

  const dashMatch = trimmed.match(/\s+[—–\-]\s+(.+)$/u);
  if (dashMatch?.[1] && containsArabic(dashMatch[1])) {
    return dashMatch[1].trim();
  }

  return trimmed;
}

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}
