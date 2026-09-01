import Link from "next/link";

import { BrandLogo } from "@/components/layout/brand-logo";
import { cn } from "@/lib/utils";

interface BrandProps {
  readonly href: string;
  readonly className?: string;
}

/** Logo lock-up in the sidebar and the mobile drawer. */
export function Brand({ href, className }: BrandProps) {
  return (
    <Link
      href={href}
      aria-label="Bright Paper — go to dashboard"
      className={cn(
        "block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <BrandLogo className="w-40" priority />
    </Link>
  );
}
