"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/features/users/api";
import { isApiError } from "@/lib/api/errors";
import type { User, UserRole } from "@/types/user";

type Mode = "create" | "edit" | "password";

interface UserDialogProps {
  readonly mode: Mode;
  readonly user: User | null;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}

const TITLES: Record<Mode, string> = {
  create: "Add user",
  edit: "Edit user",
  password: "Change password",
};

/**
 * Add / edit / change-password, sharing one form.
 *
 * The password field is write-only in every mode: it is never pre-filled,
 * because the server never sends a password back.
 */
export function UserDialog({ mode, user, onClose, onSaved }: UserDialogProps) {
  const [role, setRole] = useState<UserRole>(user?.role ?? "salesman");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      if (mode === "create") {
        await adminApi.createUser({ username, password, name, role });
      } else if (mode === "edit" && user) {
        await adminApi.updateUser(user.userId, { username, name, role });
      } else if (mode === "password" && user) {
        await adminApi.updateUser(user.userId, { password });
      }
      onSaved();
    } catch (cause) {
      setError(
        isApiError(cause) ? cause.message : "Could not save. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{TITLES[mode]}</DialogTitle>
            <DialogDescription>
              {mode === "password"
                ? `Set a new password for @${user?.username}. The current one is never shown.`
                : mode === "edit"
                  ? "Usernames are matched case-insensitively and must be unique."
                  : "The account can sign in immediately once created."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {mode !== "password" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={user?.name ?? ""}
                    placeholder="Ravi Patel"
                    disabled={saving}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    defaultValue={user?.username ?? ""}
                    placeholder="ravi"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={saving}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={role}
                    onValueChange={(value) => setRole(value as UserRole)}
                    disabled={saving}
                  >
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="salesman">Salesman</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            {mode !== "edit" ? (
              <div className="space-y-2">
                <Label htmlFor="password">
                  {mode === "password" ? "New password" : "Password"}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  minLength={6}
                  disabled={saving}
                  required
                />
              </div>
            ) : null}

            {error ? (
              <Alert variant="destructive">
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
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
