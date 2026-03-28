"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { blockCipherLevel } from "@/modules/game/content";
import { evaluateBlockSequence } from "@/modules/game/logic";
import { calculateLevelScore } from "@/modules/game/scoring";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import type { LevelComponentProps } from "@/modules/game/types";

interface Props extends LevelComponentProps {
  onStatusChange: (line: string, tone: "info" | "error" | "success") => void;
  onUnlockCodex: (id: "block-cipher") => void;
  onBurst: () => void;
  attempts: number;
  onAttempt: (n: number) => void;
  hintsUsed: number;
  startTime: number;
}

function buildEmptySlots(length: number) {
  return Array.from({ length }, () => "");
}

const blockIcons: Record<string, React.FC<{ size?: number; color?: string }>> = {
  plaintext: ({ size = 18, color = "#d4a843" }) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="4" y="3" width="20" height="22" rx="2" stroke={color} strokeWidth="1.8" />
      <line x1="8" y1="9" x2="20" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="13" x2="18" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="17" x2="16" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  iv: ({ size = 18, color = "#d4a843" }) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="9" stroke={color} strokeWidth="1.8" strokeDasharray="3 2" />
      <circle cx="14" cy="14" r="4" fill={color} opacity="0.35" />
      <path d="M14 5V2M14 26V23M5 14H2M26 14H23" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  key: ({ size = 18, color = "#d4a843" }) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="10" cy="12" r="5" stroke={color} strokeWidth="1.8" />
      <line x1="15" y1="12" x2="25" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="22" y1="12" x2="22" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19" y1="12" x2="19" y2="15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  encrypt: ({ size = 18, color = "#d4a843" }) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="6" y="6" width="16" height="16" rx="3" stroke={color} strokeWidth="1.8" />
      <path d="M11 14L13 16L17 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="4" r="2" fill={color} opacity="0.45" />
      <circle cx="14" cy="24" r="2" fill={color} opacity="0.45" />
    </svg>
  ),
  ciphertext: ({ size = 18, color = "#d4a843" }) => (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="3" y="6" width="22" height="16" rx="2" stroke={color} strokeWidth="1.8" />
      <path d="M7 12L10 15L7 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="13" y1="18" x2="21" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="13" y="10" width="4" height="4" rx="1" fill={color} opacity="0.35" />
    </svg>
  ),
};

const stationTypes = ["hopper", "mixer", "lock", "processor", "tank"] as const;

function BlockStationShape({ type, active, index }: { type: typeof stationTypes[number]; active: "empty" | "selected" | "placed"; index: number }) {
  const stroke = active === "placed" ? "#4ade80" : active === "selected" ? "#f2c96a" : "#1a2840";
  const fill = active === "placed" ? "#0f1c18" : active === "selected" ? "#10192a" : "#09111c";
  if (type === "hopper") return <svg viewBox="0 0 80 70" className="h-14 w-18" fill="none"><path d="M15 12 H65 L54 32 L48 56 H32 L26 32 Z" stroke={stroke} strokeWidth="2" fill={fill} /><text x="40" y="39" textAnchor="middle" fill={stroke} fontSize="10" fontFamily="IBM Plex Mono, monospace">{index + 1}</text></svg>;
  if (type === "mixer") return <svg viewBox="0 0 80 70" className="h-14 w-18" fill="none"><ellipse cx="40" cy="16" rx="22" ry="7" stroke={stroke} strokeWidth="2" fill={fill} /><path d="M18 16 V50 C18 55 28 59 40 59 C52 59 62 55 62 50 V16" stroke={stroke} strokeWidth="2" fill={fill} /><text x="40" y="42" textAnchor="middle" fill={stroke} fontSize="10" fontFamily="IBM Plex Mono, monospace">{index + 1}</text></svg>;
  if (type === "lock") return <svg viewBox="0 0 80 70" className="h-14 w-18" fill="none"><rect x="18" y="22" width="44" height="36" rx="5" stroke={stroke} strokeWidth="2" fill={fill} /><path d="M30 22 V14 C30 8 34 5 40 5 C46 5 50 8 50 14 V22" stroke={stroke} strokeWidth="2" /><circle cx="40" cy="38" r="4" stroke={stroke} strokeWidth="1.5" fill="none" /><line x1="40" y1="42" x2="40" y2="48" stroke={stroke} strokeWidth="1.5" /></svg>;
  if (type === "processor") return <svg viewBox="0 0 80 70" className="h-14 w-18" fill="none"><rect x="18" y="14" width="44" height="42" rx="5" stroke={stroke} strokeWidth="2" fill={fill} /><path d="M36 22 L32 35 H38 L34 48" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M44 22 L40 35 H46 L42 48" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
  return <svg viewBox="0 0 80 70" className="h-14 w-18" fill="none"><rect x="18" y="8" width="44" height="44" rx="5" stroke={stroke} strokeWidth="2" fill={fill} /><line x1="18" y1="18" x2="62" y2="18" stroke={stroke} strokeWidth="1.5" opacity="0.5" /><rect x="24" y="24" width="32" height="4" rx="1" fill={stroke} opacity="0.25" /><rect x="24" y="32" width="32" height="4" rx="1" fill={stroke} opacity="0.35" /></svg>;
}

