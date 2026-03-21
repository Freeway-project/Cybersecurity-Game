"use client";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";

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
  onComplete: () => void;
  participantId: string;
  sessionId: string;
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
  const [attemptsByLevel, setAttemptsByLevel] = useState(buildLevelCounterState(0));
  const [unlockedHintsByLevel, setUnlockedHintsByLevel] = useState(buildLevelCounterState(0));
  const [revealedHintsByLevel, setRevealedHintsByLevel] = useState(buildLevelCounterState(0));
  const [completedByLevel, setCompletedByLevel] = useState(buildLevelBooleanState(false));
  const [unlockedCodexEntries, setUnlockedCodexEntries] = useState<CodexEntryId[]>([]);
  const [codexOpen, setCodexOpen] = useState(false);
  const [activeCodexEntry, setActiveCodexEntry] =
    useState<CodexEntryId>("caesar-cipher");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [blockFeedback, setBlockFeedback] = useState<string[]>([]);
  const [readyForPosttest, setReadyForPosttest] = useState(false);
  const levelStartTimesRef = useRef<Record<LevelId, number>>({
    "caesar-cipher": 0,
    "xor-stream": 0,
    "block-cipher": 0,
  });
  const lastInteractionRef = useRef(0);
  const startedLevelsRef = useRef<Set<LevelId>>(new Set());
  const xorStepTwoRef = useRef<HTMLDivElement | null>(null);

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

  function handleSuccessfulAttempt(
    levelId: LevelId,
    attemptNo: number,
    result: string,
    metadata?: Record<string, unknown>,
  ) {
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
      setStatusMessage(
        "All three levels are complete. Review any unlocked Codex entries, then continue to the post-test.",
      );
      return;
    }

    setCurrentLevelIndex((previous) => previous + 1);
    setStatusMessage(null);
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
      setStatusMessage("Finish each XOR output before checking the rule.");
      showToast("Finish every output bit before checking Step 1.");
      handleFailedAttempt("xor-stream", attemptNo, "rule-incomplete");
      return;
    }

    const isCorrect = xorRuleAnswer === expectedRule;
    logAttempt("xor-stream", attemptNo, isCorrect ? "rule-correct" : "rule-wrong");

    if (!isCorrect) {
      setStatusMessage("Close. Same bits give 0, and different bits give 1.");
      showToast("Not quite. Same bits give 0 and different bits give 1.");
      handleFailedAttempt("xor-stream", attemptNo, "rule-wrong");
      return;
    }

    setXorRuleSolved(true);
    handleIntermediateSuccess("xor-stream", attemptNo, "rule-correct", {
      stage: "rule-board",
      outputs: xorRuleAnswer,
    });
    setStatusMessage(
      "Step 1 complete. Scroll down to Step 2 and recover the briefing by choosing the output bits.",
    );
  }

  function submitXorRecovery() {
    markInteraction();
    const attemptNo = getNextAttempt("xor-stream");

    if (xorRecoverySelection.some((value) => value === "")) {
      logAttempt("xor-stream", attemptNo, "recovery-incomplete");
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
      setStatusMessage("The signal is still scrambled. Work across the columns one bit at a time.");
      showToast("Wrong recovery. Compare each pair of bits one column at a time.");
      handleFailedAttempt("xor-stream", attemptNo, "recovery-wrong");
      return;
    }

    handleSuccessfulAttempt("xor-stream", attemptNo, "recovery-correct", {
      stage: "signal-recovery",
      recoveredBits: xorRecoveryPreview,
    });
    unlockCodex("xor-stream");
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
      setStatusMessage("The setup is still off. Use the feedback to keep the key separate from the IV.");
      showToast("Wrong order. The key is the secret and the IV is only the starter value.");
      handleFailedAttempt("block-cipher", attemptNo, "wrong-sequence");
      return;
    }

    setBlockFeedback([]);
    handleSuccessfulAttempt("block-cipher", attemptNo, "correct-sequence");
    unlockCodex("block-cipher");
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
          <label className="block">
            <span className="text-base font-semibold text-[var(--ink)]">Choose the shift</span>
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
              className="mt-4 w-full"
            />
          </label>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--card)] px-4 py-3">
            <span className="text-sm text-[var(--ink-muted)]">Current shift</span>
            <span className="font-mono text-lg text-[var(--ink)]">{caesarShift}</span>
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
        <div className="flex justify-end">
          <Button onClick={submitCaesarGuess}>Submit shift</Button>
        </div>
      </div>
    );
  }

  function renderXorLevel() {
    return (
      <div className="space-y-5">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/75 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
            Step 1
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">
            Rebuild the XOR rule
          </h3>
          <p className="mt-2 text-base leading-7 text-[var(--ink-muted)]">
            Same bits produce 0. Different bits produce 1. Choose the output for each signal pair.
          </p>
        </div>

        <div className="space-y-3 rounded-[24px] border border-[var(--border)] bg-[var(--card-strong)] p-5">
          {xorLevel.rulePairs.map((pair, index) => (
            <div
              key={`${pair.left}-${pair.right}-${index}`}
              className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)]/55 px-4 py-4 md:grid-cols-[1fr_1fr_auto_1fr]"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                  Signal A
                </p>
                <p className="mt-2 font-mono text-2xl text-[var(--ink)]">{pair.left}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                  Key signal
                </p>
                <p className="mt-2 font-mono text-2xl text-[var(--ink)]">{pair.right}</p>
              </div>
              <div className="hidden items-center justify-center text-sm font-semibold text-[var(--ink-muted)] md:flex">
                XOR
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                  Output
                </p>
                <div className="mt-2 flex gap-2">
                  {["0", "1"].map((value) => (
                    <Button
                      key={value}
                      variant={xorRuleSelection[index] === value ? "primary" : "secondary"}
                      onClick={() => chooseBit(index, value, setXorRuleSelection)}
                      className="min-w-14 px-5 py-3 font-mono text-lg"
                    >
                      {value}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-2xl bg-[var(--card)] px-4 py-3 text-sm text-[var(--ink-muted)]">
              Current outputs:
              {" "}
              <span className="font-mono text-base text-[var(--ink)]">
                {xorRuleAnswer || "----"}
              </span>
            </div>
            <Button onClick={submitXorRuleBoard}>Check XOR rule</Button>
          </div>
        </div>

        {xorRuleSolved ? (
          <div ref={xorStepTwoRef} className="space-y-5">
            <div className="rounded-[24px] border border-[var(--accent-strong)]/35 bg-[var(--accent)]/14 px-5 py-4 text-sm text-sky-100">
              Step 1 is complete. Step 2 is now unlocked below. Use the scrambled signal and key signal to choose the recovered bits.
            </div>
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/75 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
                Step 2
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-[var(--ink)]">
                Recover the briefing
              </h3>
              <p className="mt-2 text-base leading-7 text-[var(--ink-muted)]">
                Apply the same XOR rule to every column. Use the scrambled signal and the key signal to restore the original bits.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-strong)] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                  Scrambled signal
                </p>
                <p className="mt-3 font-mono text-[1.8rem] tracking-[0.35em] text-[var(--ink)]">
                  {xorLevel.recoveryCipherBits}
                </p>
              </div>
              <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-strong)] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                  Key signal
                </p>
                <p className="mt-3 font-mono text-[1.8rem] tracking-[0.35em] text-[var(--ink)]">
                  {xorLevel.recoveryKeyBits}
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-strong)] p-5">
              <p className="text-base font-semibold text-[var(--ink)]">
                Choose the recovered output bits
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {xorLevel.recoveryCipherBits.split("").map((cipherBit, index) => (
                  <div
                    key={`${cipherBit}-${xorLevel.recoveryKeyBits[index]}-${index}`}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/55 px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                      Column {index + 1}
                    </p>
                    <p className="mt-2 font-mono text-xl text-[var(--ink)]">
                      {cipherBit} XOR {xorLevel.recoveryKeyBits[index]}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {["0", "1"].map((value) => (
                        <Button
                          key={value}
                          variant={
                            xorRecoverySelection[index] === value ? "primary" : "secondary"
                          }
                          onClick={() => chooseBit(index, value, setXorRecoverySelection)}
                          className="min-w-14 px-5 py-3 font-mono text-lg"
                        >
                          {value}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="rounded-2xl bg-[var(--card)] px-4 py-3 text-sm text-[var(--ink-muted)]">
                  Recovered signal:
                  {" "}
                  <span className="font-mono text-base text-[var(--ink)]">
                    {xorRecoveryPreview || "----"}
                  </span>
                </div>
                <Button onClick={submitXorRecovery}>Recover briefing</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] px-5 py-4 text-sm text-[var(--ink-muted)]">
            Step 2 unlocks after you solve the XOR rule board.
          </div>
        )}
      </div>
    );
  }

  function renderBlockCipherLevel() {
    return (
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {blockCipherLevel.choices.map((choice) => (
            <div
              key={choice.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/75 p-4"
            >
              <p className="text-base font-semibold text-[var(--ink)]">{choice.label}</p>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-muted)]">
                {choice.helper}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {blockCipherLevel.slotLabels.map((slotLabel, index) => (
            <label
              key={slotLabel}
              className="block rounded-[24px] border border-[var(--border)] bg-[var(--card-strong)] p-5"
            >
              <span className="text-base font-semibold text-[var(--ink)]">{slotLabel}</span>
              <select
                value={blockSelection[index]}
                onChange={(event) => {
                  markInteraction();
                  setBlockSelection((previous) =>
                    previous.map((value, itemIndex) =>
                      itemIndex === index ? event.target.value : value,
                    ),
                  );
                }}
                className="mt-4 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--card-soft)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
              >
                <option value="">Choose a stage</option>
                {blockCipherLevel.choices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {blockFeedback.length > 0 ? (
          <div className="rounded-[24px] border border-amber-500/30 bg-amber-500/12 p-5">
            <p className="text-sm font-semibold text-amber-100">Pipeline feedback</p>
            <ul className="mt-3 space-y-2 text-sm text-amber-100">
              {blockFeedback.map((message) => (
                <li key={message} className="rounded-2xl bg-[var(--card-strong)] px-3 py-2">
                  {message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="flex justify-end">
          <Button onClick={submitBlockSequence}>Submit sequence</Button>
        </div>
      </div>
    );
  }

  const revealedHints = currentLevel.hints.slice(0, revealedHintCount);

  return (
    <div className="mx-auto grid w-full max-w-[92rem] gap-4 lg:max-h-[calc(100vh-10.5rem)] lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
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
      <Card className="p-5 sm:p-6 lg:h-[calc(100vh-10.5rem)] lg:min-h-0">
        <div className="space-y-5 lg:flex lg:h-full lg:flex-col lg:space-y-4">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
                Mission
              </p>
              <h2 className="text-2xl font-semibold text-[var(--ink)] sm:text-[1.9rem]">
                {currentLevel.title}
              </h2>
              <p className="max-w-2xl text-base leading-7 text-[var(--ink-muted)]">
                {currentLevel.mission}
              </p>
            </div>
            <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/75 px-4 py-4 text-sm text-[var(--ink-muted)]">
              <div className="flex items-center justify-between gap-8">
                <span>Level</span>
                <strong className="text-[var(--ink)]">
                  {currentLevelIndex + 1} / {levelOrder.length}
                </strong>
              </div>
              <div className="mt-2 flex items-center justify-between gap-8">
                <span>Attempts</span>
                <strong className="text-[var(--ink)]">{attempts}</strong>
              </div>
            </div>
          </div>

          {statusMessage ? (
            <div className="rounded-[24px] border border-sky-500/30 bg-sky-500/12 px-4 py-3 text-sm text-sky-100">
              {statusMessage}
            </div>
          ) : null}

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
                <Button onClick={onComplete}>Continue to post-test</Button>
              ) : (
                <Button onClick={() => continueAfterLevel(currentLevelId)}>
                  Continue to next level
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </Card>

      <div className="space-y-4 lg:h-[calc(100vh-10.5rem)] lg:overflow-auto lg:pr-1">
        <Card className="p-5 lg:p-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="font-mono text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent-strong)]">
                Hints
              </p>
              <p className="text-base font-medium leading-7 text-[var(--ink)]">
                Unlock after repeated failed attempts or 30 seconds of inactivity.
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={handleRevealHint}
              disabled={revealedHintCount >= unlockedHintCount}
              fullWidth
            >
              {unlockedHintCount === 0
                ? "No hint yet"
                : revealedHintCount < unlockedHintCount
                  ? "Open next hint"
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
              <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card-soft)] px-4 py-3 text-base font-medium leading-7 text-[var(--ink)]">
                Keep testing the puzzle to unlock help.
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
