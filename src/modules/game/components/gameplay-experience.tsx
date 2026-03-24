"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  blockCipherLevel,
  caesarLevel,
  gameplayLevels,
  levelOrder,
  xorLevel,
} from "@/modules/game/content";
import { CodexPanel } from "@/modules/game/components/codex-panel";
import {
  decryptCaesar,
  evaluateBlockSequence,
  xorBitStrings,
} from "@/modules/game/logic";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import type { CodexEntryId, LevelId } from "@/types/study";

interface GameplayExperienceProps {
  participantId: string;
  sessionId: string;
  onComplete: (skippedLevels: string[]) => void;
}

interface ToastState {
  message: string;
  tone: "info" | "error";
}

const taskIds: Record<LevelId, string> = {
  "caesar-cipher": "shift-control",
  "xor-stream": "signal-repair",
  "block-cipher": "role-sequence",
};

function currentTimestamp() {
  return Date.now();
}

function buildLevelCounterState(defaultValue: number) {
  return {
    "caesar-cipher": defaultValue,
    "xor-stream": defaultValue,
    "block-cipher": defaultValue,
  } as Record<LevelId, number>;
}

function buildLevelBooleanState(defaultValue: boolean) {
  return {
    "caesar-cipher": defaultValue,
    "xor-stream": defaultValue,
    "block-cipher": defaultValue,
  } as Record<LevelId, boolean>;
}

function buildBitSelectionState(length: number) {
  return Array.from({ length }, () => "");
}