export function BlockCipherLevel({
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
  const [blockSelection, setBlockSelection] = useState<string[]>(buildEmptySlots(blockCipherLevel.slotLabels.length));
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  function handleInventorySelect(choiceId: string) {
    if (blockSelection.includes(choiceId)) return;
    setSelectedChoice((p) => (p === choiceId ? null : choiceId));
  }

  function handleSlotClick(index: number) {
    if (selectedChoice) {
      setBlockSelection((prev) => {
        const next = [...prev];
        const existingIndex = next.indexOf(selectedChoice);
        if (existingIndex !== -1) next[existingIndex] = "";
        next[index] = selectedChoice;
        return next;
      });
      setSelectedChoice(null);
      return;
    }
    const current = blockSelection[index];
    if (!current) return;
    setBlockSelection((prev) => {
      const next = [...prev];
      next[index] = "";
      return next;
    });
    setSelectedChoice(current);
  }

  function handleSlotDrop(index: number, choiceId: string) {
    setBlockSelection((prev) => {
      const next = [...prev];
      const existingIndex = next.indexOf(choiceId);
      if (existingIndex !== -1) next[existingIndex] = "";
      next[index] = choiceId;
      return next;
    });
    setSelectedChoice(null);
  }

  function handleSkip() {
    setBlockSelection(blockCipherLevel.correctSequence);
    setCompleted(true);
    onUnlockCodex("block-cipher");
    onStatusChange("// TRANSMISSION BYPASSED -- SIGNAL LOG UPDATED", "info");
    void sendStudyEvent({ participantId, sessionId, eventName: "level_skipped", levelId: "block-cipher", taskId: "role-sequence", attemptNo: attempts, durationMs: Date.now() - startTime });
    const { score } = calculateLevelScore({ levelId: "block-cipher", attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true });
    onComplete({ levelId: "block-cipher", flag: blockCipherLevel.flag, score, attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true });
  }

  function handleSubmit() {
    const attemptNo = attempts + 1;
    onAttempt(attemptNo);
    const evaluation = evaluateBlockSequence(blockSelection);
    void sendStudyEvent({ participantId, sessionId, eventName: "attempt_submitted", levelId: "block-cipher", taskId: "role-sequence", attemptNo, result: evaluation.correct ? "correct-sequence" : "wrong-sequence" });

    if (!evaluation.correct) {
      setFeedback(evaluation.feedback);
      onStatusChange("// SIGNAL DEGRADED -- ADJUST PARAMETERS", "error");
      onBreach();
      void sendStudyEvent({ participantId, sessionId, eventName: "attempt_failed", levelId: "block-cipher", taskId: "role-sequence", attemptNo, result: "wrong-sequence" });
      return;
    }

    const durationMs = Date.now() - startTime;
    const { score } = calculateLevelScore({ levelId: "block-cipher", attempts: attemptNo, hintsUsed, durationMs, skipped: false });
    setFeedback([]);
    setCompleted(true);
    onBurst();
    onUnlockCodex("block-cipher");
    onStatusChange("// CHANNEL CONFIGURED -- ENCRYPTION ACTIVE", "success");
    void sendStudyEvent({ participantId, sessionId, eventName: "level_completed", levelId: "block-cipher", taskId: "role-sequence", attemptNo, durationMs, result: "completed" });
    onComplete({ levelId: "block-cipher", flag: blockCipherLevel.flag, score, attempts: attemptNo, hintsUsed, durationMs, skipped: false });
  }

  if (completed) {
    return (
      <div className="space-y-4">
        <div className="terminal-panel relative overflow-hidden">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#4ade80]">// CHANNEL CONFIGURED -- ENCRYPTION ACTIVE</p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[#5a6a7a]">// CONTENT: CLASSIFIED FRAGMENT 3/6</p>
          <div className="mt-5 space-y-2 font-mono text-sm leading-7 text-[#d4a843]">
            <p>// SECURE CHANNEL ESTABLISHED</p>
            <p>// ADVERSARY INTERCEPT: BLOCKED</p>
            <p>// LOGGING TO SIGNAL LOG...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="terminal-panel">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">// SECURE CHANNEL -- CONFIGURATION REQUIRED</p>
        <div className="mt-3 space-y-1 font-mono text-sm leading-7 text-[#c3a257]">
          <p>// ADVERSARY TRANSMISSION: INCOMING</p>
          <p>// OUR RESPONSE WINDOW: CLOSING</p>
          <p>// CONFIGURE OUTBOUND ENCRYPTION PIPELINE</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="terminal-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">// COMPONENT INVENTORY</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {["encrypt", "key", "ciphertext", "iv", "plaintext"].map((choiceId) => {
              const choice = blockCipherLevel.choices.find((c) => c.id === choiceId);
              if (!choice) return null;
              const used = blockSelection.includes(choice.id);
              const sel = selectedChoice === choice.id;
              const Icon = blockIcons[choice.id];
              const iconColor = used ? "#5a6a7a" : sel ? "#f2c96a" : "#d4a843";
              return (
                <button key={choice.id} type="button" draggable={!used} disabled={used}
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", choice.id); e.dataTransfer.effectAllowed = "move"; }}
                  onClick={() => handleInventorySelect(choice.id)}
                  className={["rounded border px-4 py-4 text-left transition", used ? "cursor-not-allowed border-[#1a2840] bg-[#09111c] opacity-40" : sel ? "border-[#d4a843] bg-[#182338]" : "border-[#1a2840] bg-[#0d1625] hover:border-[#d4a843]"].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded border border-[#1a2840] bg-[#09111c]">{Icon && <Icon color={iconColor} />}</div>
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d4a843]">{choice.label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="terminal-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">// PIPELINE CONFIGURATION</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {blockCipherLevel.slotLabels.map((slotLabel, index) => {
              const currentChoiceId = blockSelection[index];
              const currentChoice = currentChoiceId ? blockCipherLevel.choices.find((c) => c.id === currentChoiceId) ?? null : null;
              const Icon = currentChoiceId ? blockIcons[currentChoiceId] : null;
              return (
                <div key={slotLabel}
                  className={["rounded border bg-[#09111c] px-3 py-3 transition", currentChoice ? "border-[#4ade80]" : selectedChoice ? "border-dashed border-[#d4a843]" : "border-[#1a2840]"].join(" ")}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                  onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) handleSlotDrop(index, id); }}
                >
                  <p className="text-center font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#5a6a7a]">{`// ${slotLabel}`}</p>
                  <div className="mt-3 flex justify-center">
                    <BlockStationShape type={stationTypes[index]} active={currentChoice ? "placed" : selectedChoice ? "selected" : "empty"} index={index} />
                  </div>
                  <button type="button" onClick={() => handleSlotClick(index)}
                    className={["mt-3 flex min-h-16 w-full items-center justify-center rounded border border-dashed px-3 py-3 text-center transition", currentChoice ? "border-[#4ade80] bg-[#0f1c18] text-[#4ade80]" : selectedChoice ? "border-[#d4a843] bg-[#10192a] text-[#d4a843]" : "border-[#1a2840] bg-[#0d1625] text-[#5a6a7a]"].join(" ")}
                  >
                    {currentChoice && Icon ? (
                      <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em]"><Icon size={16} color="#4ade80" />{currentChoice.label}</span>
                    ) : selectedChoice ? (
                      <span className="font-mono text-xs uppercase tracking-[0.14em]">[ PLACE COMPONENT ]</span>
                    ) : (
                      <span className="font-mono text-xs uppercase tracking-[0.14em]">[ EMPTY SLOT ]</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {feedback.length > 0 && (
        <div className="terminal-panel border-[#3b2311] bg-[#140c08]">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#d4a843]">// PIPELINE DIAGNOSTIC</p>
          <div className="mt-4 space-y-2 font-mono text-sm leading-7 text-[#e8b66c]">
            {feedback.map((msg) => <p key={msg}>{`> ERROR: ${msg}`}</p>)}
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3">
        {attempts >= 3 && (
          <Button variant="secondary" onClick={handleSkip} className="rounded border border-[#624616] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] hover:bg-[#2a1c08]">// BYPASS CHARLIE</Button>
        )}
        <Button onClick={handleSubmit} className="rounded border border-[#1a2840] bg-[#162134] font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] shadow-none hover:bg-[#1d2a43]">// COMMIT CONFIGURATION</Button>
      </div>
    </div>
  );
}
