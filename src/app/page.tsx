export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 rounded-[36px] border border-[var(--border)] bg-[var(--card)]/92 p-8 shadow-[0_28px_90px_rgba(0,0,0,0.18)] backdrop-blur">
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--accent-strong)]">
            Cryptography Learning Pilot
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-6xl">
            A short browser-based cryptography mission for pilot study use.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--ink-muted)]">
            This build is designed to be quick, simple, and usable on desktop or mobile.
            Participants move through consent, a short pre-test, three small cryptography
            levels, a post-test, and an optional survey.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--card-soft)] p-6">
            <h2 className="text-xl font-semibold text-[var(--ink)]">Current build scope</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Quick participant entry",
                "Consent and session setup",
                "3-item pre-test",
                "3 gameplay levels",
                "3-item post-test",
                "Optional survey and finish step",
                "Event logging",
                "Admin export tools",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3 text-sm font-medium text-[var(--ink)]"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[30px] border border-[var(--border)] bg-[var(--card-soft)] p-6">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
              Flow
            </p>
            <div className="mt-5 space-y-3">
              {[
                "Consent",
                "Pre-test",
                "Gameplay",
                "Post-test",
                "Optional survey",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3 text-sm font-medium text-[var(--ink)]"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/18 text-[var(--accent-strong)]">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
