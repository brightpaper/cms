import type { Amount, DateString } from "@/types/common";

/**
 * A single outstanding row as exported from the H&S ERP. Mirrors
 * `HNS_Outstanding`.
 *
 * READ-ONLY inside the CMS. It must never be edited per-row or mixed with
 * collection transactions — collections live in their own sheet and reference
 * the party, not this record.
 *
 * `extra` carries any additional trailing columns the real H&S export happens
 * to contain, so the schema can widen without a code change.
 */
export interface HnsOutstandingRecord {
  readonly hnsPartyCode: string;
  readonly partyName: string;
  readonly billNo: string | null;
  readonly billDate: DateString | null;
  readonly creditDays: number | null;
  readonly billAmount: Amount | null;
  readonly receivedAmount: Amount | null;
  readonly balanceAmount: Amount | null;
  readonly dueDate: DateString | null;
  readonly importDate: DateString | null;
  /** Any columns present in the sheet beyond the known headers. */
  readonly extra?: Readonly<Record<string, string>>;
}

/** What `outstanding.import` reports back after a snapshot replace. */
export interface HnsImportResult {
  readonly imported: number;
  readonly replaced: number;
  readonly skipped: number;
  readonly matchedParties: number;
  /** Party names present in the export but absent from the Parties sheet. */
  readonly unmatchedParties: readonly string[];
  readonly importDate: DateString;
  readonly balanceTotal: Amount;
}
