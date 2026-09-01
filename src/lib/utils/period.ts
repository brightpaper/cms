import { MONTH_KEY_PATTERN } from "@/config/constants";
import type { MonthKey } from "@/types/common";

/**
 * Pure helpers for the `YYYY-MM` month key that partitions collection and
 * follow-up data.
 *
 * These only manipulate calendar values. Which months actually *exist* and
 * which one is open comes from the backend (`reports.availablePeriods`) — never
 * from these functions.
 */

export function isMonthKey(value: string): value is MonthKey {
  return MONTH_KEY_PATTERN.test(value);
}

export function toMonthKey(date: Date): MonthKey {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

/** The month key for today, in the runtime's local timezone. */
export function currentMonthKey(): MonthKey {
  return toMonthKey(new Date());
}

export interface ParsedMonthKey {
  readonly year: number;
  readonly month: number;
}

export function parseMonthKey(key: MonthKey): ParsedMonthKey {
  if (!isMonthKey(key)) {
    throw new Error(`Invalid month key "${key}". Expected YYYY-MM.`);
  }
  const [year, month] = key.split("-");
  return { year: Number(year), month: Number(month) };
}

/** Shifts a month key by a signed number of months. `-1` is the prior month. */
export function shiftMonthKey(key: MonthKey, offset: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  // Month is 0-indexed here so overflow rolls the year automatically.
  return toMonthKey(new Date(year, month - 1 + offset, 1));
}

/** Human label for a month key, e.g. `"2026-09"` -> `"September 2026"`. */
export function formatMonthLabel(key: MonthKey, locale = "en-IN"): string {
  const { year, month } = parseMonthKey(key);
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

/** Inclusive first and last calendar dates of a month, as `YYYY-MM-DD`. */
export function monthDateRange(key: MonthKey): {
  readonly start: string;
  readonly end: string;
} {
  const { year, month } = parseMonthKey(key);
  const lastDay = new Date(year, month, 0).getDate();
  const mm = `${month}`.padStart(2, "0");
  return {
    start: `${key}-01`,
    end: `${year}-${mm}-${`${lastDay}`.padStart(2, "0")}`,
  };
}

/** Newest-first list of month keys ending at `endKey`. Used only as a fallback. */
export function recentMonthKeys(count: number, endKey = currentMonthKey()): MonthKey[] {
  return Array.from({ length: Math.max(count, 0) }, (_, index) =>
    shiftMonthKey(endKey, -index),
  );
}

/** Today as `YYYY-MM-DD` in the runtime's local timezone. */
export function currentDateString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
