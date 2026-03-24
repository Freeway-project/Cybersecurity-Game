"use client";

import { Card } from "@/components/ui/card";

interface AdminConsoleProps {
  analysisExportHref: string;
  rawExportHref: string;
}

export function AdminConsole({
  analysisExportHref,
  rawExportHref,
}: AdminConsoleProps) {
  return (
    <Card>
      <div className="space-y-4">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
          Exports
        </p>
        <div className="space-y-3">
          <a
            href={analysisExportHref}
            className="block rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--card-soft)]"
          >
            Download analysis CSV
          </a>
          <a
            href={rawExportHref}
            className="block rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--card-soft)]"
          >
            Download raw JSON export
          </a>
        </div>
      </div>
    </Card>
  );
}