export function GameplayExperience({
  onComplete,
  participantId,
  sessionId,
}: GameplayExperienceProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [caesarShift, setCaesarShift] = useState(0);
  const [caesarShiftChanges, setCaesarShiftChanges] = useState(0);
  const [xorRuleSelection, setXorRuleSelection] = useState(
    buildBitSelectionState(xorLevel.rulePairs.length),
  );
  const [xorRuleSolved, setXorRuleSolved] = useState(false);
  const [xorRecoverySelection, setXorRecoverySelection] = useState(
    buildBitSelectionState(xorLevel.recoveryCipherBits.length),
  );
  const [blockSelection, setBlockSelection] = useState<string[]>(
    buildBitSelectionState(blockCipherLevel.slotLabels.length),
  );
  const [selectedBlockChoice, setSelectedBlockChoice] = useState<string | null>(null);
  const [attemptsByLevel, setAttemptsByLevel] = useState(buildLevelCounterState(0));
  const [unlockedHintsByLevel, setUnlockedHintsByLevel] = useState(buildLevelCounterState(0));
  const [revealedHintsByLevel, setRevealedHintsByLevel] = useState(buildLevelCounterState(0));
  const [completedByLevel, setCompletedByLevel] = useState(buildLevelBooleanState(false));
  const [skippedLevels, setSkippedLevels] = useState<Set<LevelId>>(new Set());
  const [unlockedCodexEntries, setUnlockedCodexEntries] = useState<CodexEntryId[]>([]);
  const [codexOpen, setCodexOpen] = useState(false);
  const [activeCodexEntry, setActiveCodexEntry] =
    useState<CodexEntryId>("caesar-cipher");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"success" | "error" | "info">("info");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [blockFeedback, setBlockFeedback] = useState<string[]>([]);
  const [xorRuleFeedback, setXorRuleFeedback] = useState<(string | null)[]>(
    Array.from({ length: xorLevel.rulePairs.length }, () => null),
  );
  const [xorRecoveryFeedback, setXorRecoveryFeedback] = useState<(string | null)[]>(
    Array.from({ length: xorLevel.recoveryCipherBits.length }, () => null),
  );
  const [feedbackGeneration, setFeedbackGeneration] = useState(0);
  const [readyForPosttest, setReadyForPosttest] = useState(false);
  const levelStartTimesRef = useRef<Record<LevelId, number>>({
    "caesar-cipher": 0,
    "xor-stream": 0,
    "block-cipher": 0,
  });
  const lastInteractionRef = useRef(0);
  const startedLevelsRef = useRef<Set<LevelId>>(new Set());
  const xorStepTwoRef = useRef<HTMLDivElement | null>(null);
  const prevUnlockedHintsRef = useRef(0);
  const [hintCardGlow, setHintCardGlow] = useState(false);

  const currentLevel = gameplayLevels[currentLevelIndex];
  const currentLevelId = currentLevel.id;
  const attempts = attemptsByLevel[currentLevelId];
  const unlockedHintCount = unlockedHintsByLevel[currentLevelId];
  const revealedHintCount = revealedHintsByLevel[currentLevelId];

  const caesarPreview = useMemo(
    () => decryptCaesar(caesarLevel.ciphertext, caesarShift),
    [caesarShift],
  );
  const xorRuleAnswer = xorRuleSelection.join("");
  const xorRecoveryPreview = xorRecoverySelection.join("");
  const xorExpectedRecovery =
    xorBitStrings(xorLevel.recoveryCipherBits, xorLevel.recoveryKeyBits) ??
    xorLevel.recoveryPlaintextBits;

  useEffect(() => {
    lastInteractionRef.current = currentTimestamp();
  }, []);

  useEffect(() => {
    if (startedLevelsRef.current.has(currentLevelId)) {
      return;
    }

    startedLevelsRef.current.add(currentLevelId);
    levelStartTimesRef.current[currentLevelId] = currentTimestamp();

    void sendStudyEvent({
      participantId,
      sessionId,
      eventName: "level_started",
      levelId: currentLevelId,
      taskId: taskIds[currentLevelId],
      metadata: {
        levelTitle: currentLevel.title,
      },
    });
  }, [currentLevel.title, currentLevelId, participantId, sessionId]);

  useEffect(() => {
    if (completedByLevel[currentLevelId]) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const elapsed = currentTimestamp() - lastInteractionRef.current;

      if (elapsed >= 30000) {
        setUnlockedHintsByLevel((previous) => ({
          ...previous,
          [currentLevelId]: Math.max(previous[currentLevelId], 1),
        }));
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [completedByLevel, currentLevelId]);

  useEffect(() => {
    if (!xorRuleSolved || currentLevelId !== "xor-stream") {
      return;
    }

    window.requestAnimationFrame(() => {
      xorStepTwoRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [currentLevelId, xorRuleSolved]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (unlockedHintCount > prevUnlockedHintsRef.current) {
      showToast("A new hint is available in the sidebar.", "info");
      setHintCardGlow(true);
      const timeoutId = window.setTimeout(() => setHintCardGlow(false), 1600);
      prevUnlockedHintsRef.current = unlockedHintCount;
      return () => window.clearTimeout(timeoutId);
    }
    prevUnlockedHintsRef.current = unlockedHintCount;
  }, [unlockedHintCount]);

  function markInteraction() {
    lastInteractionRef.current = currentTimestamp();
  }

  function unlockCodex(entryId: CodexEntryId) {
    setUnlockedCodexEntries((previous) =>
      previous.includes(entryId) ? previous : [...previous, entryId],
    );
    setActiveCodexEntry(entryId);
  }

  function unlockHintsAfterFailure(levelId: LevelId, attemptNo: number) {
    setUnlockedHintsByLevel((previous) => ({
      ...previous,
      [levelId]:
        attemptNo >= 4
          ? Math.max(previous[levelId], 3)
          : attemptNo >= 3
            ? Math.max(previous[levelId], 2)
            : attemptNo >= 2
              ? Math.max(previous[levelId], 1)
              : previous[levelId],
    }));
  }

  function showToast(message: string, tone: ToastState["tone"] = "error") {
    setToast({ message, tone });
  }

  function getNextAttempt(levelId: LevelId) {
    return attemptsByLevel[levelId] + 1;
  }

  function logAttempt(levelId: LevelId, attemptNo: number, result: string) {
    void sendStudyEvent({
      participantId,
      sessionId,
      eventName: "attempt_submitted",
      levelId,
      taskId: taskIds[levelId],
      attemptNo,
      result,
    });
  }

  function handleFailedAttempt(levelId: LevelId, attemptNo: number, result: string) {
    setAttemptsByLevel((previous) => ({
      ...previous,
      [levelId]: attemptNo,
    }));
    unlockHintsAfterFailure(levelId, attemptNo);

    void sendStudyEvent({
      participantId,
      sessionId,
      eventName: "attempt_failed",
      levelId,
      taskId: taskIds[levelId],
      attemptNo,
      result,
    });
  }

  function handleIntermediateSuccess(
    levelId: LevelId,
    attemptNo: number,
    result: string,
    metadata?: Record<string, unknown>,
  ) {
    setAttemptsByLevel((previous) => ({
      ...previous,
      [levelId]: attemptNo,
    }));

    void sendStudyEvent({
      participantId,
      sessionId,
      eventName: "attempt_succeeded",
      levelId,
      taskId: taskIds[levelId],
      attemptNo,
      result,
      metadata,
    });
  }

  function fireConfetti() {
    const end = Date.now() + 1500;
    const colors = ["#2d7ff9", "#4e9bff", "#34d399", "#fbbf24", "#f472b6"];
    (function burst() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
      });
      if (Date.now() < end) requestAnimationFrame(burst);
    })();
  }

  function handleSuccessfulAttempt(
    levelId: LevelId,
    attemptNo: number,
    result: string,
    metadata?: Record<string, unknown>,
  ) {
    fireConfetti();
    setAttemptsByLevel((previous) => ({
      ...previous,
      [levelId]: attemptNo,
    }));
    setCompletedByLevel((previous) => ({
      ...previous,
      [levelId]: true,
    }));

    const durationMs = currentTimestamp() - levelStartTimesRef.current[levelId];

    void sendStudyEvent({
      participantId,
      sessionId,
      eventName: "attempt_succeeded",
      levelId,
      taskId: taskIds[levelId],
      attemptNo,
      result,
      durationMs,
      metadata,
    });

    void sendStudyEvent({
      participantId,
      sessionId,
      eventName: "level_completed",
      levelId,
      taskId: taskIds[levelId],
      attemptNo,
      durationMs,
      result: "completed",
      metadata,
    });
  }

  function handleSkipLevel() {
    markInteraction();
    const durationMs = currentTimestamp() - levelStartTimesRef.current[currentLevelId];
    const attemptNo = attempts;

    void sendStudyEvent({
      participantId,
      sessionId,
      eventName: "level_skipped",
      levelId: currentLevelId,
      taskId: taskIds[currentLevelId],
      attemptNo,
      durationMs,
    });

    if (currentLevelId === "caesar-cipher") {
      setCaesarShift(caesarLevel.targetShift);
    } else if (currentLevelId === "xor-stream") {
      setXorRuleSelection(xorLevel.rulePairs.map((p) => p.output));
      setXorRuleSolved(true);
      setXorRecoverySelection(xorExpectedRecovery.split(""));
    } else if (currentLevelId === "block-cipher") {
      setBlockSelection(blockCipherLevel.correctSequence);
      setBlockFeedback([]);
    }

    setSkippedLevels((prev) => new Set(prev).add(currentLevelId));
    setCompletedByLevel((prev) => ({ ...prev, [currentLevelId]: true }));
    unlockCodex(currentLevelId);

    setStatusTone("info");
    setStatusMessage("Level skipped. The correct answer has been filled in. Review the Codex summary, then continue.");
  }

  function chooseBit(
    index: number,
    value: string,
    onChange: Dispatch<SetStateAction<string[]>>,
  ) {
    markInteraction();
    onChange((previous) =>
      previous.map((currentValue, currentIndex) =>
        currentIndex === index ? value : currentValue,
      ),
    );
  }

  function continueAfterLevel(levelId: LevelId) {
    if (levelId === "block-cipher") {
      setReadyForPosttest(true);
      setStatusTone("success");
      setStatusMessage(
        "All three levels are complete. Review any unlocked Codex entries, then continue to the post-test.",
      );
      return;
    }

    setCurrentLevelIndex((previous) => previous + 1);
    setStatusMessage(null);
    setStatusTone("info");
    setToast(null);
    setBlockFeedback([]);
  }

  function handleRevealHint() {
    if (revealedHintCount >= unlockedHintCount) {
      return;
    }

    const nextHintIndex = revealedHintCount + 1;
    setRevealedHintsByLevel((previous) => ({
      ...previous,
      [currentLevelId]: nextHintIndex,
    }));

    void sendStudyEvent({
      participantId,
      sessionId,
      eventName: "hint_opened",
      levelId: currentLevelId,
      taskId: taskIds[currentLevelId],
      attemptNo: attempts,
      metadata: {
        hintIndex: nextHintIndex,
      },
    });
  }

  function handleCodexToggle() {
    const nextOpen = !codexOpen;
    setCodexOpen(nextOpen);

    if (nextOpen) {
      void sendStudyEvent({
        participantId,
        sessionId,
        eventName: "codex_opened",
        levelId: currentLevelId,
        metadata: {
          mode: "drawer",
        },
      });
    }
  }

  function handleCodexEntrySelect(entryId: CodexEntryId) {
    setActiveCodexEntry(entryId);
    void sendStudyEvent({
      participantId,
      sessionId,
      eventName: "codex_opened",
      levelId: currentLevelId,
      metadata: {
        mode: "entry",
        entryId,
      },
    });
  }

  function submitCaesarGuess() {
    markInteraction();
    const attemptNo = getNextAttempt("caesar-cipher");
    const isCorrect = caesarShift === caesarLevel.targetShift;
    logAttempt("caesar-cipher", attemptNo, isCorrect ? "correct-shift" : "wrong-shift");

    if (!isCorrect) {
      setStatusTone("error");
      setStatusMessage("The preview is still off. Adjust the shift and try again.");
      showToast("Wrong shift. Move the slider until the message becomes readable.");
      handleFailedAttempt("caesar-cipher", attemptNo, "wrong-shift");
      return;
    }

    handleSuccessfulAttempt("caesar-cipher", attemptNo, "correct-shift", {
      finalShift: caesarShift,
      shiftChanges: caesarShiftChanges,
      plaintext: caesarLevel.plaintext,
    });
    unlockCodex("caesar-cipher");
    setStatusTone("success");
    setStatusMessage(
      `${caesarLevel.successMessage} The Codex entry for Caesar Cipher is now unlocked.`,
    );
  }

  function submitXorRuleBoard() {
    markInteraction();
    const attemptNo = getNextAttempt("xor-stream");
    const expectedRule = xorLevel.rulePairs.map((pair) => pair.output).join("");

    if (xorRuleSelection.some((value) => value === "")) {
      logAttempt("xor-stream", attemptNo, "rule-incomplete");
      setStatusTone("error");
      setStatusMessage("Finish each XOR output before checking the rule.");
      showToast("Finish every output bit before checking Step 1.");
      handleFailedAttempt("xor-stream", attemptNo, "rule-incomplete");
      return;
    }

    const isCorrect = xorRuleAnswer === expectedRule;
    logAttempt("xor-stream", attemptNo, isCorrect ? "rule-correct" : "rule-wrong");

    if (!isCorrect) {
      const expected = xorLevel.rulePairs.map((p) => p.output);
      const fb = xorRuleSelection.map((sel, i) =>
        sel === expected[i] ? "correct" : "wrong",
      );
      setXorRuleFeedback(fb);
      setFeedbackGeneration((g) => g + 1);
      setTimeout(
        () => setXorRuleFeedback(Array.from({ length: xorLevel.rulePairs.length }, () => null)),
        1500,
      );
      setStatusTone("error");
      setStatusMessage("Close. Same bits give 0, and different bits give 1.");
      showToast("Not quite. Same bits give 0 and different bits give 1.");
      handleFailedAttempt("xor-stream", attemptNo, "rule-wrong");
      return;
    }

    setXorRuleFeedback(xorLevel.rulePairs.map(() => "correct"));
    setFeedbackGeneration((g) => g + 1);
    setTimeout(
      () => setXorRuleFeedback(Array.from({ length: xorLevel.rulePairs.length }, () => null)),
      1500,
    );
    setXorRuleSolved(true);
    handleIntermediateSuccess("xor-stream", attemptNo, "rule-correct", {
      stage: "rule-board",
      outputs: xorRuleAnswer,
    });
    setStatusTone("success");
    setStatusMessage(
      "Decoder calibrated. Scroll down to Phase 2 and recover the transmission.",
    );
  }

  function submitXorRecovery() {
    markInteraction();
    const attemptNo = getNextAttempt("xor-stream");

    if (xorRecoverySelection.some((value) => value === "")) {
      logAttempt("xor-stream", attemptNo, "recovery-incomplete");
      setStatusTone("error");
      setStatusMessage("Choose every output bit before recovering the signal.");
      showToast("Choose every output bit before recovering the signal.");
      handleFailedAttempt("xor-stream", attemptNo, "recovery-incomplete");
      return;
    }

    const isCorrect = xorRecoveryPreview === xorExpectedRecovery;
    logAttempt(
      "xor-stream",
      attemptNo,
      isCorrect ? "recovery-correct" : "recovery-wrong",
    );

    if (!isCorrect) {
      const expectedBits = xorExpectedRecovery.split("");
      const fb = xorRecoverySelection.map((sel, i) =>
        sel === expectedBits[i] ? "correct" : "wrong",
      );
      setXorRecoveryFeedback(fb);
      setFeedbackGeneration((g) => g + 1);
      setTimeout(
        () => setXorRecoveryFeedback(Array.from({ length: xorLevel.recoveryCipherBits.length }, () => null)),
        1500,
      );
      setStatusTone("error");
      setStatusMessage("The signal is still scrambled. Work across the channels one bit at a time.");
      showToast("Wrong recovery. Compare each pair of bits one channel at a time.");
      handleFailedAttempt("xor-stream", attemptNo, "recovery-wrong");
      return;
    }

    setXorRecoveryFeedback(xorLevel.recoveryCipherBits.split("").map(() => "correct"));
    setFeedbackGeneration((g) => g + 1);
    setTimeout(
      () => setXorRecoveryFeedback(Array.from({ length: xorLevel.recoveryCipherBits.length }, () => null)),
      1500,
    );
    handleSuccessfulAttempt("xor-stream", attemptNo, "recovery-correct", {
      stage: "signal-recovery",
      recoveredBits: xorRecoveryPreview,
    });
    unlockCodex("xor-stream");
    setStatusTone("success");
    setStatusMessage(
      `${xorLevel.successMessage} The Codex entry for XOR and stream ciphers is now unlocked.`,
    );
  }

  function submitBlockSequence() {
    markInteraction();
    const attemptNo = getNextAttempt("block-cipher");
    const evaluation = evaluateBlockSequence(blockSelection);
    logAttempt("block-cipher", attemptNo, evaluation.correct ? "correct-sequence" : "wrong-sequence");

    if (!evaluation.correct) {
      setBlockFeedback(evaluation.feedback);
      setStatusTone("error");
      setStatusMessage("The setup is still off. Use the feedback to keep the key separate from the IV.");
      showToast("Wrong order. The key is the secret and the IV is only the starter value.");
      handleFailedAttempt("block-cipher", attemptNo, "wrong-sequence");
      return;
    }

    setBlockFeedback([]);
    handleSuccessfulAttempt("block-cipher", attemptNo, "correct-sequence");
    unlockCodex("block-cipher");
    setStatusTone("success");
    setStatusMessage(blockCipherLevel.successMessage);
  }

  function renderCaesarLevel() {
    return (
      <div className="space-y-5">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/75 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
            Intercepted text
          </p>
          <p className="mt-3 break-words font-mono text-2xl tracking-[0.2em] text-[var(--ink)] sm:text-[1.75rem]">
            {caesarLevel.ciphertext}
          </p>
        </div>
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-strong)] p-5">
          <div className="flex flex-col">
            <div className="mb-6 flex w-full items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                Frequency Tuner
              </span>
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-3 py-1 shadow-[0_0_10px_rgba(78,155,255,0.15)]">
                <span className="font-mono text-[0.65rem] uppercase tracking-widest text-[var(--accent-strong)]">
                  Shift_Val
                </span>
                <span className="font-mono text-xl font-bold text-[var(--ink)]">
                  {caesarShift.toString().padStart(2, "0")}
                </span>
              </div>
            </div>

            <div className="flex w-full items-center gap-4 sm:gap-6">
              <button
                type="button"
                onClick={() => {
                  if (caesarShift > 0) {
                    markInteraction();
                    const nextShift = caesarShift - 1;
                    setCaesarShift(nextShift);
                    setCaesarShiftChanges((prev) => prev + 1);
                    void sendStudyEvent({
                      participantId,
                      sessionId,
                      eventName: "shift_changed",
                      levelId: "caesar-cipher",
                      taskId: taskIds["caesar-cipher"],
                      result: `shift-${nextShift}`,
                      metadata: { shift: nextShift },
                    });
                  }
                }}
                disabled={caesarShift === 0}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[var(--border-strong)] bg-[var(--card)] text-2xl font-bold text-[var(--ink)] transition-all hover:border-[var(--accent)] hover:bg-[#2d7ff9]/10 hover:text-[var(--accent-strong)] hover:shadow-[0_0_15px_rgba(78,155,255,0.3)] disabled:opacity-30 disabled:hover:border-[var(--border-strong)] disabled:hover:bg-[var(--card)] disabled:hover:text-[var(--ink)] disabled:hover:shadow-none"
              >
                -
              </button>

              <div className="relative flex-1 py-4">
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={caesarShift}
                  onChange={(event) => {
                    markInteraction();
                    const nextShift = Number(event.target.value);
                    setCaesarShift(nextShift);
                    setCaesarShiftChanges((previous) => previous + 1);
                    void sendStudyEvent({
                      participantId,
                      sessionId,
                      eventName: "shift_changed",
                      levelId: "caesar-cipher",
                      taskId: taskIds["caesar-cipher"],
                      result: `shift-${nextShift}`,
                      metadata: {
                        shift: nextShift,
                      },
                    });
                  }}
                  className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
                />
                
                {/* Custom Track Background */}
                <div className="pointer-events-none relative h-2 w-full rounded-full bg-[var(--card)] border border-[var(--border-strong)]">
                  {/* Filled portion */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] shadow-[0_0_8px_rgba(45,127,249,0.5)] transition-all duration-75"
                    style={{ width: `${(caesarShift / 25) * 100}%` }}
                  />
                  {/* Custom Thumb */}
                  <div
                    className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[var(--card-strong)] bg-[var(--ink)] shadow-[0_0_12px_rgba(78,155,255,0.8)] transition-all duration-75"
                    style={{ left: `${(caesarShift / 25) * 100}%` }}
                  />
                </div>
                
                {/* Tick marks */}
                <div className="pointer-events-none mt-4 flex justify-between px-1">
                  {[0, 5, 10, 15, 20, 25].map((tick) => (
                    <div key={tick} className="flex flex-col items-center">
                      <div className="h-1.5 w-[2px] bg-[var(--ink-muted)] opacity-40" />
                      <span className="mt-1 font-mono text-[0.55rem] text-[var(--ink-muted)] opacity-60">
                        {tick}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (caesarShift < 25) {
                    markInteraction();
                    const nextShift = caesarShift + 1;
                    setCaesarShift(nextShift);
                    setCaesarShiftChanges((prev) => prev + 1);
                    void sendStudyEvent({
                      participantId,
                      sessionId,
                      eventName: "shift_changed",
                      levelId: "caesar-cipher",
                      taskId: taskIds["caesar-cipher"],
                      result: `shift-${nextShift}`,
                      metadata: { shift: nextShift },
                    });
                  }
                }}
                disabled={caesarShift === 25}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-[var(--border-strong)] bg-[var(--card)] text-2xl font-bold text-[var(--ink)] transition-all hover:border-[var(--accent)] hover:bg-[#2d7ff9]/10 hover:text-[var(--accent-strong)] hover:shadow-[0_0_15px_rgba(78,155,255,0.3)] disabled:opacity-30 disabled:hover:border-[var(--border-strong)] disabled:hover:bg-[var(--card)] disabled:hover:text-[var(--ink)] disabled:hover:shadow-none"
              >
                +
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-4">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
              Live plaintext preview
            </p>
              <p className="mt-2 break-words font-mono text-xl text-[var(--ink)] sm:text-2xl">
                {caesarPreview}
              </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          {attempts >= 3 && !completedByLevel[currentLevelId] && (
            <Button
              variant="secondary"
              onClick={handleSkipLevel}
              className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
            >
              Show answer and continue
            </Button>
          )}
          <Button onClick={submitCaesarGuess}>Submit shift</Button>
        </div>
      </div>
    );
  }

  function renderXorLevel() {
    const ruleExpected = xorLevel.rulePairs.map((p) => p.output);
    const recoveryFilledCount = xorRecoverySelection.filter((v) => v !== "").length;
    const recoveryTotalBits = xorLevel.recoveryCipherBits.length;

    return (
      <div className="space-y-5">
        {/* ── Phase 1 Header ── */}
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/75 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
            Phase 1 &middot; Signal Analysis
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">
            Calibrate the XOR Decoder
          </h3>
          <p className="mt-2 text-base leading-7 text-[var(--ink-muted)]">
            When two signal bits match, the decoder outputs 0. When they differ, it outputs 1. Toggle each output channel to calibrate.
          </p>
        </div>

        {/* ── Phase 1 Circuit Board Rows ── */}
        <div className="space-y-3 rounded-[24px] border border-[var(--border)] bg-[var(--card-strong)] p-5">
          {xorLevel.rulePairs.map((pair, index) => {
            const isActive = xorRuleSelection[index] !== "";
            const fb = xorRuleFeedback[index];
            const feedbackClass = fb === "correct" ? "xor-row-correct" : fb === "wrong" ? "xor-row-wrong" : "";

            return (
              <div
                key={`rule-${pair.left}-${pair.right}-${index}-${feedbackGeneration}`}
                className={`rounded-2xl border border-[var(--border)] bg-[var(--card)]/55 px-4 py-4 ${feedbackClass}`}
              >
                {/* Mobile label */}
                <p className="mb-3 font-mono text-[0.65rem] uppercase tracking-widest text-[var(--ink-muted)] md:hidden">
                  Bit Channel {index + 1}
                </p>
                {/* Circuit row */}
                <div className="flex items-center gap-3">
                  {/* Input A node */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="hidden text-[0.6rem] uppercase tracking-widest text-[var(--ink-muted)] md:block">
                      Signal
                    </span>
                    <div className={`bit-node ${isActive ? "bit-node--active" : ""}`}>
                      {pair.left}
                    </div>
                  </div>
                  {/* Wire A */}
                  <div className={`xor-wire flex-1 ${isActive ? "xor-wire--active" : ""}`} />
                  {/* Input B node */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="hidden text-[0.6rem] uppercase tracking-widest text-[var(--ink-muted)] md:block">
                      Key
                    </span>
                    <div className={`bit-node ${isActive ? "bit-node--active" : ""}`}>
                      {pair.right}
                    </div>
                  </div>
                  {/* Wire B */}
                  <div className={`xor-wire flex-1 ${isActive ? "xor-wire--active" : ""}`} />
                  {/* XOR Gate */}
                  <div className={`xor-gate ${isActive ? "xor-gate--active" : ""}`}>XOR</div>
                  {/* Wire C */}
                  <div className={`xor-wire flex-1 ${isActive ? "xor-wire--active" : ""}`} />
                  {/* Rocker Toggle Output */}
                  <div className="flex flex-col items-center gap-1">
                    <span className="hidden text-[0.6rem] uppercase tracking-widest text-[var(--ink-muted)] md:block">
                      Out
                    </span>
                    <div className={`rocker-toggle ${isActive ? "rocker-toggle--active" : ""}`}>
                      <span
                        className={`rocker-toggle__pill ${
                          xorRuleSelection[index] === ""
                            ? "rocker-toggle__pill--hidden"
                            : xorRuleSelection[index] === "1"
                              ? "rocker-toggle__pill--right"
                              : ""
                        }`}
                      />
                      {["0", "1"].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={`rocker-toggle__btn ${
                            xorRuleSelection[index] === value
                              ? "rocker-toggle__btn--selected"
                              : "rocker-toggle__btn--unselected"
                          }`}
                          onClick={() => chooseBit(index, value, setXorRuleSelection)}
                          role="radio"
                          aria-checked={xorRuleSelection[index] === value}
                          aria-label={`Output ${value} for bit pair ${pair.left} XOR ${pair.right}`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Decoder Output Buffer */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 rounded-2xl bg-[var(--card)] px-4 py-3">
              <span className="text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                Decoder Output
              </span>
              <div className="flex gap-2">
                {xorRuleSelection.map((bit, i) => (
                  <div
                    key={`led-rule-${i}`}
                    className={`led-dot ${bit !== "" ? "led-dot--on" : ""}`}
                  >
                    {bit || "?"}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-3 items-center w-full sm:w-auto">
              {attempts >= 3 && !completedByLevel[currentLevelId] && !xorRuleSolved && (
                <Button
                  variant="secondary"
                  onClick={handleSkipLevel}
                  className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
                >
                  Show answer and continue
                </Button>
              )}
              <Button
                onClick={submitXorRuleBoard}
                className="font-mono text-sm uppercase tracking-widest px-8"
              >
                Run Diagnostics
              </Button>
            </div>
          </div>
        </div>

        {/* ── Phase 2 ── */}
        {xorRuleSolved ? (
          <div ref={xorStepTwoRef} className="space-y-5 stage-unlock-enter">
            {/* Unlock banner */}
            <div className="rounded-[24px] border border-[var(--accent-strong)]/50 bg-[var(--accent)]/14 px-5 py-4 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
                Decoder Calibrated
              </p>
              <p className="mt-1 text-sm text-sky-100">
                Phase 2 transmission recovery channel is now online.
              </p>
            </div>

            {/* Phase 2 Header */}
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/75 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
                Phase 2 &middot; Signal Recovery
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">
                Restore Classified Transmission
              </h3>
              <p className="mt-2 text-base leading-7 text-[var(--ink-muted)]">
                Apply the XOR rule to every bit channel. Route each encrypted bit through the decoder with its key bit to recover the original signal.
              </p>
            </div>

            {/* Columnar Circuit Board */}
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-strong)] p-5">
              <p className="mb-5 font-mono text-xs uppercase tracking-[0.28em] text-[var(--ink-muted)]">
                Configure Output Channels
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0 md:grid-cols-4 md:gap-x-6">
                {xorLevel.recoveryCipherBits.split("").map((cipherBit, index) => {
                  const keyBit = xorLevel.recoveryKeyBits[index];
                  const isActive = xorRecoverySelection[index] !== "";
                  const fb = xorRecoveryFeedback[index];
                  const feedbackClass = fb === "correct" ? "xor-row-correct" : fb === "wrong" ? "xor-row-wrong" : "";

                  return (
                    <div
                      key={`recovery-col-${index}-${feedbackGeneration}`}
                      className={`flex flex-col items-center py-3 ${feedbackClass}`}
                    >
                      {/* Channel label */}
                      <span className="mb-2 font-mono text-[0.6rem] uppercase tracking-widest text-[var(--ink-muted)]">
                        Ch {index + 1}
                      </span>
                      {/* Encrypted bit */}
                      <div className={`bit-node ${isActive ? "bit-node--active" : ""}`}>
                        {cipherBit}
                      </div>
                      <span className="my-1 text-[0.55rem] uppercase tracking-wider text-[var(--ink-muted)]">
                        Intercept
                      </span>
                      {/* Vertical wire */}
                      <div
                        className={`xor-wire-v ${isActive ? "xor-wire-v--active" : ""}`}
                        style={{ height: "20px" }}
                      />
                      {/* Key bit */}
                      <div className={`bit-node ${isActive ? "bit-node--active" : ""}`}>
                        {keyBit}
                      </div>
                      <span className="my-1 text-[0.55rem] uppercase tracking-wider text-[var(--ink-muted)]">
                        Key
                      </span>
                      {/* Vertical wire */}
                      <div
                        className={`xor-wire-v ${isActive ? "xor-wire-v--active" : ""}`}
                        style={{ height: "12px" }}
                      />
                      {/* XOR Gate */}
                      <div className={`xor-gate ${isActive ? "xor-gate--active" : ""}`}>XOR</div>
                      {/* Vertical wire */}
                      <div
                        className={`xor-wire-v ${isActive ? "xor-wire-v--active" : ""}`}
                        style={{ height: "12px" }}
                      />
                      {/* Output toggle */}
                      <div className={`rocker-toggle mt-1 ${isActive ? "rocker-toggle--active" : ""}`}>
                        <span
                          className={`rocker-toggle__pill ${
                            xorRecoverySelection[index] === ""
                              ? "rocker-toggle__pill--hidden"
                              : xorRecoverySelection[index] === "1"
                                ? "rocker-toggle__pill--right"
                                : ""
                          }`}
                        />
                        {["0", "1"].map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={`rocker-toggle__btn ${
                              xorRecoverySelection[index] === value
                                ? "rocker-toggle__btn--selected"
                                : "rocker-toggle__btn--unselected"
                            }`}
                            onClick={() => chooseBit(index, value, setXorRecoverySelection)}
                            role="radio"
                            aria-checked={xorRecoverySelection[index] === value}
                            aria-label={`Output ${value} for channel ${index + 1}: ${cipherBit} XOR ${keyBit}`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signal Recovery Meter */}
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                  Signal Recovery
                </span>
                <span className="font-mono text-xs text-[var(--ink-muted)]">
                  {recoveryFilledCount}/{recoveryTotalBits} channels
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--card-strong)]">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(recoveryFilledCount / recoveryTotalBits) * 100}%`,
                    background: "linear-gradient(90deg, var(--accent), var(--accent-strong))",
                  }}
                />
              </div>
              <div className="mt-3 flex items-center gap-3 rounded-xl bg-[var(--card-strong)] px-4 py-3">
                <span className="text-xs uppercase tracking-[0.2em] text-[var(--ink-muted)]">
                  Decrypted Signal
                </span>
                <div className="flex gap-2">
                  {xorRecoverySelection.map((bit, i) => (
                    <div
                      key={`led-recovery-${i}`}
                      className={`led-dot ${bit !== "" ? "led-dot--on" : ""}`}
                    >
                      {bit || "?"}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                {attempts >= 3 && !completedByLevel[currentLevelId] && (
                  <Button
                    variant="secondary"
                    onClick={handleSkipLevel}
                    className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
                  >
                    Show answer and continue
                  </Button>
                )}
                <Button
                  onClick={submitXorRecovery}
                  className="font-mono text-sm uppercase tracking-widest px-8"
                >
                  Decrypt Transmission
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] px-5 py-6 text-center">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--card)]">
              <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="8" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" className="text-[var(--ink-muted)]" />
                <path d="M4.5 8V5.5C4.5 3.567 6.067 2 8 2C9.933 2 11.5 3.567 11.5 5.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-[var(--ink-muted)]" />
              </svg>
            </div>
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--ink-muted)]">
              Phase 2 Locked
            </p>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Complete signal analysis to access the recovery channel
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderBlockCipherLevel() {
    return (
      <div className="space-y-8">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/75 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
            Data Nodes Bank
          </p>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Drag a cryptographic node below, or click to select, then click or drop it into an empty sequence socket to deploy it. Click a deployed node to return it to the bank.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4 sm:gap-6">
            {blockCipherLevel.choices.map((choice) => {
              const isSelected = selectedBlockChoice === choice.id;
              const isUsed = blockSelection.includes(choice.id);
              
              return (
                <div 
                  key={choice.id}
                  className={[
                    "relative transition-all duration-300",
                    isUsed ? "opacity-20 cursor-not-allowed scale-95" : "cursor-pointer hover:scale-105",
                    isSelected ? "z-10 scale-110 drop-shadow-[0_0_15px_rgba(56,189,248,0.5)]" : "drop-shadow-sm",
                  ].join(" ")}
                  style={{
                    width: "7rem",
                    height: "8rem",
                    filter: isUsed ? "grayscale(100%)" : "none"
                  }}
                >
                  <div
                    className={[
                      "absolute inset-0 transition-colors p-[2px]",
                      isSelected ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
                    ].join(" ")}
                    style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                  >
                    <button
                      draggable={!isUsed}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", choice.id);
                      }}
                      onClick={() => {
                        if (!isUsed) {
                          markInteraction();
                          setSelectedBlockChoice(isSelected ? null : choice.id);
                        }
                      }}
                      disabled={isUsed}
                      className={[
                        "flex h-full w-full flex-col items-center justify-center transition-colors",
                        isSelected 
                          ? "bg-[#2d7ff9]/20" 
                          : "bg-[var(--card-strong)] hover:bg-[var(--card-soft)]"
                      ].join(" ")}
                      style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                      type="button"
                    >
                      <span className={[
                        "font-mono text-xs font-bold tracking-wider text-center px-1",
                        isSelected || isUsed ? "text-[var(--accent-strong)]" : "text-[var(--ink)]"
                      ].join(" ")}>
                        {choice.label}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative rounded-[24px] border border-[var(--border)] bg-[var(--card-strong)] p-6">
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.28em] text-[var(--ink-muted)]">
            Encryption Sequence Sockets
          </p>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between relative">
            <div className="hidden sm:block absolute left-10 right-10 top-[4rem] h-[2px] bg-[var(--border-strong)] z-0" />
            
            {blockCipherLevel.slotLabels.map((slotLabel, index) => {
              const currentChoiceId = blockSelection[index];
              const choiceObj = currentChoiceId 
                ? blockCipherLevel.choices.find((c) => c.id === currentChoiceId) 
                : null;
                
              return (
                <div key={slotLabel} className="relative z-10 flex flex-1 flex-col items-center group">
                  <div className="mb-3 h-6 text-center">
                    <span className="font-mono text-[0.65rem] font-bold uppercase tracking-widest text-[var(--ink-muted)]">
                      {slotLabel.split(":")[0]}
                    </span>
                  </div>
                  
                  <div 
                    className={[
                      "relative transition-all duration-300",
                      selectedBlockChoice && !currentChoiceId ? "animate-pulse cursor-pointer hover:scale-105" : "",
                      currentChoiceId ? "cursor-pointer hover:scale-105" : ""
                    ].join(" ")}
                    style={{ width: "6rem", height: "7rem" }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedId = e.dataTransfer.getData("text/plain");
                      if (draggedId) {
                        markInteraction();
                        setBlockSelection((prev) => {
                          const next = [...prev];
                          const existingIndex = next.indexOf(draggedId);
                          if (existingIndex !== -1) next[existingIndex] = "";
                          next[index] = draggedId;
                          return next;
                        });
                        setSelectedBlockChoice(null);
                      }
                    }}
                  >
                    <div
                      className={[
                        "absolute inset-0 p-[2px] transition-colors",
                        currentChoiceId 
                          ? "bg-[var(--accent-strong)] drop-shadow-[0_0_10px_rgba(56,189,248,0.4)]" 
                          : selectedBlockChoice 
                            ? "bg-[#2d7ff9]/50" 
                            : "bg-[var(--border-strong)] opacity-50"
                      ].join(" ")}
                      style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                    >
                      <button
                        onClick={() => {
                          markInteraction();
                          if (selectedBlockChoice) {
                            setBlockSelection((prev) => {
                              const next = [...prev];
                              const existingIndex = next.indexOf(selectedBlockChoice);
                              if (existingIndex !== -1) next[existingIndex] = "";
                              next[index] = selectedBlockChoice;
                              return next;
                            });
                            setSelectedBlockChoice(null);
                          } else if (currentChoiceId) {
                            setBlockSelection((prev) => {
                              const next = [...prev];
                              next[index] = "";
                              return next;
                            });
                            setSelectedBlockChoice(currentChoiceId);
                          }
                        }}
                        className={[
                          "flex h-full w-full flex-col items-center justify-center transition-colors",
                          currentChoiceId 
                            ? "bg-[#2d7ff9]/20" 
                            : "bg-[var(--card)]"
                        ].join(" ")}
                        style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
                        type="button"
                      >
                        {choiceObj ? (
                          <span className="font-mono text-[0.65rem] font-bold tracking-wider text-[var(--ink)] drop-shadow-md text-center px-1">
                            {choiceObj.label}
                          </span>
                        ) : (
                          <span className="text-xl text-[var(--ink-muted)] opacity-30">+</span>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 text-center px-1 flex-1">
                    <p className="text-[0.65rem] leading-snug text-[var(--ink-muted)]">
                      {choiceObj?.helper || "Empty Socket"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {blockFeedback.length > 0 ? (
          <div className="rounded-[24px] border border-amber-500/30 bg-amber-500/12 p-5">
            <p className="text-sm font-semibold text-amber-100">System Error Detected</p>
            <ul className="mt-3 space-y-2 text-sm text-amber-100 font-mono">
              {blockFeedback.map((message) => (
                <li key={message} className="flex items-start gap-2">
                  <span className="mt-0.5 opacity-70">&gt;</span>
                  <span>{message}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        
        <div className="flex justify-end gap-3 pt-2">
          {attempts >= 3 && !completedByLevel[currentLevelId] && (
            <Button
              variant="secondary"
              onClick={handleSkipLevel}
              className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
            >
              Show answer and continue
            </Button>
          )}
          <Button onClick={submitBlockSequence} className="font-mono uppercase tracking-widest text-sm px-8">
            Deploy Sequence
          </Button>
        </div>
      </div>
    );
  }

  const revealedHints = currentLevel.hints.slice(0, revealedHintCount);

  return (
    <div className="mx-auto grid w-full max-w-[98rem] gap-4 lg:max-h-[calc(100vh-10.5rem)] lg:grid-cols-[16rem_minmax(0,1fr)_20rem] lg:items-start">
      {toast ? (
        <div className="pointer-events-none fixed right-4 top-4 z-50 w-[min(26rem,calc(100vw-2rem))]">
          <div
            className={[
              "rounded-2xl border px-4 py-3 text-sm shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur",
              toast.tone === "error"
                ? "border-amber-500/35 bg-amber-500/16 text-amber-50"
                : "border-sky-500/35 bg-sky-500/16 text-sky-50",
            ].join(" ")}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      {showIntro ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <Card className="mx-4 max-w-md p-6 text-center sm:p-8">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
              Welcome, Agent
            </p>
            <h2 className="mt-3 text-2xl font-bold text-[var(--ink)]">
              Mission Briefing
            </h2>
            <div className="mt-5 space-y-3 text-left text-sm leading-6 text-[var(--ink-muted)]">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[0.6rem] font-bold text-[var(--accent-strong)]">
                  L
                </span>
                <span>Your <strong className="text-[var(--ink)]">mission briefing</strong> is on the left.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[0.6rem] font-bold text-[var(--accent-strong)]">
                  C
                </span>
                <span>Solve each <strong className="text-[var(--ink)]">puzzle</strong> in the center.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[0.6rem] font-bold text-[var(--accent-strong)]">
                  R
                </span>
                <span><strong className="text-[var(--ink)]">Hints</strong> and <strong className="text-[var(--ink)]">intel</strong> unlock on the right as you work.</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-[var(--ink-muted)]">
              You&apos;ll tackle 3 levels. Good luck.
            </p>
            <Button
              onClick={() => setShowIntro(false)}
              className="mt-6 w-full font-mono text-sm uppercase tracking-widest"
            >
              Begin Mission
            </Button>
          </Card>
        </div>
      ) : null}

      {/* ── Left Sidebar: Mission + Stats ── */}
      <div className="space-y-4 lg:h-[calc(100vh-10.5rem)] lg:overflow-auto lg:pr-1">
        <Card className="p-5">
          <div className="space-y-3">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
              Mission
            </p>
            <h2 className="text-xl font-bold text-[var(--ink)] sm:text-2xl">
              {currentLevel.title}
            </h2>
            <p className="text-sm font-medium leading-6 text-[var(--ink-muted)]">
              {currentLevel.mission}
            </p>
          </div>
        </Card>
        <Card className="p-4">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--ink-muted)]">Level</span>
              <strong className="font-mono text-lg text-[var(--ink)]">
                {currentLevelIndex + 1} / {levelOrder.length}
              </strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--ink-muted)]">Attempts</span>
              <strong className="font-mono text-lg text-[var(--ink)]">{attempts}</strong>
            </div>
          </div>
        </Card>
        {statusMessage ? (
          <Card
            className={[
              "p-4",
              statusTone === "success"
                ? "border-emerald-500/30 bg-emerald-500/12"
                : statusTone === "error"
                  ? "border-red-400/30 bg-red-400/12"
                  : "border-sky-500/30 bg-sky-500/12",
            ].join(" ")}
          >
            <p
              className={[
                "text-sm font-semibold leading-6",
                statusTone === "success"
                  ? "text-emerald-100"
                  : statusTone === "error"
                    ? "text-red-100"
                    : "text-sky-100",
              ].join(" ")}
            >
              {statusMessage}
            </p>
          </Card>
        ) : null}
      </div>

      {/* ── Center: Game Area ── */}
      <Card className="p-5 sm:p-6 lg:h-[calc(100vh-10.5rem)] lg:min-h-0">
        <div className="space-y-5 lg:flex lg:h-full lg:flex-col lg:space-y-4">
          <div className="lg:min-h-0 lg:flex-1 lg:overflow-auto lg:pr-1">
            {currentLevelId === "caesar-cipher"
              ? renderCaesarLevel()
              : currentLevelId === "xor-stream"
                ? renderXorLevel()
                : renderBlockCipherLevel()}
          </div>

          {completedByLevel[currentLevelId] ? (
            <div className="flex justify-end">
              {readyForPosttest ? (
                <Button onClick={() => onComplete(Array.from(skippedLevels))}>Continue to post-test</Button>
              ) : (
                <Button onClick={() => continueAfterLevel(currentLevelId)}>
                  Continue to next level
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </Card>

      {/* ── Right Sidebar: Hints + Codex ── */}
      <div className="space-y-4 lg:h-[calc(100vh-10.5rem)] lg:overflow-auto lg:pr-1">
        <Card className={`p-5 lg:p-6 ${hintCardGlow ? "hint-card-glow" : ""}`}>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">
                  Hints
                </p>
                {unlockedHintCount > revealedHintCount ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent-strong)]" />
                  </span>
                ) : null}
              </div>
              <p className="text-sm font-medium leading-6 text-[var(--ink-muted)]">
                Stuck? Hints unlock automatically as you work. Keep trying or wait 30 seconds.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleRevealHint}
              disabled={revealedHintCount >= unlockedHintCount}
              fullWidth
            >
              {unlockedHintCount === 0
                ? "No hints yet"
                : revealedHintCount < unlockedHintCount
                  ? `New hint available!`
                  : "All hints opened"}
            </Button>
            {revealedHints.length > 0 ? (
              <div className="space-y-3">
                {revealedHints.map((hint, index) => (
                  <div
                    key={hint}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card-strong)] px-4 py-3 text-base font-medium leading-7 text-[var(--ink)]"
                  >
                    <span className="font-bold text-[var(--accent-strong)]">Hint {index + 1}.</span>{" "}
                    {hint}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] px-4 py-3 text-sm font-medium leading-6 text-[var(--ink-muted)]">
                Keep working on the puzzle — hints will appear here.
              </div>
            )}
          </div>
        </Card>

        <CodexPanel
          activeEntryId={activeCodexEntry}
          isOpen={codexOpen}
          onSelectEntry={handleCodexEntrySelect}
          onToggle={handleCodexToggle}
          unlockedEntries={unlockedCodexEntries}
        />
      </div>
    </div>
  );
}
