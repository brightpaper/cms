import { PageHeader } from "@/components/common/page-header";
import { PendingIntegration } from "@/components/common/pending-integration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app";
import { SHEET_NAMES } from "@/config/constants";
import { publicEnv } from "@/config/env";
import { API_ACTIONS } from "@/lib/api/actions";
import type { UserRole } from "@/types/user";

interface SettingsViewProps {
  readonly role: UserRole;
}

export function SettingsView({ role }: SettingsViewProps) {
  const isAdmin = role === "admin";

  return (
    <>
      <PageHeader
        title="Settings"
        description={
          isAdmin
            ? "Application configuration, spreadsheet wiring and account preferences."
            : "Your account preferences."
        }
      />

      <PendingIntegration
        actions={[API_ACTIONS.users.update]}
        note="Changing your own password from this page is a later step. For now an administrator can change it from Users & permissions."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Name</span>
              <span>{APP_CONFIG.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Environment</span>
              <span className="capitalize">{publicEnv.appEnv}</span>
            </div>
          </CardContent>
        </Card>

        {isAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Google Sheets tabs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              {Object.values(SHEET_NAMES).map((sheet) => (
                <p key={sheet}>
                  <code>{sheet}</code>
                </p>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
}
