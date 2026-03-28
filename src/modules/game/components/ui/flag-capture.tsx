"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  flag: string;
  levelTitle: string;
  score: number;
  active: boolean;
  onDone?: () => void;
}

const GLITCH_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

function useGlitchReveal(text: string, active: boolean, durationMs = 900) {
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (!active) {
      setDisplay(text);
      return;
    }

    let frame = 0;
    const totalFrames = Math.round(durationMs / 40);

    const interval = window.setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const revealedCount = Math.floor(progress * text.length);

      setDisplay(
        text
          .split("")
          .map((char, i) => {
            if (char === " " || char === "{" || char === "}" || char === "_") return char;
            if (i < revealedCount) return char;
            return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)] ?? char;
          })
          .join(""),
      );

      if (frame >= totalFrames) {
        window.clearInterval(interval);
        setDisplay(text);
      }
    }, 40);

    return () => window.clearInterval(interval);
  }, [active, text, durationMs]);

  return display;
}

export function FlagCapture({ flag, levelTitle, score, active, onDone }: Props) {
  const [visible, setVisible] = useState(false);
  const glitchedFlag = useGlitchReveal(flag, visible);

  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; });

  useEffect(() => {
    if (!active) return;
    setVisible(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDoneRef.current?.();
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#06080f]/80" />

      {/* Banner */}
      <div
        className="relative mx-4 max-w-lg rounded border border-[#4ade80]/50 bg-[#06080f] px-8 py-8 text-center shadow-[0_0_60px_rgba(74,222,128,0.15)]"
        style={{ animation: "flag-banner-in 0.3s ease-out forwards" }}
      >
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.3em] text-[#4ade80]/60">
          // FLAG CAPTURED
        </p>
        <p className="mt-2 font-mono text-sm uppercase tracking-[0.2em] text-[#5a6a7a]">
          {levelTitle}
        </p>
        <p
          className="mt-4 font-mono text-lg font-bold tracking-[0.1em] text-[#4ade80]"
          style={{ textShadow: "0 0 20px rgba(74,222,128,0.6)" }}
        >
          {glitchedFlag}
        </p>
        <p className="mt-4 font-mono text-xs text-[#d4a843]">
          +{score.toLocaleString()} POINTS
        </p>
      </div>
    </div>
  );
}
