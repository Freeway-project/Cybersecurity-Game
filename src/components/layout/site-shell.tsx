import type { PropsWithChildren, ReactNode } from "react";

interface SiteShellProps {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}

export function SiteShell({
  aside,
  children,
  description,
  eyebrow,
  title,
}: PropsWithChildren<SiteShellProps>) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--canvas)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(241,180,88,0.28),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(73,117,201,0.22),_transparent_28%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-5 py-8 sm:px-8 lg:flex-row lg:items-start lg:py-12">
        <header className="max-w-xl lg:sticky lg:top-10 lg:w-[25rem]">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--accent-strong)]">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--ink)] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-[var(--ink-muted)]">
            {description}
          </p>
          {aside ? <div className="mt-8">{aside}</div> : null}
        </header>
        <main className="w-full flex-1">{children}</main>
      </div>
    </div>
  );
}
