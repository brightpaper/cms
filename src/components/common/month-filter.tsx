"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { ALL_MONTHS, MonthSelector } from "@/components/common/month-selector";
import type { MonthKey } from "@/types/common";

interface MonthFilterProps {
  readonly months: readonly MonthKey[];
  /** Current selection, read from the URL by the server. */
  readonly selected: MonthKey | undefined;
}

/**
 * Drives the month selection through the URL (`?month=YYYY-MM`) so the server
 * component re-reads the sheet for that month. Keeping it in the URL also makes
 * a given month shareable and survives a refresh.
 */
export function MonthFilter({ months, selected }: MonthFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL_MONTHS) {
      params.delete("month");
    } else {
      params.set("month", value);
    }
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  return (
    <MonthSelector
      months={months}
      value={selected ?? ALL_MONTHS}
      onChange={handleChange}
      disabled={isPending}
    />
  );
}
