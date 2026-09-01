import type {
  Amount,
  AuditFields,
  DateString,
  EntityId,
  MonthKey,
} from "@/types/common";

/**
 * A collection transaction recorded by the application. Mirrors `Collections`.
 *
 * This is a transaction, NOT an outstanding balance. It never overwrites an
 * H&S row. Every entry carries the `monthKey` it was created in, and that value
 * is never recalculated — which is exactly what keeps historical months intact.
 */
export interface Collection extends AuditFields {
  readonly collectionId: EntityId;
  readonly partyId: EntityId;
  readonly salesmanId: EntityId;
  readonly amount: Amount;
  readonly paymentDate: DateString | null;
  /** `YYYY-MM` partition. Assigned once at creation, never changed. */
  readonly monthKey: MonthKey;
  readonly paymentMode: string | null;
  readonly referenceNo: string | null;
  readonly remark: string | null;
}

/** Filters accepted by `collections.list`. */
export interface CollectionFilters {
  readonly monthKey?: MonthKey;
  readonly partyId?: EntityId;
  readonly salesmanId?: EntityId;
}
