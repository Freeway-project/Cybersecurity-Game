"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { caesarLevel } from "@/modules/game/content";
import { decryptCaesar } from "@/modules/game/logic";
import { calculateLevelScore } from "@/modules/game/scoring";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import type { LevelComponentProps } from "@/modules/game/types";

const alphaIntercepts = [
  { id: "alpha-primary", label: "ALPHA CHANNEL", receivedAt: "03:42:17 UTC", ciphertext: caesarLevel.ciphertext },
  { id: "alpha-aux-1", label: "AUXILIARY INTERCEPT 1", receivedAt: "03:42:54 UTC", ciphertext: "UHQGHCYRXV FRQILUPHG" },
  { id: "alpha-aux-2", label: "AUXILIARY INTERCEPT 2", receivedAt: "03:43:26 UTC", ciphertext: "FRQWDFW ZDLWLQJ HDVW" },
] as const;

interface Props extends LevelComponentProps {
  onStatusChange: (line: string, tone: "info" | "error" | "success") => void;
  onUnlockCodex: (id: "caesar-cipher") => void;
  onBurst: () => void;
  attempts: number;
  onAttempt: (n: number) => void;
  hintsUsed: number;
  startTime: number;
}

export function CaesarCipherLevel({
  participantId,
  sessionId,
  onComplete,
  onBreach,
  onStatusChange,
  onUnlockCodex,
  onBurst,
  attempts,
  onAttempt,
  hintsUsed,
  startTime,
}: Props) {
  const [shift, setShift] = useState(0);
  const [shiftChanges, setShiftChanges] = useState(0);
  const [completed, setCompleted] = useState(false);
  const lastInteractionRef = useRef(Date.now());

  const trafficPreview = useMemo(
    () => alphaIntercepts.map((intercept) => ({
      ...intercept,
      preview: decryptCaesar(intercept.ciphertext, shift),
    })),
    [shift],
  );

  function updateShift(nextShift: number) {
    if (nextShift === shift) return;
    lastInteractionRef.current = Date.now();
    setShift(nextShift);
    setShiftChanges((p) => p + 1);
    void sendStudyEvent({ participantId, sessionId, eventName: "shift_changed", levelId: "caesar-cipher", taskId: "shift-control", result: `shift-${nextShift}`, metadata: { shift: nextShift } });
  }

  function handleSkip() {
    setShift(caesarLevel.targetShift);
    setCompleted(true);
    onUnlockCodex("caesar-cipher");
    onStatusChange("// TRANSMISSION BYPASSED -- SIGNAL LOG UPDATED", "info");
    void sendStudyEvent({ participantId, sessionId, eventName: "level_skipped", levelId: "caesar-cipher", taskId: "shift-control", attemptNo: attempts, durationMs: Date.now() - startTime });
    const { score, hintPenalty, timeBonus } = calculateLevelScore({ levelId: "caesar-cipher", attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true });
    onComplete({ levelId: "caesar-cipher", flag: caesarLevel.flag, score, attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true, metadata: { hintPenalty, timeBonus } });
  }

  function handleSubmit() {
    lastInteractionRef.current = Date.now();
    const attemptNo = attempts + 1;
    onAttempt(attemptNo);
    void sendStudyEvent({ participantId, sessionId, eventName: "attempt_submitted", levelId: "caesar-cipher", taskId: "shift-control", attemptNo });

    if (shift !== caesarLevel.targetShift) {
      onStatusChange("// SIGNAL DEGRADED -- ADJUST PARAMETERS", "error");
      onBreach();
      void sendStudyEvent({ participantId, sessionId, eventName: "attempt_failed", levelId: "caesar-cipher", taskId: "shift-control", attemptNo, result: "wrong-shift" });
      return;
    }

    const durationMs = Date.now() - startTime;
    const { score, hintPenalty, timeBonus } = calculateLevelScore({ levelId: "caesar-cipher", attempts: attemptNo, hintsUsed, durationMs, skipped: false });
    setCompleted(true);
    onBurst();
    onUnlockCodex("caesar-cipher");
    onStatusChange("// TRANSMISSION DECRYPTED -- ALPHA FRAGMENT LOGGED", "success");
    void sendStudyEvent({ participantId, sessionId, eventName: "level_completed", levelId: "caesar-cipher", taskId: "shift-control", attemptNo, durationMs, result: "completed", metadata: { finalShift: shift, shiftChanges } });
    onComplete({ levelId: "caesar-cipher", flag: caesarLevel.flag, score, attempts: attemptNo, hintsUsed, durationMs, skipped: false, metadata: { hintPenalty, timeBonus, finalShift: shift } });
  }

  if (completed) {
    return (
      <div className="space-y-4">
        <div className="terminal-panel relative overflow-hidden">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#4ade80]">// TRANSMISSION DECRYPTED</p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[#5a6a7a]">// CONTENT: CLASSIFIED FRAGMENT 1/6</p>
          <pre className="mt-5 whitespace-pre-wrap font-mono text-lg leading-8 text-[#d4a843]">{caesarLevel.plaintext}</pre>
          <div className="mt-5 space-y-2 font-mono text-sm leading-7 text-[#4ade80]">
            <p>// COORDINATES EMBEDDED: 48.2082°N 16.3738°E</p>
            <p>// KEYWORD RECOVERED: RENDEZVOUS</p>
            <p>// LOGGING TO SIGNAL LOG...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="terminal-panel">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">// RAW INTERCEPT -- ALPHA CHANNEL</p>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-[#5a6a7a]">// RECEIVED: 03:42:17 UTC</p>
        <pre className="mt-4 whitespace-pre-wrap font-mono text-lg leading-8 text-[#d4a843]">{caesarLevel.ciphertext}</pre>
      </div>

      <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
        <div className="terminal-panel flex items-center justify-center">
          <FrequencyDial value={shift} onChange={updateShift} />
        </div>
        <div className="space-y-4">
          <div className="terminal-panel">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">{`// DECRYPT ATTEMPT [SHIFT: ${shift.toString().padStart(2, "0")}]`}</p>
            <pre className="mt-4 whitespace-pre-wrap font-mono text-lg leading-8 text-[#d4a843]">{trafficPreview[0]?.preview}</pre>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {trafficPreview.slice(1).map((intercept) => (
              <div key={intercept.id} className="terminal-panel">
                <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#5a6a7a]">{`// ${intercept.label}`}</p>
                <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[#5a6a7a]">{`// RECEIVED: ${intercept.receivedAt}`}</p>
                <pre className="mt-4 whitespace-pre-wrap font-mono text-base leading-7 text-[#c3a257]">{intercept.preview}</pre>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {attempts >= 3 && (
          <Button variant="secondary" onClick={handleSkip} className="rounded border border-[#624616] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] hover:bg-[#2a1c08]">
            // BYPASS ALPHA
          </Button>
        )}
        <Button onClick={handleSubmit} className="rounded border border-[#1a2840] bg-[#162134] font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] shadow-none hover:bg-[#1d2a43]">
          // VERIFY TRANSMISSION
        </Button>
      </div>
    </div>
  );
}

interface FrequencyDialProps {
  value: number;
  onChange: (nextValue: number) => void;
}

function FrequencyDial({ value, onChange }: FrequencyDialProps) {
  const dialRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);
  const center = 90;
  const radius = 60;
  const indicatorAngle = (value / 25) * 300 - 150;

  function polarToCartesian(angle: number, innerRadius: number, outerRadius: number) {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
      x1: center + innerRadius * Math.cos(radians),
      y1: center + innerRadius * Math.sin(radians),
      x2: center + outerRadius * Math.cos(radians),
      y2: center + outerRadius * Math.sin(radians),
    };
  }

  function updateFromPointer(clientX: number, clientY: number) {
    if (!dialRef.current) return;
    const bounds = dialRef.current.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    const rawAngle = (Math.atan2(y - center, x - center) * 180) / Math.PI + 90;
    const normalized = ((rawAngle + 540) % 360) - 180;
    const clamped = Math.min(150, Math.max(-150, normalized));
    onChange(Math.round(((clamped + 150) / 300) * 25));
  }

  const indicator = polarToCartesian(indicatorAngle, 12, 48);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        ref={dialRef}
        viewBox="0 0 180 180"
        className="h-[180px] w-[180px] touch-none"
        onPointerDown={(e) => { draggingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); updateFromPointer(e.clientX, e.clientY); }}
        onPointerMove={(e) => { if (!draggingRef.current) return; updateFromPointer(e.clientX, e.clientY); }}
        onPointerUp={(e) => { draggingRef.current = false; e.currentTarget.releasePointerCapture(e.pointerId); }}
        onPointerCancel={() => { draggingRef.current = false; }}
        role="slider"
        aria-label="Transmission frequency dial"
        aria-valuemin={0}
        aria-valuemax={25}
        aria-valuenow={value}
      >
        <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#1a2840" strokeWidth="4" />
        {Array.from({ length: 26 }, (_, i) => {
          const tick = polarToCartesian((i / 25) * 300 - 150, 54, 68);
          return <line key={i} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="#2a3a4a" strokeWidth={1.5} strokeLinecap="round" />;
        })}
        <line x1={indicator.x1} y1={indicator.y1} x2={indicator.x2} y2={indicator.y2} stroke="#d4a843" strokeWidth={4} strokeLinecap="round" />
        <circle cx={center} cy={center} r="18" fill="#10192a" stroke="#1a2840" strokeWidth="2" />
        <text x={center} y={84} textAnchor="middle" className="fill-[#5a6a7a] text-[8px]" style={{ fontFamily: "IBM Plex Mono, monospace" }}>FREQ</text>
        <text x={center} y={102} textAnchor="middle" className="fill-[#d4a843] text-[14px] font-medium" style={{ fontFamily: "IBM Plex Mono, monospace" }}>{value.toString().padStart(2, "0")}</text>
      </svg>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0} className="rounded border border-[#1a2840] bg-[#10192a] px-4 py-2 font-mono text-sm uppercase tracking-[0.18em] text-[#d4a843] transition hover:border-[#d4a843] hover:text-[#f2c96a] disabled:opacity-40">-</button>
        <button type="button" onClick={() => onChange(Math.min(25, value + 1))} disabled={value === 25} className="rounded border border-[#1a2840] bg-[#10192a] px-4 py-2 font-mono text-sm uppercase tracking-[0.18em] text-[#d4a843] transition hover:border-[#d4a843] hover:text-[#f2c96a] disabled:opacity-40">+</button>
      </div>
    </div>
  );
}
