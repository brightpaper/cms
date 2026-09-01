import type { Amount, EntityId, MonthKey, TimestampString } from "@/types/common";

/**
 * A cached month-wise rollup. Mirrors the `MonthlySummary` sheet.
 *
 * The structure exists so reporting has somewhere to write; no calculation is
 * implemented yet, and nothing in the UI fabricates these values.
 */
export interface MonthlySummary {
  readonly monthKey: MonthKey;
  readonly salesmanId: EntityId;
  readonly totalDue: Amount | null;
  readonly totalCollected: Amount | null;
  readonly totalBalance: Amount | null;
  readonly collectionPercentage: number | null;
  readonly updatedAt: TimestampString | null;
}
