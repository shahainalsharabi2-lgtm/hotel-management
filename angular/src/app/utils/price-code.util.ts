import type { GeneralCodeItem } from '../general-codes/general-codes.service';

/** يقرأ نسبة الخصم من حقل الوصف (مثل 10 أو 10%) */
export function parsePriceCodeDiscountPercent(raw: string | null | undefined): number {
  const text = (raw ?? '').trim().replace(/%/g, '').replace(/,/g, '.');
  if (!text) {
    return 0;
  }
  const value = Number(text);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(value, 100);
}

export function formatPriceCodeDiscountDisplay(raw: string | null | undefined): string {
  const pct = parsePriceCodeDiscountPercent(raw);
  return pct > 0 ? `${pct}%` : '—';
}

export function normalizePriceCodeDiscountInput(raw: string | null | undefined): string {
  const pct = parsePriceCodeDiscountPercent(raw);
  return pct > 0 ? String(pct) : '';
}

export function findPriceCodeOptionByName(
  items: GeneralCodeItem[],
  name: string | null | undefined,
): GeneralCodeItem | undefined {
  const norm = (name ?? '').trim();
  if (!norm) {
    return undefined;
  }
  return items.find((item) => (item.name ?? '').trim() === norm);
}

export function priceCodeDiscountPercentForName(
  items: GeneralCodeItem[],
  name: string | null | undefined,
): number {
  const hit = findPriceCodeOptionByName(items, name);
  return parsePriceCodeDiscountPercent(hit?.description);
}

export function applyPriceCodeDiscount(baseTotal: number, discountPercent: number): number {
  if (discountPercent <= 0 || baseTotal <= 0) {
    return baseTotal;
  }
  const discounted = baseTotal * (1 - discountPercent / 100);
  return Math.max(0, Math.round(discounted * 100) / 100);
}

export function formatPriceCodeWithDiscountLabel(
  name: string | null | undefined,
  items: GeneralCodeItem[],
): string {
  const label = (name ?? '').trim();
  if (!label) {
    return '—';
  }
  const pct = priceCodeDiscountPercentForName(items, label);
  if (pct <= 0) {
    return label;
  }
  return `${label} — ${pct}%`;
}

export function priceCodeDiscountPercentLabel(
  name: string | null | undefined,
  items: GeneralCodeItem[],
): string {
  const pct = priceCodeDiscountPercentForName(items, name);
  return pct > 0 ? `${pct}%` : '';
}
