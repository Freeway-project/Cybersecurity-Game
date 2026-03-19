"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface InviteOutput {
  email: string;
  participantId: string;
  inviteToken: string;
  startUrl: string;
}

interface AdminConsoleProps {
  analysisExportHref: string;
  rawExportHref: string;
}

export function AdminConsole({
  analysisExportHref,
  rawExportHref,
}: AdminConsoleProps) {
  const [emails, setEmails] = useState("");
  const [cohort, setCohort] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvites, setCreatedInvites] = useState<InviteOutput[]>([]);

  const emailCount = useMemo(
    () =>
      emails
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean).length,
    [emails],
  );

  async function handleInviteGeneration(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emails: emails
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
          cohort: cohort.trim() || undefined,
          yearLevel: yearLevel.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        invites?: InviteOutput[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to create invites.");
      }

      setCreatedInvites(payload.invites ?? []);
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : "Unable to create invites.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <Card>
        <div className="space-y-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
              Invite Generation
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-[var(--ink)]">
              Create participant links
            </h2>
          </div>
          <form className="space-y-4" onSubmit={handleInviteGeneration}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--ink)]">
                Participant emails
              </span>
              <textarea
                value={emails}
                onChange={(event) => setEmails(event.target.value)}
                className="min-h-52 w-full rounded-3xl border border-[var(--border-strong)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent-strong)]"
                placeholder={"student1@example.edu\nstudent2@example.edu"}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink)]">Cohort</span>
                <input
                  value={cohort}
                  onChange={(event) => setCohort(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-strong)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent-strong)]"
                  placeholder="Optional course or cohort"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink)]">Year level</span>
                <input
                  value={yearLevel}
                  onChange={(event) => setYearLevel(event.target.value)}
                  className="w-full rounded-2xl border border-[var(--border-strong)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent-strong)]"
                  placeholder="Optional year level"
                />
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--ink-muted)]">
                {emailCount} participant {emailCount === 1 ? "entry" : "entries"} ready
              </p>
              <Button type="submit" disabled={loading || emailCount === 0}>
                {loading ? "Creating..." : "Create invite links"}
              </Button>
            </div>
            {error ? (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </Card>

      <Card>
        <div className="space-y-4">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
            Exports
          </p>
          <div className="space-y-3">
            <a
              href={analysisExportHref}
              className="block rounded-2xl border border-[var(--border-strong)] bg-white px-4 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--card)]"
            >
              Download analysis CSV
            </a>
            <a
              href={rawExportHref}
              className="block rounded-2xl border border-[var(--border-strong)] bg-white px-4 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--card)]"
            >
              Download raw JSON export
            </a>
          </div>
          {createdInvites.length > 0 ? (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                Latest invite links
              </h3>
              <div className="max-h-96 space-y-3 overflow-y-auto pr-2">
                {createdInvites.map((invite) => (
                  <div
                    key={invite.inviteToken}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/65 p-4"
                  >
                    <p className="text-sm font-medium text-[var(--ink)]">{invite.email}</p>
                    <p className="mt-1 break-all font-mono text-xs text-[var(--ink-muted)]">
                      {invite.startUrl}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
