import type { PERMISSION_FLAGS } from "@/config/constants";
import type { EntityId, TimestampString } from "@/types/common";

export type PermissionFlag = (typeof PERMISSION_FLAGS)[number];

/**
 * Per-user capability flags. Mirrors the `Permissions` sheet.
 *
 * Nothing enforces these yet — enforcement belongs to a later step, and will
 * live in Apps Script so the client cannot widen its own access.
 */
export type UserPermissions = {
  readonly permissionId: EntityId;
  readonly userId: EntityId;
  readonly updatedAt: TimestampString | null;
} & {
  readonly [Flag in PermissionFlag]: boolean;
};

/** What `permissions.getEffective` returns, including whether a row exists. */
export type EffectivePermissions = UserPermissions & {
  /** False when the user has no Permissions row yet; every flag is then false. */
  readonly exists: boolean;
};

/** The flag values submitted when saving permissions. */
export type PermissionFlagValues = {
  readonly [Flag in PermissionFlag]: boolean;
};
