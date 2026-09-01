"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { http } from "@/lib/api/http";
import { isApiError } from "@/lib/api/errors";
import type { SessionUser } from "@/types/user";

interface LoginResponse {
  readonly user: SessionUser;
  readonly redirectTo: string;
}

/**
 * Username + password form.
 *
 * Credentials are posted once to `/api/auth/login` and never retained: no
 * localStorage, no sessionStorage, no query string. The session arrives as an
 * httpOnly cookie this component cannot read.
 */
export function LoginForm() {
  const router = useRouter();

  const [isSubmitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");

    setSubmitting(true);
    try {
      const result = await http.post<LoginResponse>("/auth/login", {
        username,
        password,
      });

      // Read ?next= straight from the URL rather than via useSearchParams,
      // which would opt this component out of server rendering and leave the
      // form blank until hydration. Only a same-origin relative path is
      // followed, so ?next= can never bounce someone to another site.
      const requested = new URLSearchParams(window.location.search).get("next");
      const destination =
        requested && requested.startsWith("/") && !requested.startsWith("//")
          ? requested
          : result.redirectTo;

      // refresh() re-runs the server components so the new session is picked up.
      router.replace(destination);
      router.refresh();
    } catch (cause) {
      setError(
        isApiError(cause) && cause.code !== "UNKNOWN"
          ? cause.message
          : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Enter your username"
          disabled={isSubmitting}
          required
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={isSubmitting}
            required
            // Room on the right so the text never runs under the toggle.
            className="h-12 pr-12 text-base"
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            disabled={isSubmitting}
            // aria-pressed rather than a changing name, so a screen reader
            // announces the toggle state.
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden />
            ) : (
              <Eye className="size-4" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="submit"
        className="mt-2 h-12 w-full text-[0.95rem]"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Signing in…
          </>
        ) : (
          <>
            <LogIn aria-hidden />
            Sign in
          </>
        )}
      </Button>
    </form>
  );
}
