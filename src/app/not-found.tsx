import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/routes";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-heading text-3xl font-semibold">404</p>
      <p className="text-sm text-muted-foreground">
        That page does not exist.
      </p>
      <Button asChild variant="outline">
        <Link href={ROUTES.home}>Back to sign in</Link>
      </Button>
    </div>
  );
}
