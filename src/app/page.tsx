export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 rounded-[36px] border border-white/50 bg-white/72 p-8 shadow-[0_28px_90px_rgba(28,40,82,0.14)] backdrop-blur">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--accent-strong)]">
            Cryptography Learning Pilot
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-6xl">
            Modular study shell first, gameplay later.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--ink-muted)]">
            This build prioritizes the research pipeline: invite token resolution, consent,
            pre and post assessment, survey capture, event logging, and admin export.
            The three puzzle levels stay deferred until you review the infrastructure.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--card)]/70 p-6">
            <h2 className="text-xl font-semibold text-[var(--ink)]">Current build scope</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Token-gated participant entry",
                "Consent and session creation",
                "3-item pre-test",
                "Reserved gameplay transition slot",
                "3-item post-test",
                "Survey and thank-you flow",
                "Event ingestion API",
                "Admin invite and export console",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-[var(--ink-muted)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[30px] border border-[var(--border)] bg-[#16325b] p-6 text-white">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#d7e6ff]">
              Routes
            </p>
            <div className="mt-5 space-y-3 text-sm">
              <a
                href="/start"
                className="block rounded-2xl bg-white/10 px-4 py-3 transition hover:bg-white/16"
              >
                Participant entry at <span className="font-mono">/start</span>
              </a>
              <a
                href="/admin"
                className="block rounded-2xl bg-white/10 px-4 py-3 transition hover:bg-white/16"
              >
                Admin console at <span className="font-mono">/admin</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
