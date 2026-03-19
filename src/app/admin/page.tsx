import { cookies } from "next/headers";

import { Card } from "@/components/ui/card";
import { SiteShell } from "@/components/layout/site-shell";
import { AdminConsole } from "@/modules/admin/components/admin-console";
import { AdminLoginForm } from "@/modules/admin/components/admin-login-form";
import { getAdminOverview, isAdminAuthenticated } from "@/modules/admin/server";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthenticated = await isAdminAuthenticated(cookieStore);
  const overview = isAuthenticated ? await getAdminOverview() : null;

  return (
    <SiteShell
      eyebrow="Pilot Operations"
      title="Study admin console"
      description="Invite generation, funnel visibility, and exports for the non-game pilot build."
    >
      <div className="space-y-6">
        {isAuthenticated ? (
          <>
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              {overview
                ? Object.entries(overview.counts).map(([label, value]) => (
                    <Card key={label} className="p-5">
                      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--ink-muted)]">
                        {label}
                      </p>
                      <p className="mt-3 text-3xl font-semibold text-[var(--ink)]">{value}</p>
                    </Card>
                  ))
                : null}
            </div>
            <AdminConsole
              analysisExportHref="/api/admin/export/analysis"
              rawExportHref="/api/admin/export/raw"
            />
            <Card>
              <div className="space-y-4">
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
                  Recent invites
                </p>
                <div className="space-y-3">
                  {overview?.recentInvites.length ? (
                    overview.recentInvites.map((invite) => (
                      <div
                        key={invite.inviteToken}
                        className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 px-4 py-3 text-sm text-[var(--ink-muted)]"
                      >
                        <div className="font-medium text-[var(--ink)]">{invite.email}</div>
                        <div className="mt-1 font-mono text-xs">
                          token: {invite.inviteToken}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[var(--ink-muted)]">No invites created yet.</p>
                  )}
                </div>
              </div>
            </Card>
          </>
        ) : (
          <AdminLoginForm />
        )}
      </div>
    </SiteShell>
  );
}
