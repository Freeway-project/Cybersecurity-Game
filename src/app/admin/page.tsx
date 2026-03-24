import { cookies } from "next/headers";

import { Card } from "@/components/ui/card";
import { SiteShell } from "@/components/layout/site-shell";
import { AdminConsole } from "@/modules/admin/components/admin-console";
import { AdminLoginForm } from "@/modules/admin/components/admin-login-form";
import { getAdminOverview, isAdminAuthenticated } from "@/modules/admin/server";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthenticated = await isAdminAuthenticated(cookieStore);
  let overview = null;
  let adminError: string | null = null;

  if (isAuthenticated) {
    try {
      overview = await getAdminOverview();
    } catch (error) {
      adminError =
        error instanceof Error
          ? error.message
          : "Admin data could not be loaded.";
    }
  }

  return (
    <SiteShell
      eyebrow="Pilot Operations"
      title="Study admin console"
      description="Funnel visibility and exports for the deployed pilot build."
    >
      <div className="space-y-6">
        {isAuthenticated ? (
          <>
            {adminError ? (
              <Card className="p-6">
                <div className="space-y-3">
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
                    Admin data
                  </p>
                  <h2 className="text-2xl font-semibold text-[var(--ink)]">
                    This page could not load admin data
                  </h2>
                  <p className="text-base leading-7 text-[var(--ink-muted)]">
                    {adminError}
                  </p>
                </div>
              </Card>
            ) : (
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
              </>
            )}
          </>
        ) : (
          <AdminLoginForm />
        )}
      </div>
    </SiteShell>
  );
}
