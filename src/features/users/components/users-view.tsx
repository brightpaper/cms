"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Plus, ShieldCheck, SquarePen, Users } from "lucide-react";

import { DataTable, type ColumnDef } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { IntegrationStatus } from "@/components/common/integration-status";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PERMISSION_FLAGS } from "@/config/constants";
import { UserDialog } from "@/features/users/components/user-dialog";
import { PermissionsDialog } from "@/features/users/components/permissions-dialog";
import { adminApi } from "@/features/users/api";
import type { LoadResult } from "@/lib/api/load";
import { humanize } from "@/lib/utils/format";
import type { SessionUser, User } from "@/types/user";

interface UsersViewProps {
  readonly users: LoadResult<readonly User[]>;
  /** The signed-in admin, so the UI can stop them disabling themselves. */
  readonly currentUser: SessionUser;
}

type DialogState =
  | { readonly kind: "closed" }
  | { readonly kind: "create" }
  | { readonly kind: "edit"; readonly user: User }
  | { readonly kind: "password"; readonly user: User }
  | { readonly kind: "permissions"; readonly user: User };

export function UsersView({ users, currentUser }: UsersViewProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = users.ok ? users.data : [];
  const close = () => setDialog({ kind: "closed" });

  async function toggleActive(user: User, active: boolean) {
    setBusyId(user.userId);
    setError(null);
    try {
      await adminApi.setActive(user.userId, active);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the user.");
    } finally {
      setBusyId(null);
    }
  }

  const columns: readonly ColumnDef<User>[] = [
    {
      id: "name",
      header: "Name",
      cell: (user) => (
        <span className="font-medium">
          {user.name}
          {user.userId === currentUser.userId ? (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (you)
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "username",
      header: "Username",
      cell: (user) => (
        <span className="font-mono text-xs text-muted-foreground">
          @{user.username}
        </span>
      ),
    },
    {
      id: "role",
      header: "Role",
      cell: (user) => (
        <Badge variant={user.role === "admin" ? "secondary" : "outline"}>
          {humanize(user.role)}
        </Badge>
      ),
    },
    {
      id: "active",
      header: "Active",
      cell: (user) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={user.active}
            disabled={busyId === user.userId || user.userId === currentUser.userId}
            onCheckedChange={(checked) => void toggleActive(user, checked)}
            aria-label={`${user.active ? "Deactivate" : "Activate"} ${user.username}`}
          />
          {busyId === user.userId ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
          ) : null}
        </div>
      ),
      hideOnMobile: true,
    },
    {
      id: "actions",
      header: "Manage",
      align: "end",
      cell: (user) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialog({ kind: "edit", user })}
          >
            <SquarePen aria-hidden />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialog({ kind: "password", user })}
          >
            <KeyRound aria-hidden />
            Password
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialog({ kind: "permissions", user })}
          >
            <ShieldCheck aria-hidden />
            Permissions
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users & permissions"
        description={`Login accounts, roles and the ${PERMISSION_FLAGS.length} permission flags stored per user.`}
        actions={
          <Button onClick={() => setDialog({ kind: "create" })}>
            <Plus aria-hidden />
            Add user
          </Button>
        }
      />

      {users.ok ? null : <IntegrationStatus error={users.error} />}

      {error ? (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(user) => user.userId}
        caption="User accounts"
        emptyState={
          <EmptyState
            icon={Users}
            title="No users yet"
            description="Add the first account to get started."
          />
        }
      />

      <p className="mt-3 text-xs text-muted-foreground">
        Passwords are never shown here or returned by the API. Use{" "}
        <span className="font-medium">Password</span> to set a new one. You
        cannot deactivate your own account.
      </p>

      {dialog.kind === "create" || dialog.kind === "edit" ? (
        <UserDialog
          mode={dialog.kind}
          user={dialog.kind === "edit" ? dialog.user : null}
          onClose={close}
          onSaved={() => {
            close();
            router.refresh();
          }}
        />
      ) : null}

      {dialog.kind === "password" ? (
        <UserDialog
          mode="password"
          user={dialog.user}
          onClose={close}
          onSaved={() => {
            close();
            router.refresh();
          }}
        />
      ) : null}

      {dialog.kind === "permissions" ? (
        <PermissionsDialog user={dialog.user} onClose={close} />
      ) : null}
    </>
  );
}
