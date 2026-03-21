"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  hexToAscii,
  isHexString,
  normalizeHex,
  xorHexStrings,
} from "@/modules/game/logic";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import type { CodexEntryId, LevelId } from "@/types/study";

interface GameplayExperienceProps {
  onComplete: () => void;
  participantId: string;
  sessionId: string;
}

const taskIds: Record<LevelId, string> = {
  "caesar-cipher": "shift-control",
  "xor-stream": "mask-hex",
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

export function GameplayExperience({
  onComplete,
  participantId,
  sessionId,
}: GameplayExperienceProps) {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [caesarShift, setCaesarShift] = useState(0);
  const [caesarShiftChanges, setCaesarShiftChanges] = useState(0);
  const [xorMaskInput, setXorMaskInput] = useState("");
  const [blockSelection, setBlockSelection] = useState<string[]>(["", "", "", ""]);
  const [attemptsByLevel, setAttemptsByLevel] = useState(buildLevelCounterState(0));
  const [unlockedHintsByLevel, setUnlockedHintsByLevel] = useState(buildLevelCounterState(0));
  const [revealedHintsByLevel, setRevealedHintsByLevel] = useState(buildLevelCounterState(0));
  const [completedByLevel, setCompletedByLevel] = useState(buildLevelBooleanState(false));
  const [unlockedCodexEntries, setUnlockedCodexEntries] = useState<CodexEntryId[]>([]);
  const [codexOpen, setCodexOpen] = useState(false);
  const [activeCodexEntry, setActiveCodexEntry] =
    useState<CodexEntryId>("caesar-cipher");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [blockFeedback, setBlockFeedback] = useState<string[]>([]);
  const [readyForPosttest, setReadyForPosttest] = useState(false);
  const levelStartTimesRef = useRef<Record<LevelId, number>>({
    "caesar-cipher": 0,
    "xor-stream": 0,
    "block-cipher": 0,
  });
  const lastInteractionRef = useRef(0);
  const startedLevelsRef = useRef<Set<LevelId>>(new Set());

  const currentLevel = gameplayLevels[currentLevelIndex];
  const currentLevelId = currentLevel.id;
  const attempts = attemptsByLevel[currentLevelId];
  const unlockedHintCount = unlockedHintsByLevel[currentLevelId];
  const revealedHintCount = revealedHintsByLevel[currentLevelId];

  const caesarPreview = useMemo(
    () => decryptCaesar(caesarLevel.ciphertext, caesarShift),
    [caesarShift],
  );
  const normalizedXorInput = normalizeHex(xorMaskInput);
  const xorPlaintextHex =
    isHexString(normalizedXorInput) &&
    normalizedXorInput.length === xorLevel.ciphertextHex.length
      ? xorHexStrings(xorLevel.ciphertextHex, normalizedXorInput)
      : null;
  const xorPreview = xorPlaintextHex ? hexToAscii(xorPlaintextHex) : "";

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

  function submitXorGuess() {
    markInteraction();
    const attemptNo = getNextAttempt("xor-stream");
    const normalizedInput = normalizeHex(xorMaskInput);

    if (!isHexString(normalizedInput)) {
      logAttempt("xor-stream", attemptNo, "malformed-hex");
      setStatusMessage("The stream mask must be valid hex with complete byte pairs.");
      handleFailedAttempt("xor-stream", attemptNo, "malformed-hex");
      return;
    }

    if (normalizedInput.length !== xorLevel.ciphertextHex.length) {
      logAttempt("xor-stream", attemptNo, "unequal-length");
      setStatusMessage("The stream mask must be the same hex length as the ciphertext.");
      handleFailedAttempt("xor-stream", attemptNo, "unequal-length");
      return;
    }

    const isCorrect = normalizedInput === xorLevel.targetMaskHex;
    logAttempt("xor-stream", attemptNo, isCorrect ? "correct-mask" : "wrong-mask");

    if (!isCorrect) {
      setStatusMessage("The mask is valid hex, but it does not reveal the expected plaintext.");
      handleFailedAttempt("xor-stream", attemptNo, "wrong-mask");
      return;
    }

    handleSuccessfulAttempt("xor-stream", attemptNo, "correct-mask");
    unlockCodex("xor-stream");
    setStatusMessage("XOR level cleared. The Codex entry for XOR and stream ciphers is now unlocked.");
  }

  function submitBlockSequence() {
    markInteraction();
    const attemptNo = getNextAttempt("block-cipher");
    const evaluation = evaluateBlockSequence(blockSelection);
    logAttempt("block-cipher", attemptNo, evaluation.correct ? "correct-sequence" : "wrong-sequence");

    if (!evaluation.correct) {
      setBlockFeedback(evaluation.feedback);
      setStatusMessage("The sequence is still off. Use the feedback to separate the IV step from the key step.");
      handleFailedAttempt("block-cipher", attemptNo, "wrong-sequence");
      return;
    }

    setBlockFeedback([]);
    handleSuccessfulAttempt("block-cipher", attemptNo, "correct-sequence");
    unlockCodex("block-cipher");
    setStatusMessage("Block-cipher level cleared. The final Codex entry is unlocked.");
  }

  function renderCaesarLevel() {
    return (
      <div className="space-y-5">
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/75 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
            Intercepted text
          </p>
          <p className="mt-3 break-words font-mono text-xl tracking-[0.2em] text-[var(--ink)]">
            {caesarLevel.ciphertext}
          </p>
        </div>
        <div className="rounded-[24px] border border-[var(--border)] bg-white/90 p-5">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--ink)]">Choose the shift</span>
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
          <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white px-4 py-4">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
              Live plaintext preview
            </p>
            <p className="mt-2 break-words font-mono text-lg text-[var(--ink)]">
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/75 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
              Ciphertext (hex)
            </p>
            <p className="mt-3 break-all font-mono text-xl text-[var(--ink)]">
              {xorLevel.ciphertextHex}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/75 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">
              Stream mask clue
            </p>
            <p className="mt-3 text-lg text-[var(--ink)]">
              Convert the text
              {" "}
              <span className="font-mono">{xorLevel.maskTextClue}</span>
              {" "}
              into hex first.
            </p>
          </div>
        </div>
        <label className="block rounded-[24px] border border-[var(--border)] bg-white/90 p-5">
          <span className="text-sm font-semibold text-[var(--ink)]">
            Enter the stream mask as hex
          </span>
          <input
            value={xorMaskInput}
            onChange={(event) => {
              markInteraction();
              setXorMaskInput(event.target.value);
            }}
            className="mt-4 w-full rounded-2xl border border-[var(--border-strong)] bg-white px-4 py-3 font-mono outline-none transition focus:border-[var(--accent-strong)]"
            placeholder="Example: 4d41534b3432"
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[var(--card)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                Input status
              </p>
              <p className="mt-2 text-sm text-[var(--ink)]">
                {!normalizedXorInput
                  ? "Waiting for input."
                  : !isHexString(normalizedXorInput)
                    ? "Malformed hex."
                    : normalizedXorInput.length !== xorLevel.ciphertextHex.length
                      ? "Hex is valid, but lengths do not match."
                      : "Hex is valid and aligned."}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--card)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--ink-muted)]">
                Preview plaintext
              </p>
              <p className="mt-2 font-mono text-lg text-[var(--ink)]">
                {xorPreview || "--"}
              </p>
            </div>
          </div>
        </label>
        <div className="flex justify-end">
          <Button onClick={submitXorGuess}>Submit mask</Button>
        </div>
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
              <p className="text-sm font-semibold text-[var(--ink)]">{choice.label}</p>
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
              className="block rounded-[24px] border border-[var(--border)] bg-white/90 p-5"
            >
              <span className="text-sm font-semibold text-[var(--ink)]">{slotLabel}</span>
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
                className="mt-4 w-full rounded-2xl border border-[var(--border-strong)] bg-white px-4 py-3 outline-none transition focus:border-[var(--accent-strong)]"
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
          <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-900">Pipeline feedback</p>
            <ul className="mt-3 space-y-2 text-sm text-amber-900">
              {blockFeedback.map((message) => (
                <li key={message} className="rounded-2xl bg-white/75 px-3 py-2">
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
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className="p-8">
        <div className="space-y-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
                Gameplay
              </p>
              <h2 className="text-2xl font-semibold text-[var(--ink)]">
                {currentLevel.title}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-[var(--ink-muted)]">
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
            <div className="rounded-[24px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              {statusMessage}
            </div>
          ) : null}

          {currentLevelId === "caesar-cipher"
            ? renderCaesarLevel()
            : currentLevelId === "xor-stream"
              ? renderXorLevel()
              : renderBlockCipherLevel()}

          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/80 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">Hints</p>
                <p className="mt-1 text-sm text-[var(--ink-muted)]">
                  Hints unlock after repeated failed attempts or 30 seconds of inactivity.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={handleRevealHint}
                disabled={revealedHintCount >= unlockedHintCount}
              >
                {unlockedHintCount === 0
                  ? "No hint unlocked yet"
                  : revealedHintCount < unlockedHintCount
                    ? "Open next hint"
                    : "All unlocked hints opened"}
              </Button>
            </div>
            {revealedHints.length > 0 ? (
              <div className="mt-4 space-y-3">
                {revealedHints.map((hint, index) => (
                  <div
                    key={hint}
                    className="rounded-2xl border border-white/60 bg-white px-4 py-3 text-sm text-[var(--ink-muted)]"
                  >
                    <span className="font-semibold text-[var(--ink)]">Hint {index + 1}.</span>{" "}
                    {hint}
                  </div>
                ))}
              </div>
            ) : null}
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

      <CodexPanel
        activeEntryId={activeCodexEntry}
        isOpen={codexOpen}
        onSelectEntry={handleCodexEntrySelect}
        onToggle={handleCodexToggle}
        unlockedEntries={unlockedCodexEntries}
      />
    </div>
  );
}
