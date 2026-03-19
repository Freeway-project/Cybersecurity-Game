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
        "rounded-[28px] border border-white/60 bg-white/86 p-6 shadow-[0_24px_80px_rgba(28,40,82,0.12)] backdrop-blur",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </section>
  );
}
