import type { PropsWithChildren } from "react";

interface CardProps {
  className?: string;
}

export function Card({
  children,
  className = "",
}: PropsWithChildren<CardProps>) {
  return (
    <section
      className={[
        "rounded-[28px] border border-[var(--border)] bg-[var(--card)]/92 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.32)] backdrop-blur",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}
