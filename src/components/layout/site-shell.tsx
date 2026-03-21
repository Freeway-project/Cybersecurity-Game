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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(78,155,255,0.18),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(45,127,249,0.14),_transparent_28%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <header className="mx-auto w-full max-w-4xl text-center">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--accent-strong)]">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 mx-auto max-w-2xl text-sm leading-7 text-[var(--ink-muted)] sm:text-base">
            {description}
          </p>
          {aside ? <div className="mt-6">{aside}</div> : null}
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1">{children}</main>
      </div>
    </div>
  );
}
