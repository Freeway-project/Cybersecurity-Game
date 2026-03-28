"use client";

import { type Dispatch, type SetStateAction, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { xorLevel } from "@/modules/game/content";
import { xorBitStrings } from "@/modules/game/logic";
import { calculateLevelScore } from "@/modules/game/scoring";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import type { LevelComponentProps } from "@/modules/game/types";

interface Props extends LevelComponentProps {
  onStatusChange: (line: string, tone: "info" | "error" | "success") => void;
  onUnlockCodex: (id: "xor-stream") => void;
  onBurst: () => void;
  attempts: number;
  onAttempt: (n: number) => void;
  hintsUsed: number;
  startTime: number;
}

function buildBits(length: number) {
  return Array.from({ length }, () => "");
}

export function XorStreamLevel({
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
  const [ruleSelection, setRuleSelection] = useState(buildBits(xorLevel.rulePairs.length));
  const [ruleSolved, setRuleSolved] = useState(false);
  const [recoverySelection, setRecoverySelection] = useState(buildBits(xorLevel.recoveryCipherBits.length));
  const [ruleFeedback, setRuleFeedback] = useState<(string | null)[]>(Array.from({ length: xorLevel.rulePairs.length }, () => null));
  const [recoveryFeedback, setRecoveryFeedback] = useState<(string | null)[]>(Array.from({ length: xorLevel.recoveryCipherBits.length }, () => null));
  const [feedbackGen, setFeedbackGen] = useState(0);
  const [completed, setCompleted] = useState(false);
  const stepTwoRef = useRef<HTMLDivElement | null>(null);

  const xorExpected = xorBitStrings(xorLevel.recoveryCipherBits, xorLevel.recoveryKeyBits) ?? xorLevel.recoveryPlaintextBits;

  useEffect(() => {
    if (!ruleSolved) return;
    window.requestAnimationFrame(() => {
      stepTwoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [ruleSolved]);

  function chooseBit(index: number, value: string, setter: Dispatch<SetStateAction<string[]>>) {
    setter((prev) => prev.map((v, i) => (i === index ? value : v)));
  }

  function handleSkip() {
    setRuleSelection(xorLevel.rulePairs.map((p) => p.output));
    setRuleSolved(true);
    setRecoverySelection(xorExpected.split(""));
    setCompleted(true);
    onUnlockCodex("xor-stream");
    onStatusChange("// TRANSMISSION BYPASSED -- SIGNAL LOG UPDATED", "info");
    void sendStudyEvent({ participantId, sessionId, eventName: "level_skipped", levelId: "xor-stream", taskId: "signal-repair", attemptNo: attempts, durationMs: Date.now() - startTime });
    const { score } = calculateLevelScore({ levelId: "xor-stream", attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true });
    onComplete({ levelId: "xor-stream", flag: xorLevel.flag, score, attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true });
  }

  function submitRuleBoard() {
    const attemptNo = attempts + 1;
    onAttempt(attemptNo);
    const expectedRule = xorLevel.rulePairs.map((p) => p.output).join("");

    if (ruleSelection.some((v) => v === "")) {
      onStatusChange("// SIGNAL DEGRADED -- COMPLETE ALL OUTPUT CHANNELS", "error");
      onBreach();
      void sendStudyEvent({ participantId, sessionId, eventName: "attempt_failed", levelId: "xor-stream", taskId: "signal-repair", attemptNo, result: "rule-incomplete" });
      return;
    }

    const correct = ruleSelection.join("") === expectedRule;
    const feedback = ruleSelection.map((s, i) => (s === xorLevel.rulePairs[i]?.output ? "correct" : "wrong"));
    setRuleFeedback(feedback);
    setFeedbackGen((p) => p + 1);
    window.setTimeout(() => { setRuleFeedback(Array.from({ length: xorLevel.rulePairs.length }, () => null)); }, 1500);

    void sendStudyEvent({ participantId, sessionId, eventName: correct ? "attempt_succeeded" : "attempt_failed", levelId: "xor-stream", taskId: "signal-repair", attemptNo, result: correct ? "rule-correct" : "rule-wrong" });

    if (!correct) {
      onStatusChange("// SIGNAL DEGRADED -- RECALIBRATE THE XOR RULE", "error");
      onBreach();
      return;
    }

    setRuleSolved(true);
    onStatusChange("// CALIBRATION APPLIED -- RECOVERY CHANNEL ONLINE", "info");
  }

  function submitRecovery() {
    const attemptNo = attempts + 1;
    onAttempt(attemptNo);

    if (recoverySelection.some((v) => v === "")) {
      onStatusChange("// SIGNAL DEGRADED -- OUTPUT BUFFER INCOMPLETE", "error");
      onBreach();
      void sendStudyEvent({ participantId, sessionId, eventName: "attempt_failed", levelId: "xor-stream", taskId: "signal-repair", attemptNo, result: "recovery-incomplete" });
      return;
    }

    const correct = recoverySelection.join("") === xorExpected;
    const feedback = recoverySelection.map((s, i) => (s === xorExpected[i] ? "correct" : "wrong"));
    setRecoveryFeedback(feedback);
    setFeedbackGen((p) => p + 1);
    window.setTimeout(() => { setRecoveryFeedback(Array.from({ length: xorLevel.recoveryCipherBits.length }, () => null)); }, 1500);

    void sendStudyEvent({ participantId, sessionId, eventName: correct ? "attempt_succeeded" : "attempt_failed", levelId: "xor-stream", taskId: "signal-repair", attemptNo, result: correct ? "recovery-correct" : "recovery-wrong" });

    if (!correct) {
      onStatusChange("// SIGNAL DEGRADED -- ADJUST RECOVERY BITS", "error");
      onBreach();
      return;
    }

    const durationMs = Date.now() - startTime;
    const { score } = calculateLevelScore({ levelId: "xor-stream", attempts: attemptNo, hintsUsed, durationMs, skipped: false });
    setCompleted(true);
    onBurst();
    onUnlockCodex("xor-stream");
    onStatusChange("// TRANSMISSION DECRYPTED -- BRAVO FRAGMENT LOGGED", "success");
    void sendStudyEvent({ participantId, sessionId, eventName: "level_completed", levelId: "xor-stream", taskId: "signal-repair", attemptNo, durationMs, result: "completed" });
    onComplete({ levelId: "xor-stream", flag: xorLevel.flag, score, attempts: attemptNo, hintsUsed, durationMs, skipped: false });
  }

  if (completed) {
    return (
      <div className="space-y-4">
        <div className="terminal-panel relative overflow-hidden">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#4ade80]">// TRANSMISSION BRAVO -- DECRYPTED</p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[#5a6a7a]">// CONTENT: CLASSIFIED FRAGMENT 2/6</p>
          <div className="mt-5 space-y-2 font-mono text-lg leading-8 text-[#d4a843]">
            <p>PACKAGE TRANSFER CONFIRMED</p>
            <p>WINDOW: 0200-0215 UTC</p>
          </div>
          <p className="mt-5 font-mono text-sm text-[#4ade80]">// KEY FRAGMENT RECOVERED: 0x7A</p>
          <p className="font-mono text-sm text-[#4ade80]">// LOGGING TO SIGNAL LOG...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="terminal-panel">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">// SIGNAL PROCESSOR -- CALIBRATION MODE</p>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-[#5a6a7a]">// ENCODING METHOD: BITWISE TRANSFORM</p>
        <p className="mt-4 font-mono text-sm leading-7 text-[#c3a257]">// CONFIGURE DECODE RULES: set each output channel based on the input pair.</p>
      </div>

      <div className="terminal-panel space-y-3">
        {xorLevel.rulePairs.map((pair, index) => {
          const isActive = ruleSelection[index] !== "";
          const fb = ruleFeedback[index];
          const fbClass = fb === "correct" ? "xor-row-correct" : fb === "wrong" ? "xor-row-wrong" : "";
          return (
            <div key={`rule-${index}-${feedbackGen}`} className={`rounded border border-[#1a2840] bg-[#09111c] px-4 py-4 ${fbClass}`}>
              <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[#5a6a7a]">{`// CHANNEL ${index + 1}: [${pair.left}] XOR [${pair.right}] = [ ? ]`}</p>
              <div className="flex items-center gap-3">
                <div className={`bit-node ${isActive ? "bit-node--active" : ""}`}>{pair.left}</div>
                <div className={`xor-wire flex-1 ${isActive ? "xor-wire--active" : ""}`} />
                <div className={`bit-node ${isActive ? "bit-node--active" : ""}`}>{pair.right}</div>
                <div className={`xor-wire flex-1 ${isActive ? "xor-wire--active" : ""}`} />
                <div className={`xor-gate ${isActive ? "xor-gate--active" : ""}`}>XOR</div>
                <div className={`xor-wire flex-1 ${isActive ? "xor-wire--active" : ""}`} />
                <div className={`rocker-toggle ${isActive ? "rocker-toggle--active" : ""}`}>
                  <span className={`rocker-toggle__pill ${ruleSelection[index] === "" ? "rocker-toggle__pill--hidden" : ruleSelection[index] === "1" ? "rocker-toggle__pill--right" : ""}`} />
                  {["0", "1"].map((v) => (
                    <button key={v} type="button" className={`rocker-toggle__btn ${ruleSelection[index] === v ? "rocker-toggle__btn--selected" : "rocker-toggle__btn--unselected"}`} onClick={() => chooseBit(index, v, setRuleSelection)} role="radio" aria-checked={ruleSelection[index] === v} aria-label={`Output ${v} for XOR pair ${pair.left} and ${pair.right}`}>{v}</button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        <div className="rounded border border-[#1a2840] bg-[#09111c] px-4 py-4 font-mono text-sm text-[#c3a257]">
          <p>{`// DECODER OUTPUT: [ ${ruleSelection.map((b) => b || "?").join(" ")} ]`}</p>
          <p className="mt-2">{`// STATUS: ${ruleSolved ? "CALIBRATED" : "UNCALIBRATED"}`}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          {attempts >= 3 && !ruleSolved && (
            <Button variant="secondary" onClick={handleSkip} className="rounded border border-[#624616] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] hover:bg-[#2a1c08]">// BYPASS BRAVO</Button>
          )}
          <Button onClick={submitRuleBoard} className="rounded border border-[#1a2840] bg-[#162134] font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] shadow-none hover:bg-[#1d2a43]">// APPLY CALIBRATION</Button>
        </div>
      </div>

      {ruleSolved && (
        <div ref={stepTwoRef} className="terminal-panel stage-unlock-enter space-y-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">// SIGNAL RECOVERY MODE</p>
            <p className="mt-2 font-mono text-sm leading-7 text-[#c3a257]">// Corrupted transmission above, key stream below, recovery buffer awaiting output.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {xorLevel.recoveryCipherBits.split("").map((cipherBit, index) => {
              const fb = recoveryFeedback[index];
              const fbClass = fb === "correct" ? "xor-row-correct" : fb === "wrong" ? "xor-row-wrong" : "";
              return (
                <div key={`recovery-${index}-${feedbackGen}`} className={`rounded border border-[#1a2840] bg-[#09111c] p-4 ${fbClass}`}>
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#5a6a7a]">{`// NODE ${index + 1}`}</p>
                  <div className="mt-4 space-y-4">
                    <div><p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#5a6a7a]">CIPHER</p><div className="bit-node bit-node--active">{cipherBit}</div></div>
                    <div><p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#5a6a7a]">KEY</p><div className="bit-node bit-node--active">{xorLevel.recoveryKeyBits[index]}</div></div>
                    <div>
                      <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#5a6a7a]">OUTPUT</p>
                      <div className="rocker-toggle rocker-toggle--active">
                        <span className={`rocker-toggle__pill ${recoverySelection[index] === "" ? "rocker-toggle__pill--hidden" : recoverySelection[index] === "1" ? "rocker-toggle__pill--right" : ""}`} />
                        {["0", "1"].map((v) => (
                          <button key={v} type="button" className={`rocker-toggle__btn ${recoverySelection[index] === v ? "rocker-toggle__btn--selected" : "rocker-toggle__btn--unselected"}`} onClick={() => chooseBit(index, v, setRecoverySelection)} role="radio" aria-checked={recoverySelection[index] === v} aria-label={`Recovery output ${v} for node ${index + 1}`}>{v}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded border border-[#1a2840] bg-[#09111c] px-4 py-4 font-mono text-sm text-[#c3a257]">
            <p>{`// DECODER OUTPUT: [ ${recoverySelection.map((b) => b || "?").join(" ")} ]`}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            {attempts >= 3 && (
              <Button variant="secondary" onClick={handleSkip} className="rounded border border-[#624616] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] hover:bg-[#2a1c08]">// BYPASS BRAVO</Button>
            )}
            <Button onClick={submitRecovery} className="rounded border border-[#1a2840] bg-[#162134] font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] shadow-none hover:bg-[#1d2a43]">// RECOVER SIGNAL</Button>
          </div>
        </div>
      )}
    </div>
  );
}
