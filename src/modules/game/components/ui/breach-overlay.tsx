"use client";

import { useEffect, useState } from "react";

interface Props {
  active: boolean;
  onDone?: () => void;
}

export function BreachOverlay({ active, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) return;
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [active, onDone]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      aria-hidden="true"
    >
      {/* Red flash backdrop */}
      <div className="absolute inset-0 animate-breach-flash bg-[#ef4444]/10" />

      {/* Red border vignette */}
      <div
        className="absolute inset-0"
        style={{
          boxShadow: "inset 0 0 80px 20px rgba(239, 68, 68, 0.25)",
        }}
      />

      {/* Breach text */}
      <div className="relative select-none text-center">
        <p
          className="font-mono text-2xl font-bold uppercase tracking-[0.3em] text-[#ef4444]"
          style={{ textShadow: "0 0 20px rgba(239,68,68,0.8)" }}
        >
          // BREACH DETECTED
        </p>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[#ef4444]/60">
          // SECURITY EVENT LOGGED
        </p>
      </div>
    </div>
  );
}
