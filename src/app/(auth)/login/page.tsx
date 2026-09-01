import type { Metadata } from "next";

import { BrandLogo } from "@/components/layout/brand-logo";
import { LoginForm } from "@/features/auth/components/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * Single login page for both roles. The role is resolved from the account after
 * authentication and decides which dashboard the user is redirected to.
 */
export default function LoginPage() {
  return (
    <>
      <Card className="relative overflow-hidden border-border/70 shadow-xl shadow-brand-dark/5">
        {/* The logo diagonal as a header rule. */}
        <span
          aria-hidden
          className="bp-accent-rule absolute inset-x-0 top-0 h-1.5"
        />

        <CardHeader className="items-center pt-10 text-center">
          <BrandLogo className="mx-auto w-52" priority />
          <CardTitle className="sr-only">Bright Paper</CardTitle>
          <CardDescription className="mt-3">
            Collection Management System
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pt-4 pb-10 sm:px-8">
          <LoginForm />
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Bright Paper · Surat, Gujarat · Quality since 2007
      </p>
    </>
  );
}
