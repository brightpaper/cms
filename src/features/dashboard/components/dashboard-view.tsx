import Link from "next/link";
import { Building2, CalendarClock, PhoneCall, Wallet } from "lucide-react";

import { IntegrationStatus } from "@/components/common/integration-status";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTES } from "@/config/routes";
import type { LoadResult } from "@/lib/api/load";
import { formatMonthLabel } from "@/lib/utils/period";
import { formatNumber } from "@/lib/utils/format";
import type { MonthKey } from "@/types/common";
import type { UserRole } from "@/types/user";

interface DashboardViewProps {
  readonly role: UserRole;
  readonly periods: LoadResult<readonly MonthKey[]>;
  readonly partyCount: LoadResult<number>;
}

/**
 * Counts only. Collection and outstanding *totals* need monthly aggregation,
 * which is a later step — showing a number here now would mean inventing one.
 */
export function DashboardView({
  role,
  periods,
  partyCount,
}: DashboardViewProps) {
  const isAdmin = role === "admin";
  const routes = isAdmin ? ROUTES.admin : ROUTES.salesman;
  const months = periods.ok ? periods.data : [];
  const latestMonth = months[0];

  const firstError = !partyCount.ok
    ? partyCount.error
    : !periods.ok
      ? periods.error
      : null;

  return (
    <>
      <PageHeader
        title={isAdmin ? "Admin dashboard" : "My dashboard"}
        description={
          isAdmin
            ? "Live counts from the Google Sheets database. Monetary totals arrive with monthly reporting."
            : "Live counts from your data. Monetary totals arrive with monthly reporting."
        }
      />

      {firstError ? <IntegrationStatus error={firstError} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Parties"
          value={partyCount.ok ? formatNumber(partyCount.data) : undefined}
          hint="Rows in the Parties sheet"
          icon={Building2}
        />
        <StatCard
          label="Months with data"
          value={periods.ok ? formatNumber(months.length) : undefined}
          hint={latestMonth ? `Latest: ${formatMonthLabel(latestMonth)}` : undefined}
          icon={CalendarClock}
          tone="accent"
        />
        <StatCard
          label="Collected"
          value={undefined}
          hint="Needs monthly aggregation"
          icon={Wallet}
          tone="accent"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4" aria-hidden />
              Collections
            </CardTitle>
            <CardDescription>
              Browse any month that contains data. Historical months are never
              deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href={routes.collections}>Open collections</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="size-4" aria-hidden />
              Follow-ups
            </CardTitle>
            <CardDescription>
              Remarks and next-follow-up dates, grouped by month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href={routes.followUps}>Open follow-ups</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
