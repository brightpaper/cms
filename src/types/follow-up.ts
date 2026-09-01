import type { FOLLOW_UP_STATUSES } from "@/config/constants";
import type {
  AuditFields,
  DateString,
  EntityId,
  MonthKey,
} from "@/types/common";

export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

/**
 * A contact attempt against a party: what was discussed, and when to call next.
 * Mirrors the `FollowUps` sheet.
 *
 * Follow-ups are separate from collections — a follow-up may or may not result
 * in a payment, and a payment may be logged without a follow-up. New follow-ups
 * are appended; earlier records are never overwritten.
 */
export interface FollowUp extends AuditFields {
  readonly followUpId: EntityId;
  readonly partyId: EntityId;
  readonly salesmanId: EntityId;
  readonly followUpDate: DateString | null;
  readonly nextFollowUpDate: DateString | null;
  readonly remark: string | null;
  /** Free text in the sheet; the UI treats unknown values as-is. */
  readonly status: string | null;
}

/**
 * Filters accepted by `followUps.list`.
 *
 * `monthKey` is derived from `followUpDate` by the backend — the FollowUps
 * sheet has no month column of its own.
 */
export interface FollowUpFilters {
  readonly monthKey?: MonthKey;
  readonly partyId?: EntityId;
  readonly salesmanId?: EntityId;
  readonly status?: string;
}
