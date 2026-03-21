import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent-strong)] text-white shadow-[0_14px_30px_rgba(25,64,128,0.22)] hover:bg-[var(--accent)]",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--card-strong)] text-[var(--ink)] hover:bg-[var(--card-soft)]",
  ghost: "bg-transparent text-[var(--ink-muted)] hover:bg-[var(--card-soft)]",
};

export function Button({
  children,
  className = "",
  fullWidth = false,
  type = "button",
  variant = "primary",
  ...props
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition",
        "disabled:cursor-not-allowed disabled:opacity-50",
        fullWidth ? "w-full" : "",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}
