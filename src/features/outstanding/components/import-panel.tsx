"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { DataTable } from "@/components/common/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HNS_ACCEPTED_EXTENSIONS, HNS_PREVIEW_ROWS } from "@/config/import";
import { outstandingPreviewColumns } from "@/features/outstanding/columns";
import { ApiError, isApiError } from "@/lib/api/errors";
import type { HnsParseIssue, HnsParsedRow } from "@/lib/import/hns-parser";
import type { ApiResponse } from "@/types/api";
import { formatCurrency, formatNumber } from "@/lib/utils/format";

interface PreviewResponse {
  readonly stats: {
    readonly totalLines: number;
    readonly partyCount: number;
    readonly detailRows: number;
    readonly validRows: number;
    readonly invalidRows: number;
    readonly skippedRows: number;
    readonly balanceTotal: number;
    readonly reportedGrandTotal: number | null;
  };
  readonly errors: readonly HnsParseIssue[];
  readonly warnings: readonly HnsParseIssue[];
  readonly preview: readonly HnsParsedRow[];
  readonly canImport: boolean;
  readonly partyLinking: {
    readonly exportParties: number;
    readonly matchedParties: number;
    readonly unmatchedParties: readonly string[];
    readonly failed: string | null;
  };
}

interface ImportResponse {
  readonly imported: number;
  readonly matchedParties: number;
  readonly unmatchedParties: readonly string[];
  readonly importDate: string;
  readonly balanceTotal: number;
  readonly warnings: number;
}

type Phase = "idle" | "parsing" | "previewed" | "importing" | "done";

/**
 * Uploads the workbook as multipart form data and unwraps the API envelope.
 *
 * The file is sent as bytes rather than parsed in the browser: SheetJS runs
 * server-side only, behind the admin session check.
 */
async function postFile<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`/api${path}`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    body,
  });

  const parsed = (await response.json()) as ApiResponse<T>;
  if (!parsed.ok) throw new ApiError(parsed.error, response.status);
  return parsed.data;
}

/**
 * Upload -> Parse -> Preview -> Confirm -> Import.
 *
 * Nothing is written when a file is chosen: selecting a file only asks the
 * server to parse and validate it. The sheet is touched only after the admin
 * presses Confirm import.
 */
