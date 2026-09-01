import { CURRENCY, LOCALE } from "@/config/constants";
import type { Amount, DateString } from "@/types/common";

/**
 * Presentation-only formatters. They never round, derive or aggregate — any
 * number reaching them is already final.
 */

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

export function formatCurrency(amount: Amount | null | undefined): string {
  if (amount === null || amount === undefined) return "—";
  return currencyFormatter.format(amount);
}

/** Short form for dashboard tiles, e.g. `₹12.4L`. */
export function formatCompactCurrency(
  amount: Amount | null | undefined,
): string {
  if (amount === null || amount === undefined) return "—";
  return compactCurrencyFormatter.format(amount);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return numberFormatter.format(value);
}

/** Renders a stored `YYYY-MM-DD` value as `01 Sep 2026`. */
export function formatDate(value: DateString | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Turns a snake/dot-cased enum value into a readable label. */
export function humanize(value: string): string {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
