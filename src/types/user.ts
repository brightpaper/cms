import type { USER_ROLES } from "@/config/constants";
import type { AuditFields, EntityId } from "@/types/common";

export type UserRole = (typeof USER_ROLES)[number];

/**
 * A login account. Mirrors the `Users` sheet.
 *
 * The `password` column is deliberately absent: it never leaves Apps Script, so the
 * frontend only ever sees this safe projection.
 */
export interface User extends AuditFields {
  readonly userId: EntityId;
  readonly username: string;
  readonly name: string;
  /** Lower-cased from the sheet's `ADMIN` / `SALESMAN`. */
  readonly role: UserRole;
  readonly active: boolean;
}

/** The authenticated user as held in the session. Populated in a later step. */
export interface SessionUser {
  readonly userId: EntityId;
  readonly username: string;
  readonly name: string;
  readonly role: UserRole;
}

export interface Credentials {
  readonly username: string;
  readonly password: string;
}

/** Fields accepted when creating an account. `password` is write-only. */
export interface CreateUserInput {
  readonly username: string;
  readonly password: string;
  readonly name: string;
  readonly role: UserRole;
  readonly active?: boolean;
}

/**
 * Fields accepted when editing an account.
 *
 * `password` is optional and write-only: omitting it leaves the stored password
 * untouched, and it is never returned by any response.
 */
export interface UpdateUserInput {
  readonly userId: EntityId;
  readonly username?: string;
  readonly name?: string;
  readonly role?: UserRole;
  readonly password?: string;
}
