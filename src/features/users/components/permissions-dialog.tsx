"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PERMISSION_FLAGS } from "@/config/constants";
import { adminApi } from "@/features/users/api";
import { isApiError } from "@/lib/api/errors";
import type { PermissionFlag, PermissionFlagValues } from "@/types/permission";
import type { User } from "@/types/user";

interface PermissionsDialogProps {
  readonly user: User;
  readonly onClose: () => void;
}

/** Readable label for each flag, so the admin is not reading camelCase. */
const FLAG_LABELS: Record<PermissionFlag, string> = {
  canViewAssignedParties: "View assigned parties",
  canAddCollection: "Add collections",
  canEditCollection: "Edit collections",
  canDeleteCollection: "Delete collections",
  canAddFollowUp: "Add follow-ups",
  canEditFollowUp: "Edit follow-ups",
  canDeleteFollowUp: "Delete follow-ups",
  canViewReports: "View reports",
  canExport: "Export data",
};

const emptyFlags = (): PermissionFlagValues =>
  Object.fromEntries(
    PERMISSION_FLAGS.map((flag) => [flag, false]),
  ) as PermissionFlagValues;

/**
 * Edits the per-user permission flags stored in the Permissions sheet.
 *
 * Nothing enforces these yet — enforcement belongs to the salesman-scoping
 * step — so the dialog says so rather than implying the flags already restrict
 * anything.
 */
export function PermissionsDialog({ user, onClose }: PermissionsDialogProps) {
  const [flags, setFlags] = useState<PermissionFlagValues>(emptyFlags);
  const [exists, setExists] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    adminApi
      .getPermissions(user.userId)
      .then((stored) => {
        if (cancelled) return;
        setFlags(
          Object.fromEntries(
            PERMISSION_FLAGS.map((flag) => [flag, stored[flag] === true]),
          ) as PermissionFlagValues,
        );
        setExists(stored.exists);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          isApiError(cause) ? cause.message : "Could not load permissions.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user.userId]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await adminApi.updatePermissions(user.userId, flags);
      onClose();
    } catch (cause) {
      setError(isApiError(cause) ? cause.message : "Could not save permissions.");
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Permissions for {user.name}</DialogTitle>
          <DialogDescription>
            Stored against @{user.username} in the Permissions sheet. These flags
            are not enforced yet — enforcement arrives with salesman scoping.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading permissions…
            </div>
          ) : (
            <>
              {exists === false ? (
                <p className="mb-3 text-xs text-muted-foreground">
                  No permissions row exists for this user yet. Saving will create
                  one.
                </p>
              ) : null}

              <div className="grid gap-2 sm:grid-cols-2">
                {PERMISSION_FLAGS.map((flag) => (
                  <label
                    key={flag}
                    className="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={flags[flag]}
                      disabled={saving}
                      onCheckedChange={(checked) =>
                        setFlags((current) => ({
                          ...current,
                          [flag]: checked === true,
                        }))
                      }
                    />
                    <Label className="cursor-pointer font-normal">
                      {FLAG_LABELS[flag]}
                    </Label>
                  </label>
                ))}
              </div>
            </>
          )}

          {error ? (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading || saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save permissions"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
