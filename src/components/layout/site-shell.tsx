import type { PropsWithChildren, ReactNode } from "react";

interface ProgressStep {
  label: string;
  key: string;
}

interface SiteShellProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
  compact?: boolean;
  progressSteps?: ProgressStep[];
  progressCurrent?: number;
}

export function SiteShell({
  aside,
  children,
  compact = false,
  description,
  eyebrow,
  title,
  progressSteps,
  progressCurrent = 0,
}: PropsWithChildren<SiteShellProps>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--canvas)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(78,155,255,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(45,127,249,0.14),_transparent_28%)]" />
      <div
        className={[
          "relative mx-auto flex min-h-screen w-full max-w-[92rem] flex-col px-4 sm:px-6",
          compact ? "gap-4 py-4 sm:py-5" : "gap-6 py-6 sm:py-8",
        ].join(" ")}
      >
        <header className={["mx-auto w-full text-center", compact ? "max-w-6xl" : "max-w-4xl"].join(" ")}>
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--accent-strong)]">
            {eyebrow}
          </p>
          <h1
            className={[
              "font-semibold tracking-tight text-[var(--ink)]",
              compact ? "mt-2 text-2xl sm:text-3xl" : "mt-4 text-3xl sm:text-4xl",
            ].join(" ")}
          >
            {title}
          </h1>
          <p
            className={[
              "mx-auto max-w-2xl text-[var(--ink-muted)]",
              compact ? "mt-2 text-sm leading-6 lg:max-w-3xl" : "mt-4 text-sm leading-7 sm:text-base",
            ].join(" ")}
          >
            {description}
          </p>
          {progressSteps && progressSteps.length > 0 ? (
            <nav aria-label="Study progress" className="mt-5 flex items-center justify-center gap-0">
              {progressSteps.map((step, i) => {
                const isCompleted = i < progressCurrent;
                const isCurrent = i === progressCurrent;
                return (
                  <div key={step.key} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={[
                          "flex items-center justify-center rounded-full transition-all duration-300",
                          isCurrent
                            ? "h-3.5 w-3.5 bg-[var(--accent)] shadow-[0_0_10px_rgba(45,127,249,0.5)]"
                            : isCompleted
                              ? "h-2.5 w-2.5 bg-[var(--accent-strong)]"
                              : "h-2.5 w-2.5 border border-[var(--border-strong)] bg-transparent",
                        ].join(" ")}
                      />
                      <span
                        className={[
                          "mt-1.5 hidden text-[0.6rem] uppercase tracking-wider md:block",
                          isCurrent
                            ? "font-bold text-[var(--accent-strong)]"
                            : isCompleted
                              ? "text-[var(--ink-muted)]"
                              : "text-[var(--ink-muted)]/50",
                        ].join(" ")}
                      >
                        {step.label}
                      </span>
                    </div>
                    {i < progressSteps.length - 1 ? (
                      <div
                        className={[
                          "mx-1 h-[2px] w-6 rounded-full transition-colors duration-300 sm:w-10",
                          i < progressCurrent
                            ? "bg-[var(--accent-strong)]"
                            : "bg-[var(--border-strong)]",
                        ].join(" ")}
                      />
                    ) : null}
                  </div>
                );
              })}
            </nav>
          ) : null}
          {aside ? <div className="mt-6">{aside}</div> : null}
        </header>
        <main className={["mx-auto w-full flex-1", compact ? "max-w-[92rem]" : "max-w-5xl"].join(" ")}>
          {children}
        </main>
      </div>
    </div>
  );
}
