import { ApiError } from "@/lib/api/errors";
import type { ApiResponse } from "@/types/api";
import type { EffectivePermissions, PermissionFlagValues } from "@/types/permission";
import type { User, UserRole } from "@/types/user";

/**
 * Browser-side calls for user administration.
 *
 * Every one of these hits a Next Route Handler that re-checks for an ADMIN
 * session; nothing here is trusted. Passwords are sent in a JSON body over the
 * same-origin request and never appear in a URL or query string.
 */

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`/api/admin${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: init.body
      ? { "Content-Type": "application/json", ...(init.headers ?? {}) }
      : init.headers,
  });

  const parsed = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!parsed) {
    throw new ApiError(
      { code: "UNKNOWN", message: "The server returned an unreadable response." },
      response.status,
    );
  }
  if (!parsed.ok) throw new ApiError(parsed.error, response.status);
  return parsed.data;
}

export const adminApi = {
  createUser: (input: {
    username: string;
    password: string;
    name: string;
    role: UserRole;
  }) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(input) }),

  updateUser: (
    userId: string,
    patch: {
      username?: string;
      name?: string;
      role?: UserRole;
      password?: string;
    },
  ) =>
    request<User>(`/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  setActive: (userId: string, active: boolean) =>
    request<User>(`/users/${encodeURIComponent(userId)}/active`, {
      method: "POST",
      body: JSON.stringify({ active }),
    }),

  getPermissions: (userId: string) =>
    request<EffectivePermissions>(
      `/users/${encodeURIComponent(userId)}/permissions`,
    ),

  updatePermissions: (userId: string, permissions: PermissionFlagValues) =>
    request<EffectivePermissions>(
      `/users/${encodeURIComponent(userId)}/permissions`,
      { method: "PUT", body: JSON.stringify(permissions) },
    ),
} as const;
