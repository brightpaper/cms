import "server-only";

import { API_ACTIONS } from "@/lib/api/actions";
import { callAppsScript } from "@/lib/api/apps-script";
import { CACHE_TAG, cachedRead } from "@/lib/api/cache";
import type { EntityId } from "@/types/common";
import type {
  EffectivePermissions,
  PermissionFlagValues,
} from "@/types/permission";
import type { CreateUserInput, UpdateUserInput, User } from "@/types/user";

/**
 * User and permission administration.
 *
 * Passwords travel one way only: they are sent to Apps Script on create and
 * update, and no response type here contains a password field.
 */

export const listUsers = cachedRead(
  (): Promise<readonly User[]> =>
    callAppsScript<readonly User[]>(API_ACTIONS.users.list, {}),
  [API_ACTIONS.users.list],
  [CACHE_TAG.users],
);

export function createUser(input: CreateUserInput): Promise<User> {
  return callAppsScript<User>(API_ACTIONS.users.create, input);
}

export function updateUser(input: UpdateUserInput): Promise<User> {
  return callAppsScript<User>(API_ACTIONS.users.update, input);
}

export function setUserActive(
  userId: EntityId,
  active: boolean,
): Promise<User> {
  return callAppsScript<User>(API_ACTIONS.users.setActive, { userId, active });
}

export function getPermissions(
  userId: EntityId,
): Promise<EffectivePermissions> {
  return callAppsScript<EffectivePermissions>(
    API_ACTIONS.permissions.getEffective,
    { userId },
  );
}

export function updatePermissions(
  userId: EntityId,
  permissions: PermissionFlagValues,
): Promise<EffectivePermissions> {
  return callAppsScript<EffectivePermissions>(API_ACTIONS.permissions.update, {
    userId,
    permissions,
  });
}
