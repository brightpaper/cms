"use client";

import { CalendarRange } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMonthLabel } from "@/lib/utils/period";
import type { MonthKey } from "@/types/common";

export const ALL_MONTHS = "all";

interface MonthSelectorProps {
  /**
   * Months that actually contain data, newest first. Supplied by the caller
   * from `reports.availablePeriods` — this component never invents months.
   */
  readonly months: readonly MonthKey[];
  readonly value: MonthKey | typeof ALL_MONTHS;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
}

/**
 * Month picker used on every month-wise screen. Selecting a month filters the
 * page; every month that has ever held data stays selectable.
 */
export function MonthSelector({
  months,
  value,
  onChange,
  disabled = false,
}: MonthSelectorProps) {
  const isEmpty = months.length === 0;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-56" aria-label="Select month">
        <CalendarRange className="size-4 opacity-70" aria-hidden />
        <SelectValue placeholder={isEmpty ? "No data yet" : "Select month"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_MONTHS}>All months</SelectItem>
        {months.map((month) => (
          <SelectItem key={month} value={month}>
            {formatMonthLabel(month)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
