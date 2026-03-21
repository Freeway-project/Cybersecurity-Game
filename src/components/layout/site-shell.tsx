import type { PropsWithChildren, ReactNode } from "react";

interface SiteShellProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
  compact?: boolean;
}

export function SiteShell({
  aside,
  children,
  compact = false,
  description,
  eyebrow,
  title,
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
          {aside ? <div className="mt-6">{aside}</div> : null}
        </header>
        <main className={["mx-auto w-full flex-1", compact ? "max-w-[92rem]" : "max-w-5xl"].join(" ")}>
          {children}
        </main>
      </div>
    </div>
  );
}
