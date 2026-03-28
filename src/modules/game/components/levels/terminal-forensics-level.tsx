"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { terminalForensicsLevel } from "@/modules/game/content";
import type { ForensicsObjective } from "@/modules/game/content";
import { calculateLevelScore } from "@/modules/game/scoring";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import type { LevelComponentProps } from "@/modules/game/types";
import { TerminalEmulator } from "@/modules/game/components/ui/terminal-emulator";

interface Props extends LevelComponentProps {
  onStatusChange: (line: string, tone: "info" | "error" | "success") => void;
  onUnlockCodex: (id: "terminal-forensics") => void;
  onBurst: () => void;
  attempts: number;
  onAttempt: (n: number) => void;
  hintsUsed: number;
  startTime: number;
}

// Normalise an answer: trim, lowercase, remove punctuation
function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9.\-_]/g, "");
}

function answerMatches(input: string, objective: ForensicsObjective): boolean {
  return normalise(input) === normalise(objective.answer);
}

export function TerminalForensicsLevel({
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
  const [solvedObjectives, setSolvedObjectives] = useState<Set<string>>(new Set());
  const [objInputs, setObjInputs] = useState<Record<string, string>>({});
  const [objFeedback, setObjFeedback] = useState<Record<string, "correct" | "wrong" | null>>({});
  const [completed, setCompleted] = useState(false);

  function handleCommand(cmd: string, args: string[]) {
    void sendStudyEvent({
      participantId, sessionId, eventName: "terminal_command_executed",
      levelId: "terminal-forensics", taskId: "forensic-investigation",
      metadata: { cmd, args: args.join(" ") },
    });
  }

  function submitObjective(obj: ForensicsObjective) {
    if (solvedObjectives.has(obj.id)) return;
    const input = objInputs[obj.id] ?? "";
    if (!input.trim()) return;

    const attemptNo = attempts + 1;
    onAttempt(attemptNo);
    const correct = answerMatches(input, obj);

    void sendStudyEvent({
      participantId, sessionId,
      eventName: correct ? "attempt_succeeded" : "attempt_failed",
      levelId: "terminal-forensics", taskId: "forensic-investigation",
      attemptNo,
      metadata: { objectiveId: obj.id, answer: input, expected: obj.answer },
    });

    setObjFeedback((prev) => ({ ...prev, [obj.id]: correct ? "correct" : "wrong" }));
    window.setTimeout(() => {
      setObjFeedback((prev) => ({ ...prev, [obj.id]: null }));
    }, 1200);

    if (correct) {
      const nextSolved = new Set(solvedObjectives);
      nextSolved.add(obj.id);
      setSolvedObjectives(nextSolved);
      onStatusChange(`// OBJECTIVE ${nextSolved.size}/${terminalForensicsLevel.objectives.length} CONFIRMED`, "info");

      if (nextSolved.size === terminalForensicsLevel.objectives.length) {
        // All done
        const durationMs = Date.now() - startTime;
        const { score } = calculateLevelScore({ levelId: "terminal-forensics", attempts: attemptNo, hintsUsed, durationMs, skipped: false });
        void sendStudyEvent({ participantId, sessionId, eventName: "level_completed", levelId: "terminal-forensics", taskId: "forensic-investigation", attemptNo, durationMs, result: "completed" });
        setTimeout(() => {
          setCompleted(true);
          onBurst();
          onUnlockCodex("terminal-forensics");
          onStatusChange("// BREACH FULLY INVESTIGATED -- FOXTROT FRAGMENT LOGGED", "success");
          onComplete({ levelId: "terminal-forensics", flag: terminalForensicsLevel.flag, score, attempts: attemptNo, hintsUsed, durationMs, skipped: false });
        }, 1200);
      }
    } else {
      onBreach();
      onStatusChange("// INVESTIGATION ERROR -- RECHECK YOUR FINDINGS", "error");
    }
  }

  function handleSkip() {
    setCompleted(true);
    onUnlockCodex("terminal-forensics");
    onStatusChange("// TRANSMISSION BYPASSED -- SIGNAL LOG UPDATED", "info");
    void sendStudyEvent({ participantId, sessionId, eventName: "level_skipped", levelId: "terminal-forensics", taskId: "forensic-investigation", attemptNo: attempts, durationMs: Date.now() - startTime });
    const { score } = calculateLevelScore({ levelId: "terminal-forensics", attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true });
    onComplete({ levelId: "terminal-forensics", flag: terminalForensicsLevel.flag, score, attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true });
  }

  // ── Completed screen ────────────────────────────────────────────────────────
  if (completed) {
    return (
      <div className="space-y-4">
        <div className="terminal-panel relative overflow-hidden">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#4ade80]">// BREACH INVESTIGATION COMPLETE</p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[#5a6a7a]">// CONTENT: CLASSIFIED FRAGMENT 6/6</p>
          <div className="mt-5 space-y-2 font-mono text-sm leading-7 text-[#d4a843]">
            <p>// ATTACKER IP: 192.168.99.201</p>
            <p>// ROGUE ACCOUNT: ghost-user — DISABLED</p>
            <p>// EXFILTRATED FILE: exfil-package.zip — TRACED</p>
            <p>// OPERATION SIGNAL GHOST: COMPLETE</p>
            <p>// LOGGING TO SIGNAL LOG...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Active game ─────────────────────────────────────────────────────────────
  const progressCount = solvedObjectives.size;
  const totalCount    = terminalForensicsLevel.objectives.length;

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="terminal-panel">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">// FORENSIC TERMINAL -- BREACH INVESTIGATION</p>
          <span className="font-mono text-xs text-[#d4a843]">
            {progressCount}/{totalCount} OBJECTIVES
          </span>
        </div>
        <p className="mt-2 font-mono text-sm leading-7 text-[#c3a257]">
          // Investigate the breach using the terminal. Answer the objectives below based on what you find.
        </p>
      </div>

      {/* Terminal */}
      <TerminalEmulator
        filesystem={terminalForensicsLevel.filesystem}
        onCommand={handleCommand}
      />

      {/* Objectives panel */}
      <div className="terminal-panel space-y-4">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[#5a6a7a]">// INVESTIGATION OBJECTIVES</p>

        {terminalForensicsLevel.objectives.map((obj, idx) => {
          const solved   = solvedObjectives.has(obj.id);
          const input    = objInputs[obj.id] ?? "";
          const feedback = objFeedback[obj.id];

          return (
            <div
              key={obj.id}
              className={[
                "rounded border px-4 py-4 space-y-3 transition-colors",
                solved
                  ? "border-[#4ade80]/30 bg-[#081a10]"
                  : feedback === "wrong"
                  ? "border-[#ef4444]/40 bg-[#1a0808]"
                  : "border-[#1a2840] bg-[#09111c]",
              ].join(" ")}
            >
              <div className="flex items-start gap-3">
                <span className={[
                  "mt-0.5 shrink-0 font-mono text-xs font-bold",
                  solved ? "text-[#4ade80]" : "text-[#5a6a7a]",
                ].join(" ")}>
                  {solved ? "✓" : `[${idx + 1}]`}
                </span>
                <p className={[
                  "font-mono text-xs leading-6",
                  solved ? "text-[#4ade80]" : "text-[#c3a257]",
                ].join(" ")}>
                  {obj.prompt}
                </p>
              </div>

              {solved ? (
                <p className="font-mono text-xs text-[#4ade80]/70">
                  ✓ Confirmed: {obj.answer}
                </p>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setObjInputs((prev) => ({ ...prev, [obj.id]: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === "Enter") submitObjective(obj); }}
                    placeholder="Your answer..."
                    spellCheck={false}
                    autoComplete="off"
                    className={[
                      "flex-1 rounded border bg-[#060d18] px-3 py-2 font-mono text-xs outline-none transition",
                      feedback === "wrong"
                        ? "border-[#ef4444]/60 text-[#ef4444] placeholder:text-[#4a1010]"
                        : "border-[#1a2840] text-[#d4a843] placeholder:text-[#2a3a4a] focus:border-[#d4a843]/50",
                    ].join(" ")}
                  />
                  <Button
                    onClick={() => submitObjective(obj)}
                    className="rounded border border-[#1a2840] bg-[#162134] font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] shadow-none hover:bg-[#1d2a43]"
                  >
                    CHECK
                  </Button>
                </div>
              )}

              {feedback === "wrong" && (
                <div className="space-y-1">
                  <p className="font-mono text-[0.65rem] text-[#ef4444]">
                    Incorrect — try again.
                  </p>
                  <p className="font-mono text-[0.65rem] text-[#c3a257]">
                    Hint: {obj.hint}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bypass */}
      {attempts >= 3 && (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={handleSkip}
            className="rounded border border-[#624616] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] hover:bg-[#2a1c08]"
          >
            Skip this level
          </Button>
        </div>
      )}
    </div>
  );
}