export function ImportPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFileName(null);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(chosen: File) {
    setError(null);
    setResult(null);
    setPreview(null);
    setFileName(chosen.name);

    // Catch the obvious mistake before uploading anything; the server checks
    // the file's actual bytes regardless.
    const lower = chosen.name.toLowerCase();
    if (!HNS_ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      setFile(null);
      setError(
        `"${chosen.name}" is not an Excel file. Upload the ` +
          `${HNS_ACCEPTED_EXTENSIONS.join(" or ")} file exported from H&S.`,
      );
      setPhase("idle");
      return;
    }

    setFile(chosen);
    setPhase("parsing");

    try {
      setPreview(await postFile<PreviewResponse>("/admin/outstanding/preview", chosen));
      setPhase("previewed");
    } catch (cause) {
      setError(isApiError(cause) ? cause.message : "Could not read that file.");
      setPhase("idle");
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setPhase("importing");
    setError(null);

    try {
      // The same file is uploaded again; the server re-parses it rather than
      // trusting anything the preview returned.
      setResult(await postFile<ImportResponse>("/admin/outstanding/import", file));
      setPhase("done");
    } catch (cause) {
      setError(isApiError(cause) ? cause.message : "The import failed.");
      setPhase("previewed");
    }
  }

  const stats = preview?.stats;
  const busy = phase === "parsing" || phase === "importing";

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------------- upload -- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="size-4" aria-hidden />
            Upload H&amp;S export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept={HNS_ACCEPTED_EXTENSIONS.join(",")}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <FileSpreadsheet aria-hidden />
              Choose Excel file
            </Button>

            {fileName ? (
              <span className="flex min-w-0 items-center gap-2 text-sm">
                <span className="truncate font-medium">{fileName}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={reset}
                  disabled={busy}
                  aria-label="Clear selected file"
                >
                  <X aria-hidden />
                </Button>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                No file selected
              </span>
            )}

            {phase === "parsing" ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Reading and validating…
              </span>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Export <span className="font-medium">01 DATE AND PARTY WISE OUTSTANDING</span>{" "}
            from H&amp;S and upload the file as-is — both{" "}
            <code className="font-mono">.xls</code> and{" "}
            <code className="font-mono">.xlsx</code> are read directly, so there is
            no need to convert it. Choosing a file only previews it; nothing is
            saved until you confirm.
          </p>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden />
          <AlertTitle>Import problem</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {/* --------------------------------------------------------- preview -- */}
      {preview && stats && phase !== "done" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox label="Rows detected" value={formatNumber(stats.detailRows)} />
            <StatBox label="Valid rows" value={formatNumber(stats.validRows)} tone="brand" />
            <StatBox
              label="Invalid rows"
              value={formatNumber(stats.invalidRows)}
              tone={stats.invalidRows > 0 ? "destructive" : "muted"}
            />
            <StatBox label="Parties" value={formatNumber(stats.partyCount)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Totals check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <Row label="Outstanding in file" value={formatCurrency(stats.balanceTotal)} />
              <Row
                label="Grand total printed in the report"
                value={
                  stats.reportedGrandTotal === null
                    ? "not found"
                    : formatCurrency(stats.reportedGrandTotal)
                }
              />
              {stats.reportedGrandTotal !== null ? (
                <p
                  className={
                    Math.abs(stats.balanceTotal - stats.reportedGrandTotal) < 1
                      ? "pt-1 text-xs text-brand"
                      : "pt-1 text-xs text-destructive"
                  }
                >
                  {Math.abs(stats.balanceTotal - stats.reportedGrandTotal) < 1
                    ? "Matches the report's own total."
                    : "Does not match the report's own total — check the file before importing."}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {preview.errors.length > 0 ? (
            <IssueList
              tone="error"
              title={`${preview.errors.length} validation ${preview.errors.length === 1 ? "error" : "errors"} — import blocked`}
              issues={preview.errors}
            />
          ) : null}

          {preview.warnings.length > 0 ? (
            <IssueList
              tone="warning"
              title={`${preview.warnings.length} ${preview.warnings.length === 1 ? "warning" : "warnings"}`}
              issues={preview.warnings}
            />
          ) : null}

          {preview.partyLinking.failed ? (
            <Alert>
              <AlertTriangle aria-hidden />
              <AlertTitle>Party matching unavailable</AlertTitle>
              <AlertDescription>{preview.partyLinking.failed}</AlertDescription>
            </Alert>
          ) : preview.partyLinking.unmatchedParties.length > 0 ? (
            <Alert className="border-brand-accent/30 bg-brand-accent-tint dark:bg-brand-accent/10">
              <AlertTriangle className="text-brand-accent" aria-hidden />
              <AlertTitle>
                {preview.partyLinking.unmatchedParties.length} of{" "}
                {preview.partyLinking.exportParties} parties are not in the Parties sheet
              </AlertTitle>
              <AlertDescription>
                <span className="block">
                  These rows will still be imported, but with a blank party code
                  until the party is added. No party is created automatically.
                </span>
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {preview.partyLinking.unmatchedParties.slice(0, 12).map((name) => (
                    <Badge key={name} variant="outline" className="font-normal">
                      {name}
                    </Badge>
                  ))}
                  {preview.partyLinking.unmatchedParties.length > 12 ? (
                    <span className="text-xs text-muted-foreground">
                      +{preview.partyLinking.unmatchedParties.length - 12} more
                    </span>
                  ) : null}
                </span>
              </AlertDescription>
            </Alert>
          ) : null}

          <div>
            <h2 className="mb-2 text-sm font-semibold">
              Preview{" "}
              <span className="font-normal text-muted-foreground">
                (first {Math.min(HNS_PREVIEW_ROWS, preview.preview.length)} of{" "}
                {formatNumber(stats.validRows)} rows)
              </span>
            </h2>
            <DataTable
              columns={outstandingPreviewColumns}
              rows={preview.preview}
              getRowId={(row, index) => `${row.partyName}:${row.billNo ?? "-"}:${index}`}
              caption="Rows that will be imported"
            />
          </div>

          <Card className="border-brand/30">
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-sm">
                <p className="font-medium">
                  {preview.canImport
                    ? `Ready to replace the outstanding snapshot with ${formatNumber(stats.validRows)} rows.`
                    : "Fix the errors above before importing."}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Only H&amp;S Outstanding is replaced. Collections, follow-ups
                  and monthly data are untouched.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleConfirm}
                disabled={!preview.canImport || phase === "importing"}
              >
                {phase === "importing" ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    Importing…
                  </>
                ) : (
                  <>
                    <Upload aria-hidden />
                    Confirm import
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* ---------------------------------------------------------- result -- */}
      {phase === "done" && result ? (
        <>
          <Alert className="border-brand/40 bg-brand-tint dark:bg-brand/10">
            <CheckCircle2 className="text-brand" aria-hidden />
            <AlertTitle>Import complete</AlertTitle>
            <AlertDescription>
              {formatNumber(result.imported)} rows imported on {result.importDate}.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBox label="Imported" value={formatNumber(result.imported)} tone="brand" />
            <StatBox label="Updated" value="—" hint="Snapshot replace" />
            <StatBox label="Skipped" value="0" />
            <StatBox
              label="Warnings"
              value={formatNumber(result.warnings)}
              tone={result.warnings > 0 ? "accent" : "muted"}
            />
          </div>

          <Card>
            <CardContent className="space-y-1 text-sm">
              <Row label="Total outstanding imported" value={formatCurrency(result.balanceTotal)} />
              <Row label="Parties matched" value={formatNumber(result.matchedParties)} />
              <Row
                label="Parties not in Parties sheet"
                value={formatNumber(result.unmatchedParties.length)}
              />
            </CardContent>
          </Card>

          <Button type="button" variant="outline" onClick={reset}>
            Import another file
          </Button>
        </>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ bits -- */

function StatBox({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "muted" | "brand" | "accent" | "destructive";
}) {
  const toneClass =
    tone === "brand"
      ? "text-brand"
      : tone === "accent"
        ? "text-brand-accent"
        : tone === "destructive"
          ? "text-destructive"
          : "";

  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-[0.68rem] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {label}
        </p>
        <p className={`font-heading text-2xl font-bold tabular-nums ${toneClass}`}>
          {value}
        </p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function IssueList({
  tone,
  title,
  issues,
}: {
  tone: "error" | "warning";
  title: string;
  issues: readonly HnsParseIssue[];
}) {
  const shown = issues.slice(0, 10);
  return (
    <Alert variant={tone === "error" ? "destructive" : "default"}>
      <AlertTriangle aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-0.5 text-xs">
          {shown.map((issue, index) => (
            <li key={`${issue.line}-${index}`}>
              <span className="font-mono">line {issue.line}</span>
              {issue.party ? ` · ${issue.party}` : ""} — {issue.message}
            </li>
          ))}
        </ul>
        {issues.length > shown.length ? (
          <p className="mt-1 text-xs opacity-80">
            +{issues.length - shown.length} more
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
