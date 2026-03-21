import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] px-5 py-8 sm:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-[36px] border border-[var(--border)] bg-[var(--card)]/92 p-8 shadow-[0_28px_90px_rgba(0,0,0,0.18)] backdrop-blur">
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
          <div className="mt-6">
            <Link
              href="/start"
              className="inline-flex items-center justify-center rounded-full bg-[var(--accent-strong)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(25,64,128,0.22)] transition hover:bg-[var(--accent)]"
            >
              Start mission
            </Link>
          </div>
        </div>
        <div className="rounded-[30px] border border-[var(--border)] bg-[var(--card-soft)] p-6">
          <h2 className="text-xl font-semibold text-[var(--ink)]">Current build scope</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "Token-gated participant entry",
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
      </div>
    </div>
  );
}
