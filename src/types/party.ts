import type { AuditFields, EntityId } from "@/types/common";

/**
 * A customer / party. Mirrors the `Parties` sheet.
 *
 * Parties are a first-class master record, deliberately separate from the H&S
 * outstanding export. `hnsPartyCode` is the join key back to the ERP data, so
 * re-importing outstanding figures never rewrites the party master.
 */
export interface Party extends AuditFields {
  /** The application's stable id — never the party name, never the row index. */
  readonly partyId: EntityId;
  /** Party code as it appears in the H&S ERP export. */
  readonly hnsPartyCode: string;
  readonly partyName: string;
  readonly phone: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly active: boolean;
}

/**
 * Assignment of a party to a salesman. Mirrors `PartyAssignments`.
 *
 * Kept in its own sheet rather than as a column on `Party` so reassignment
 * history is preserved.
 */
export interface PartyAssignment {
  readonly assignmentId: EntityId;
  readonly partyId: EntityId;
  readonly salesmanId: EntityId;
  readonly assignedAt: string | null;
  readonly assignedBy: EntityId | null;
  readonly active: boolean;
}

/** Filters accepted by `parties.list`. Authorisation is not applied yet. */
export interface PartyFilters {
  readonly salesmanId?: EntityId;
  readonly active?: boolean;
  readonly search?: string;
}
