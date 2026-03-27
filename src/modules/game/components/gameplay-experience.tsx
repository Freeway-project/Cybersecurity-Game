"use client";

import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import { type Dispatch, type SetStateAction, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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

type StatusTone = "info" | "error" | "success";
type WaveformState = "active" | "error" | "success";

const taskIds: Record<LevelId, string> = {
  "caesar-cipher": "shift-control",
  "xor-stream": "signal-repair",
  "block-cipher": "role-sequence",
};

const bootSequenceLines = [
  "SIGINT STATION // BOOT SEQUENCE INITIATED",
  "",
  "> LOADING SIGNAL ANALYSIS SUITE.............. OK",
  "> CONNECTING TO INTERCEPT ARRAY.............. OK",
  "> AUTHENTICATING ANALYST: CIPHER............. OK",
  "> TRANSMISSION QUEUE: 3 INTERCEPTS PENDING",
  "",
  "// BRIEFING:",
  "// An unknown network has been transmitting on monitored frequencies.",
  "// Three transmissions have been intercepted but remain encoded.",
  "// Your task: decode each transmission and log its contents.",
  "// Method: unknown. Work from what you have.",
];

const transitionBeats: Record<
  Exclude<LevelId, "block-cipher">,
  {
    lines: string[];
    action: string;
  }
> = {
  "caesar-cipher": {
    lines: [
      "// ALPHA CHANNEL SECURED",
      "// NEW INTERCEPT DETECTED -- BRAVO CHANNEL",
      "// SIGNAL TYPE: UNKNOWN BITWISE ENCODING",
      "// ANALYSIS REQUIRED",
    ],
    action: "// [PRESS ENTER TO OPEN BRAVO CHANNEL]",
  },
  "xor-stream": {
    lines: [
      "// BRAVO CHANNEL CLEARED",
      "// FINAL TRANSMISSION INCOMING -- CHARLIE CHANNEL",
      "// ADVERSARY HAS UPGRADED ENCRYPTION",
      "// SECURE RESPONSE PROTOCOL REQUIRED",
    ],
    action: "// [PRESS ENTER TO OPEN CHARLIE CHANNEL]",
  },
};

const alphaIntercepts = [
  {
    id: "alpha-primary",
    label: "ALPHA CHANNEL",
    receivedAt: "03:42:17 UTC",
    ciphertext: caesarLevel.ciphertext,
  },
  {
    id: "alpha-aux-1",
    label: "AUXILIARY INTERCEPT 1",
    receivedAt: "03:42:54 UTC",
    ciphertext: "UHQGHCYRXV FRQILUPHG",
  },
  {
    id: "alpha-aux-2",
    label: "AUXILIARY INTERCEPT 2",
    receivedAt: "03:43:26 UTC",
    ciphertext: "FRQWDFW ZDLWLQJ HDVW",
  },
] as const;

const levelReadyStatuses: Record<LevelId, string> = {
  "caesar-cipher": "// ALPHA CHANNEL OPEN -- SWEEP FOR A LEGIBLE TRANSMISSION",
  "xor-stream": "// BRAVO CHANNEL OPEN -- CALIBRATE THE DECODE RULE",
  "block-cipher": "// CHARLIE CHANNEL OPEN -- CONFIGURE A SECURE RESPONSE",
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

function formatBlockSequence(selection: string[]) {
  return selection
    .map((choice) => choice || "empty")
    .join(" > ");
}

function StatusWaveform({ state }: { state: WaveformState }) {
  const path =
    state === "success"
      ? "M4 20 L14 20 L22 10 L30 30 L38 12 L46 26 L56 20"
      : state === "error"
        ? "M4 20 L56 20"
        : "M4 20 L12 16 L18 24 L26 12 L34 28 L42 16 L50 22 L56 20";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 60 40"
      className="h-10 w-24 shrink-0"
      fill="none"
    >
      <path
        d={path}
        className={[
          "waveform-path",
          state === "success"
            ? "waveform-path--success"
            : state === "error"
              ? "waveform-path--error"
              : "waveform-path--active",
        ].join(" ")}
      />
    </svg>
  );
}

function PlaintextIcon({ size = 18, color = "#d4a843" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="4" y="3" width="20" height="22" rx="2" stroke={color} strokeWidth="1.8" />
      <line x1="8" y1="9" x2="20" y2="9" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="13" x2="18" y2="13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="17" x2="16" y2="17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IvIcon({ size = 18, color = "#d4a843" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="9" stroke={color} strokeWidth="1.8" strokeDasharray="3 2" />
      <circle cx="14" cy="14" r="4" fill={color} opacity="0.35" />
      <path d="M14 5V2M14 26V23M5 14H2M26 14H23" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KeyIcon({ size = 18, color = "#d4a843" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <circle cx="10" cy="12" r="5" stroke={color} strokeWidth="1.8" />
      <line x1="15" y1="12" x2="25" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="22" y1="12" x2="22" y2="16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <line x1="19" y1="12" x2="19" y2="15" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EncryptIcon({ size = 18, color = "#d4a843" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="6" y="6" width="16" height="16" rx="3" stroke={color} strokeWidth="1.8" />
      <path d="M11 14L13 16L17 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14" cy="4" r="2" fill={color} opacity="0.45" />
      <circle cx="14" cy="24" r="2" fill={color} opacity="0.45" />
      <circle cx="4" cy="14" r="2" fill={color} opacity="0.45" />
      <circle cx="24" cy="14" r="2" fill={color} opacity="0.45" />
    </svg>
  );
}

function CiphertextIcon({ size = 18, color = "#d4a843" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect x="3" y="6" width="22" height="16" rx="2" stroke={color} strokeWidth="1.8" />
      <path d="M7 12L10 15L7 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="13" y1="18" x2="21" y2="18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="13" y="10" width="4" height="4" rx="1" fill={color} opacity="0.35" />
      <rect x="19" y="10" width="3" height="4" rx="1" fill={color} opacity="0.22" />
    </svg>
  );
}

const blockIconComponents = {
  plaintext: PlaintextIcon,
  iv: IvIcon,
  key: KeyIcon,
  encrypt: EncryptIcon,
  ciphertext: CiphertextIcon,
} as const;

function BlockStationShape({
  type,
  active,
  index,
}: {
  type: "hopper" | "mixer" | "lock" | "processor" | "tank";
  active: "empty" | "selected" | "placed";
  index: number;
}) {
  const stroke =
    active === "placed" ? "#4ade80" : active === "selected" ? "#f2c96a" : "#1a2840";
  const fill =
    active === "placed" ? "#0f1c18" : active === "selected" ? "#10192a" : "#09111c";

  if (type === "hopper") {
    return (
      <svg viewBox="0 0 80 70" className="h-14 w-18" fill="none">
        <path d="M15 12 H65 L54 32 L48 56 H32 L26 32 Z" stroke={stroke} strokeWidth="2" fill={fill} />
        <text x="40" y="39" textAnchor="middle" fill={stroke} fontSize="10" fontFamily="IBM Plex Mono, monospace">
          {index + 1}
        </text>
      </svg>
    );
  }

  if (type === "mixer") {
    return (
      <svg viewBox="0 0 80 70" className="h-14 w-18" fill="none">
        <ellipse cx="40" cy="16" rx="22" ry="7" stroke={stroke} strokeWidth="2" fill={fill} />
        <path d="M18 16 V50 C18 55 28 59 40 59 C52 59 62 55 62 50 V16" stroke={stroke} strokeWidth="2" fill={fill} />
        <path d="M40 24 V46 M33 30 L47 38 M47 30 L33 38" stroke={stroke} strokeWidth="1.5" opacity="0.6" />
        <text x="40" y="42" textAnchor="middle" fill={stroke} fontSize="10" fontFamily="IBM Plex Mono, monospace">
          {index + 1}
        </text>
      </svg>
    );
  }

  if (type === "lock") {
    return (
      <svg viewBox="0 0 80 70" className="h-14 w-18" fill="none">
        <rect x="18" y="22" width="44" height="36" rx="5" stroke={stroke} strokeWidth="2" fill={fill} />
        <path d="M30 22 V14 C30 8 34 5 40 5 C46 5 50 8 50 14 V22" stroke={stroke} strokeWidth="2" />
        <circle cx="40" cy="38" r="4" stroke={stroke} strokeWidth="1.5" fill="none" />
        <line x1="40" y1="42" x2="40" y2="48" stroke={stroke} strokeWidth="1.5" />
      </svg>
    );
  }

  if (type === "processor") {
    return (
      <svg viewBox="0 0 80 70" className="h-14 w-18" fill="none">
        <rect x="18" y="14" width="44" height="42" rx="5" stroke={stroke} strokeWidth="2" fill={fill} />
        <rect x="12" y="28" width="8" height="4" rx="1" fill={stroke} opacity="0.5" />
        <rect x="60" y="28" width="8" height="4" rx="1" fill={stroke} opacity="0.5" />
        <rect x="12" y="38" width="8" height="4" rx="1" fill={stroke} opacity="0.5" />
        <rect x="60" y="38" width="8" height="4" rx="1" fill={stroke} opacity="0.5" />
        <path d="M36 22 L32 35 H38 L34 48" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M44 22 L40 35 H46 L42 48" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 80 70" className="h-14 w-18" fill="none">
      <rect x="18" y="8" width="44" height="44" rx="5" stroke={stroke} strokeWidth="2" fill={fill} />
      <line x1="18" y1="18" x2="62" y2="18" stroke={stroke} strokeWidth="1.5" opacity="0.5" />
      <rect x="24" y="24" width="32" height="4" rx="1" fill={stroke} opacity="0.15" />
      <rect x="24" y="32" width="32" height="4" rx="1" fill={stroke} opacity="0.25" />
      <rect x="24" y="40" width="32" height="4" rx="1" fill={stroke} opacity="0.35" />
      <line x1="40" y1="52" x2="40" y2="62" stroke={stroke} strokeWidth="2" />
      <circle cx="40" cy="64" r="3" stroke={stroke} strokeWidth="1.5" fill="none" />
    </svg>
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
    if (!dialRef.current) {
      return;
    }

    const bounds = dialRef.current.getBoundingClientRect();
    const x = clientX - bounds.left;
    const y = clientY - bounds.top;
    const rawAngle = (Math.atan2(y - center, x - center) * 180) / Math.PI + 90;
    const normalized = ((rawAngle + 540) % 360) - 180;
    const clamped = Math.min(150, Math.max(-150, normalized));
    const nextValue = Math.round(((clamped + 150) / 300) * 25);

    onChange(nextValue);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        ref={dialRef}
        viewBox="0 0 180 180"
        className="h-[180px] w-[180px] touch-none"
        onPointerDown={(event) => {
          draggingRef.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          updateFromPointer(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (!draggingRef.current) {
            return;
          }

          updateFromPointer(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          draggingRef.current = false;
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        role="slider"
        aria-label="Transmission frequency dial"
        aria-valuemin={0}
        aria-valuemax={25}
        aria-valuenow={value}
      >
        <circle cx={center} cy={center} r={radius} fill="transparent" stroke="#1a2840" strokeWidth="4" />
        {Array.from({ length: 26 }, (_, index) => {
          const tickAngle = (index / 25) * 300 - 150;
          const tick = polarToCartesian(tickAngle, 54, 68);

          return (
            <line
              key={`tick-${index}`}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="#2a3a4a"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}
        {(() => {
          const indicator = polarToCartesian(indicatorAngle, 12, 48);

          return (
            <line
              x1={indicator.x1}
              y1={indicator.y1}
              x2={indicator.x2}
              y2={indicator.y2}
              stroke="#d4a843"
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })()}
        <circle cx={center} cy={center} r="18" fill="#10192a" stroke="#1a2840" strokeWidth="2" />
        <text
          x={center}
          y={84}
          textAnchor="middle"
          className="fill-[#5a6a7a] text-[8px]"
          style={{ fontFamily: "IBM Plex Mono, Courier New, monospace" }}
        >
          FREQ
        </text>
        <text
          x={center}
          y={102}
          textAnchor="middle"
          className="fill-[#d4a843] text-[14px] font-medium"
          style={{ fontFamily: "IBM Plex Mono, Courier New, monospace" }}
        >
          {value.toString().padStart(2, "0")}
        </text>
      </svg>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value === 0}
          className="rounded border border-[#1a2840] bg-[#10192a] px-4 py-2 font-mono text-sm uppercase tracking-[0.18em] text-[#d4a843] transition hover:border-[#d4a843] hover:text-[#f2c96a] disabled:opacity-40"
        >
          -
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.min(25, value + 1))}
          disabled={value === 25}
          className="rounded border border-[#1a2840] bg-[#10192a] px-4 py-2 font-mono text-sm uppercase tracking-[0.18em] text-[#d4a843] transition hover:border-[#d4a843] hover:text-[#f2c96a] disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
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
  const [activeCodexEntry, setActiveCodexEntry] = useState<CodexEntryId>("caesar-cipher");
  const [statusLine, setStatusLine] = useState("// STATION ONLINE -- AWAITING FIRST INTERCEPT");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");
  const [blockFeedback, setBlockFeedback] = useState<string[]>([]);
  const [blockAttemptHistory, setBlockAttemptHistory] = useState<string[]>([]);
  const [xorRuleFeedback, setXorRuleFeedback] = useState<(string | null)[]>(
    Array.from({ length: xorLevel.rulePairs.length }, () => null),
  );
  const [xorRecoveryFeedback, setXorRecoveryFeedback] = useState<(string | null)[]>(
    Array.from({ length: xorLevel.recoveryCipherBits.length }, () => null),
  );
  const [feedbackGeneration, setFeedbackGeneration] = useState(0);
  const [signalBurstKey, setSignalBurstKey] = useState(0);
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
  const revealedHints = currentLevel.hints.slice(0, revealedHintCount);
  const waveformState: WaveformState = completedByLevel[currentLevelId]
    ? "success"
    : statusTone === "error"
      ? "error"
      : "active";

  const alphaTrafficPreview = useMemo(
    () =>
      alphaIntercepts.map((intercept) => ({
        ...intercept,
        preview: decryptCaesar(intercept.ciphertext, caesarShift),
      })),
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
    if (showIntro || !completedByLevel[currentLevelId]) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();

      if (currentLevelId === "block-cipher") {
        onComplete(Array.from(skippedLevels));
        return;
      }

      setCurrentLevelIndex((previous) => previous + 1);
      setStatusTone("info");
      setStatusLine(levelReadyStatuses[levelOrder[currentLevelIndex + 1]]);
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [
    currentLevelId,
    currentLevelIndex,
    completedByLevel,
    onComplete,
    showIntro,
    skippedLevels,
  ]);

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
    setSignalBurstKey((previous) => previous + 1);
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

  function updateCaesarShift(nextShift: number) {
    if (nextShift === caesarShift) {
      return;
    }

    markInteraction();
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
      setXorRuleSelection(xorLevel.rulePairs.map((pair) => pair.output));
      setXorRuleSolved(true);
      setXorRecoverySelection(xorExpectedRecovery.split(""));
    } else if (currentLevelId === "block-cipher") {
      setBlockSelection(blockCipherLevel.correctSequence);
      setBlockFeedback([]);
    }

    setSkippedLevels((previous) => new Set(previous).add(currentLevelId));
    setCompletedByLevel((previous) => ({ ...previous, [currentLevelId]: true }));
    unlockCodex(currentLevelId);
    setStatusTone("info");
    setStatusLine("// TRANSMISSION BYPASSED -- SIGNAL LOG UPDATED");
  }

  function continueAfterLevel(levelId: LevelId) {
    if (levelId === "block-cipher") {
      onComplete(Array.from(skippedLevels));
      return;
    }

    setCurrentLevelIndex((previous) => previous + 1);
    setStatusTone("info");
    setStatusLine(levelReadyStatuses[levelOrder[currentLevelIndex + 1]]);
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
    setStatusTone("info");
    setStatusLine(`// INTEL ${nextHintIndex} OPENED`);

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

  function handleInventorySelect(choiceId: string) {
    if (blockSelection.includes(choiceId)) {
      return;
    }

    markInteraction();
    setSelectedBlockChoice((previous) => (previous === choiceId ? null : choiceId));
  }

  function handlePipelineSlotClick(index: number) {
    markInteraction();

    if (selectedBlockChoice) {
      setBlockSelection((previous) => {
        const next = [...previous];
        const existingIndex = next.indexOf(selectedBlockChoice);

        if (existingIndex !== -1) {
          next[existingIndex] = "";
        }

        next[index] = selectedBlockChoice;
        return next;
      });
      setSelectedBlockChoice(null);
      return;
    }

    const currentChoiceId = blockSelection[index];
    if (!currentChoiceId) {
      return;
    }

    setBlockSelection((previous) => {
      const next = [...previous];
      next[index] = "";
      return next;
    });
    setSelectedBlockChoice(currentChoiceId);
  }

  function handlePipelineSlotDrop(index: number, choiceId: string) {
    markInteraction();
    setBlockSelection((previous) => {
      const next = [...previous];
      const existingIndex = next.indexOf(choiceId);

      if (existingIndex !== -1) {
        next[existingIndex] = "";
      }

      next[index] = choiceId;
      return next;
    });
    setSelectedBlockChoice(null);
  }

  function submitCaesarGuess() {
    markInteraction();
    const attemptNo = getNextAttempt("caesar-cipher");
    const isCorrect = caesarShift === caesarLevel.targetShift;
    logAttempt("caesar-cipher", attemptNo, isCorrect ? "correct-shift" : "wrong-shift");

    if (!isCorrect) {
      setStatusTone("error");
      setStatusLine("// SIGNAL DEGRADED -- ADJUST PARAMETERS");
      handleFailedAttempt("caesar-cipher", attemptNo, "wrong-shift");
      return;
    }

    handleSuccessfulAttempt("caesar-cipher", attemptNo, "correct-shift", {
      finalShift: caesarShift,
      shiftChanges: caesarShiftChanges,
      plaintext: caesarLevel.plaintext,
      multiMessageNoticed: caesarShiftChanges > 3,
    });
    unlockCodex("caesar-cipher");
    setStatusTone("success");
    setStatusLine("// TRANSMISSION DECRYPTED -- ALPHA FRAGMENT LOGGED");
  }

  function submitXorRuleBoard() {
    markInteraction();
    const attemptNo = getNextAttempt("xor-stream");
    const expectedRule = xorLevel.rulePairs.map((pair) => pair.output).join("");

    if (xorRuleSelection.some((value) => value === "")) {
      logAttempt("xor-stream", attemptNo, "rule-incomplete");
      setStatusTone("error");
      setStatusLine("// SIGNAL DEGRADED -- COMPLETE ALL OUTPUT CHANNELS");
      handleFailedAttempt("xor-stream", attemptNo, "rule-incomplete");
      return;
    }

    const isCorrect = xorRuleAnswer === expectedRule;
    logAttempt("xor-stream", attemptNo, isCorrect ? "rule-correct" : "rule-wrong");

    if (!isCorrect) {
      const expected = xorLevel.rulePairs.map((pair) => pair.output);
      const feedback = xorRuleSelection.map((selection, index) =>
        selection === expected[index] ? "correct" : "wrong",
      );

      setXorRuleFeedback(feedback);
      setFeedbackGeneration((previous) => previous + 1);
      window.setTimeout(() => {
        setXorRuleFeedback(Array.from({ length: xorLevel.rulePairs.length }, () => null));
      }, 1500);
      setStatusTone("error");
      setStatusLine("// SIGNAL DEGRADED -- RECALIBRATE THE XOR RULE");
      handleFailedAttempt("xor-stream", attemptNo, "rule-wrong");
      return;
    }

    setXorRuleSolved(true);
    setXorRuleFeedback(xorLevel.rulePairs.map(() => "correct"));
    setFeedbackGeneration((previous) => previous + 1);
    window.setTimeout(() => {
      setXorRuleFeedback(Array.from({ length: xorLevel.rulePairs.length }, () => null));
    }, 1500);
    handleIntermediateSuccess("xor-stream", attemptNo, "rule-correct", {
      stage: "rule-board",
      outputs: xorRuleAnswer,
    });
    setStatusTone("info");
    setStatusLine("// CALIBRATION APPLIED -- RECOVERY CHANNEL ONLINE");
  }

  function submitXorRecovery() {
    markInteraction();
    const attemptNo = getNextAttempt("xor-stream");

    if (xorRecoverySelection.some((value) => value === "")) {
      logAttempt("xor-stream", attemptNo, "recovery-incomplete");
      setStatusTone("error");
      setStatusLine("// SIGNAL DEGRADED -- OUTPUT BUFFER INCOMPLETE");
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
      const feedback = xorRecoverySelection.map((selection, index) =>
        selection === expectedBits[index] ? "correct" : "wrong",
      );

      setXorRecoveryFeedback(feedback);
      setFeedbackGeneration((previous) => previous + 1);
      window.setTimeout(() => {
        setXorRecoveryFeedback(
          Array.from({ length: xorLevel.recoveryCipherBits.length }, () => null),
        );
      }, 1500);
      setStatusTone("error");
      setStatusLine("// SIGNAL DEGRADED -- ADJUST RECOVERY BITS");
      handleFailedAttempt("xor-stream", attemptNo, "recovery-wrong");
      return;
    }

    setXorRecoveryFeedback(xorLevel.recoveryCipherBits.split("").map(() => "correct"));
    setFeedbackGeneration((previous) => previous + 1);
    window.setTimeout(() => {
      setXorRecoveryFeedback(
        Array.from({ length: xorLevel.recoveryCipherBits.length }, () => null),
      );
    }, 1500);
    handleSuccessfulAttempt("xor-stream", attemptNo, "recovery-correct", {
      stage: "signal-recovery",
      recoveredBits: xorRecoveryPreview,
    });
    unlockCodex("xor-stream");
    setStatusTone("success");
    setStatusLine("// TRANSMISSION DECRYPTED -- BRAVO FRAGMENT LOGGED");
  }

  function submitBlockSequence() {
    markInteraction();
    const attemptNo = getNextAttempt("block-cipher");
    const evaluation = evaluateBlockSequence(blockSelection);
    const sequenceSnapshot = formatBlockSequence(blockSelection);
    const nextHistory = [...blockAttemptHistory, sequenceSnapshot];

    setBlockAttemptHistory(nextHistory);
    logAttempt(
      "block-cipher",
      attemptNo,
      evaluation.correct ? "correct-sequence" : "wrong-sequence",
    );

    if (!evaluation.correct) {
      setBlockFeedback(evaluation.feedback);
      setStatusTone("error");
      setStatusLine("// SIGNAL DEGRADED -- ADJUST PARAMETERS");
      handleFailedAttempt("block-cipher", attemptNo, "wrong-sequence");
      return;
    }

    setBlockFeedback([]);
    handleSuccessfulAttempt("block-cipher", attemptNo, "correct-sequence", {
      configurationSequence: nextHistory,
      attemptsBeforeCorrect: attemptNo - 1,
    });
    void sendStudyEvent({
      participantId,
      sessionId,
      eventName: "channel_configured",
      levelId: "block-cipher",
      taskId: taskIds["block-cipher"],
      attemptNo,
      result: "correct-sequence",
      metadata: {
        configurationSequence: nextHistory,
        attemptsBeforeCorrect: attemptNo - 1,
      },
    });
    unlockCodex("block-cipher");
    setStatusTone("success");
    setStatusLine("// CHANNEL CONFIGURED -- ENCRYPTION ACTIVE");
  }

  function renderBurst() {
    return <div key={`signal-burst-${signalBurstKey}`} className="terminal-static-burst" />;
  }

  function renderCaesarLevel() {
    if (completedByLevel[currentLevelId]) {
      return (
        <div className="space-y-4">
          <div className="terminal-panel relative overflow-hidden">
            {renderBurst()}
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#4ade80]">
              {"// TRANSMISSION DECRYPTED"}
            </p>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[#5a6a7a]">
              {"// CONTENT: CLASSIFIED FRAGMENT 1/3"}
            </p>
            <pre className="mt-5 whitespace-pre-wrap font-mono text-lg leading-8 text-[#d4a843]">
              {caesarLevel.plaintext}
            </pre>
            <div className="mt-5 space-y-2 font-mono text-sm leading-7 text-[#4ade80]">
              <p>{"// COORDINATES EMBEDDED: 48.2082°N 16.3738°E"}</p>
              <p>{"// KEYWORD RECOVERED: RENDEZVOUS"}</p>
              <p>{"// LOGGING TO SIGNAL LOG..."}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="terminal-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">
            {"// RAW INTERCEPT -- ALPHA CHANNEL"}
          </p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-[#5a6a7a]">
            {"// RECEIVED: 03:42:17 UTC"}
          </p>
          <pre className="mt-4 whitespace-pre-wrap font-mono text-lg leading-8 text-[#d4a843]">
            {caesarLevel.ciphertext}
          </pre>
        </div>

        <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
          <div className="terminal-panel flex items-center justify-center">
            <FrequencyDial value={caesarShift} onChange={updateCaesarShift} />
          </div>

          <div className="space-y-4">
            <div className="terminal-panel">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">
                {`// DECRYPT ATTEMPT [SHIFT: ${caesarShift.toString().padStart(2, "0")}]`}
              </p>
              <pre className="mt-4 whitespace-pre-wrap font-mono text-lg leading-8 text-[#d4a843]">
                {alphaTrafficPreview[0]?.preview}
              </pre>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {alphaTrafficPreview.slice(1).map((intercept) => (
                <div key={intercept.id} className="terminal-panel">
                  <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#5a6a7a]">
                    {`// ${intercept.label}`}
                  </p>
                  <p className="mt-2 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[#5a6a7a]">
                    {`// RECEIVED: ${intercept.receivedAt}`}
                  </p>
                  <pre className="mt-4 whitespace-pre-wrap font-mono text-base leading-7 text-[#c3a257]">
                    {intercept.preview}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          {attempts >= 3 ? (
            <Button
              variant="secondary"
              onClick={handleSkipLevel}
              className="rounded border border-[#624616] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] hover:bg-[#2a1c08]"
            >
              {"// BYPASS ALPHA"}
            </Button>
          ) : null}
          <Button
            onClick={submitCaesarGuess}
            className="rounded border border-[#1a2840] bg-[#162134] font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] shadow-none hover:bg-[#1d2a43]"
          >
            {"// VERIFY TRANSMISSION"}
          </Button>
        </div>
      </div>
    );
  }

  function renderXorLevel() {
    if (completedByLevel[currentLevelId]) {
      return (
        <div className="space-y-4">
          <div className="terminal-panel relative overflow-hidden">
            {renderBurst()}
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#4ade80]">
              {"// TRANSMISSION BRAVO -- DECRYPTED"}
            </p>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[#5a6a7a]">
              {"// CONTENT: CLASSIFIED FRAGMENT 2/3"}
            </p>
            <div className="mt-5 space-y-2 font-mono text-lg leading-8 text-[#d4a843]">
              <p>PACKAGE TRANSFER CONFIRMED</p>
              <p>WINDOW: 0200-0215 UTC</p>
            </div>
            <p className="mt-5 font-mono text-sm text-[#4ade80]">
              {"// LOGGING TO SIGNAL LOG..."}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="terminal-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">
            {"// SIGNAL PROCESSOR -- CALIBRATION MODE"}
          </p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-[#5a6a7a]">
            {"// ENCODING METHOD: BITWISE TRANSFORM"}
          </p>
          <p className="mt-4 font-mono text-sm leading-7 text-[#c3a257]">
            {"// CONFIGURE DECODE RULES: set each output channel based on the input pair."}
          </p>
        </div>

        <div className="terminal-panel space-y-3">
          {xorLevel.rulePairs.map((pair, index) => {
            const isActive = xorRuleSelection[index] !== "";
            const feedback = xorRuleFeedback[index];
            const feedbackClass =
              feedback === "correct"
                ? "xor-row-correct"
                : feedback === "wrong"
                  ? "xor-row-wrong"
                  : "";

            return (
              <div
                key={`rule-${pair.left}-${pair.right}-${index}-${feedbackGeneration}`}
                className={`rounded border border-[#1a2840] bg-[#09111c] px-4 py-4 ${feedbackClass}`}
              >
                <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[#5a6a7a]">
                  {`// CHANNEL ${index + 1}: [${pair.left}] XOR [${pair.right}] = [ ? ]`}
                </p>
                <div className="flex items-center gap-3">
                  <div className={`bit-node ${isActive ? "bit-node--active" : ""}`}>{pair.left}</div>
                  <div className={`xor-wire flex-1 ${isActive ? "xor-wire--active" : ""}`} />
                  <div className={`bit-node ${isActive ? "bit-node--active" : ""}`}>{pair.right}</div>
                  <div className={`xor-wire flex-1 ${isActive ? "xor-wire--active" : ""}`} />
                  <div className={`xor-gate ${isActive ? "xor-gate--active" : ""}`}>XOR</div>
                  <div className={`xor-wire flex-1 ${isActive ? "xor-wire--active" : ""}`} />
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
                        aria-label={`Output ${value} for XOR pair ${pair.left} and ${pair.right}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="rounded border border-[#1a2840] bg-[#09111c] px-4 py-4 font-mono text-sm text-[#c3a257]">
            <p>{`// DECODER OUTPUT: [ ${xorRuleSelection.map((bit) => bit || "?").join(" ")} ]`}</p>
            <p className="mt-2">{`// STATUS: ${xorRuleSolved ? "CALIBRATED" : "UNCALIBRATED"}`}</p>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            {attempts >= 3 && !xorRuleSolved ? (
              <Button
                variant="secondary"
                onClick={handleSkipLevel}
                className="rounded border border-[#624616] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] hover:bg-[#2a1c08]"
              >
                {"// BYPASS BRAVO"}
              </Button>
            ) : null}
            <Button
              onClick={submitXorRuleBoard}
              className="rounded border border-[#1a2840] bg-[#162134] font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] shadow-none hover:bg-[#1d2a43]"
            >
              {"// APPLY CALIBRATION"}
            </Button>
          </div>
        </div>

        {xorRuleSolved ? (
          <div ref={xorStepTwoRef} className="terminal-panel stage-unlock-enter space-y-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">
                {"// SIGNAL RECOVERY MODE"}
              </p>
              <p className="mt-2 font-mono text-sm leading-7 text-[#c3a257]">
                {"// Corrupted transmission above, key stream below, recovery buffer awaiting output."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              {xorLevel.recoveryCipherBits.split("").map((cipherBit, index) => {
                const feedback = xorRecoveryFeedback[index];
                const columnClass =
                  feedback === "correct"
                    ? "xor-row-correct"
                    : feedback === "wrong"
                      ? "xor-row-wrong"
                      : "";

                return (
                  <div
                    key={`recovery-${index}-${feedbackGeneration}`}
                    className={`rounded border border-[#1a2840] bg-[#09111c] p-4 ${columnClass}`}
                  >
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#5a6a7a]">
                      {`// NODE ${index + 1}`}
                    </p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#5a6a7a]">
                          CIPHER
                        </p>
                        <div className="bit-node bit-node--active">{cipherBit}</div>
                      </div>
                      <div>
                        <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#5a6a7a]">
                          KEY
                        </p>
                        <div className="bit-node bit-node--active">
                          {xorLevel.recoveryKeyBits[index]}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#5a6a7a]">
                          OUTPUT
                        </p>
                        <div className="rocker-toggle rocker-toggle--active">
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
                              aria-label={`Recovery output ${value} for node ${index + 1}`}
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
            </div>

            <div className="rounded border border-[#1a2840] bg-[#09111c] px-4 py-4 font-mono text-sm text-[#c3a257]">
              <p>{`// DECODER OUTPUT: [ ${xorRecoverySelection.map((bit) => bit || "?").join(" ")} ]`}</p>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              {attempts >= 3 ? (
                <Button
                  variant="secondary"
                  onClick={handleSkipLevel}
                  className="rounded border border-[#624616] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] hover:bg-[#2a1c08]"
                >
                  {"// BYPASS BRAVO"}
                </Button>
              ) : null}
              <Button
                onClick={submitXorRecovery}
                className="rounded border border-[#1a2840] bg-[#162134] font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] shadow-none hover:bg-[#1d2a43]"
              >
                {"// RECOVER SIGNAL"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderBlockCipherLevel() {
    if (completedByLevel[currentLevelId]) {
      return (
        <div className="space-y-4">
          <div className="terminal-panel relative overflow-hidden">
            {renderBurst()}
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#4ade80]">
              {"// CHANNEL CONFIGURED -- ENCRYPTION ACTIVE"}
            </p>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[#5a6a7a]">
              {"// SECURE RESPONSE: TRANSMITTED"}
            </p>
            <div className="mt-5 space-y-2 font-mono text-sm leading-7 text-[#d4a843]">
              <p>{"// TRANSMISSION CHARLIE -- MISSION COMPLETE"}</p>
              <p>{"// ALL FRAGMENTS RECOVERED:"}</p>
              <p>{"//   1/3 -- RENDEZVOUS COORDINATES"}</p>
              <p>{"//   2/3 -- TRANSFER WINDOW"}</p>
              <p>{"//   3/3 -- CHANNEL SECURE"}</p>
            </div>
            <p className="mt-5 font-mono text-sm text-[#4ade80]">
              {"// SIGNAL LOG UPDATED -- FULL DOSSIER AVAILABLE"}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="terminal-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">
            {"// SECURE CHANNEL -- CONFIGURATION REQUIRED"}
          </p>
          <div className="mt-3 space-y-1 font-mono text-sm leading-7 text-[#c3a257]">
            <p>{"// ADVERSARY TRANSMISSION: INCOMING"}</p>
            <p>{"// OUR RESPONSE WINDOW: CLOSING"}</p>
            <p>{"// CONFIGURE OUTBOUND ENCRYPTION PIPELINE:"}</p>
            <p>{"// MISCONFIGURATION WILL EXPOSE OUR RESPONSE"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="terminal-panel">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">
              {"// COMPONENT INVENTORY"}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {["encrypt", "key", "ciphertext", "iv", "plaintext"].map((choiceId) => {
                const choice = blockCipherLevel.choices.find((item) => item.id === choiceId);
                if (!choice) {
                  return null;
                }

                const used = blockSelection.includes(choice.id);
                const selected = selectedBlockChoice === choice.id;
                const Icon = blockIconComponents[choice.id as keyof typeof blockIconComponents];
                const iconColor = used ? "#5a6a7a" : selected ? "#f2c96a" : "#d4a843";

                return (
                  <button
                    key={choice.id}
                    type="button"
                    draggable={!used}
                    disabled={used}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", choice.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => handleInventorySelect(choice.id)}
                    className={[
                      "rounded border px-4 py-4 text-left transition",
                      used
                        ? "cursor-not-allowed border-[#1a2840] bg-[#09111c] opacity-40"
                        : selected
                          ? "border-[#d4a843] bg-[#182338]"
                          : "border-[#1a2840] bg-[#0d1625] hover:border-[#d4a843]",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded border border-[#1a2840] bg-[#09111c]">
                        <Icon color={iconColor} />
                      </div>
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#d4a843]">
                        {choice.label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="terminal-panel">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">
              {"// PIPELINE CONFIGURATION"}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {blockCipherLevel.slotLabels.map((slotLabel, index) => {
                const currentChoiceId = blockSelection[index];
                const currentChoice = currentChoiceId
                  ? blockCipherLevel.choices.find((item) => item.id === currentChoiceId) ?? null
                  : null;
                const Icon = currentChoiceId
                  ? blockIconComponents[currentChoiceId as keyof typeof blockIconComponents]
                  : null;
                const stationTypes = ["hopper", "mixer", "lock", "processor", "tank"] as const;

                return (
                  <div
                    key={slotLabel}
                    className={[
                      "rounded border bg-[#09111c] px-3 py-3 transition",
                      currentChoice
                        ? "border-[#4ade80]"
                        : selectedBlockChoice
                          ? "border-dashed border-[#d4a843]"
                          : "border-[#1a2840]",
                    ].join(" ")}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const droppedId = event.dataTransfer.getData("text/plain");
                      if (droppedId) {
                        handlePipelineSlotDrop(index, droppedId);
                      }
                    }}
                  >
                    <p className="text-center font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[#5a6a7a]">
                      {`// ${slotLabel}`}
                    </p>
                    <div className="mt-3 flex justify-center">
                      <BlockStationShape
                        type={stationTypes[index]}
                        active={currentChoice ? "placed" : selectedBlockChoice ? "selected" : "empty"}
                        index={index}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePipelineSlotClick(index)}
                      className={[
                        "mt-3 flex min-h-16 w-full items-center justify-center rounded border border-dashed px-3 py-3 text-center transition",
                        currentChoice
                          ? "border-[#4ade80] bg-[#0f1c18] text-[#4ade80]"
                          : selectedBlockChoice
                            ? "border-[#d4a843] bg-[#10192a] text-[#d4a843]"
                            : "border-[#1a2840] bg-[#0d1625] text-[#5a6a7a]",
                      ].join(" ")}
                    >
                      {currentChoice && Icon ? (
                        <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em]">
                          <Icon size={16} color="#4ade80" />
                          {currentChoice.label}
                        </span>
                      ) : selectedBlockChoice ? (
                        <span className="font-mono text-xs uppercase tracking-[0.14em]">
                          {"[ PLACE COMPONENT ]"}
                        </span>
                      ) : (
                        <span className="font-mono text-xs uppercase tracking-[0.14em]">
                          {"[ EMPTY SLOT ]"}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {blockFeedback.length > 0 ? (
          <div className="terminal-panel border-[#3b2311] bg-[#140c08]">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#d4a843]">
              {"// PIPELINE DIAGNOSTIC"}
            </p>
            <div className="mt-4 space-y-2 font-mono text-sm leading-7 text-[#e8b66c]">
              {blockFeedback.map((message) => (
                <p key={message}>{`> ERROR: ${message}`}</p>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          {attempts >= 3 ? (
            <Button
              variant="secondary"
              onClick={handleSkipLevel}
              className="rounded border border-[#624616] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] hover:bg-[#2a1c08]"
            >
              {"// BYPASS CHARLIE"}
            </Button>
          ) : null}
          <Button
            onClick={submitBlockSequence}
            className="rounded border border-[#1a2840] bg-[#162134] font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] shadow-none hover:bg-[#1d2a43]"
          >
            {"// COMMIT CONFIGURATION"}
          </Button>
        </div>
      </div>
    );
  }

  function renderTransitionBeat() {
    if (!completedByLevel[currentLevelId] || currentLevelId === "block-cipher") {
      return null;
    }

    const beat = transitionBeats[currentLevelId];

    return (
      <div className="terminal-panel space-y-3">
        {beat.lines.map((line, index) => (
          <p
            key={line}
            className="typewriter-line font-mono text-sm uppercase tracking-[0.18em] text-[#d4a843]"
            style={{ animationDelay: `${index * 120}ms` }}
          >
            {line}
          </p>
        ))}
        <button
          type="button"
          onClick={() => continueAfterLevel(currentLevelId)}
          className="mt-2 rounded border border-[#1a2840] bg-[#10192a] px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] transition hover:border-[#d4a843] hover:text-[#f2c96a]"
        >
          {beat.action}
        </button>
      </div>
    );
  }

  return (
    <div className="terminal-canvas mx-auto w-full max-w-[98rem] rounded-[18px] border border-[#1a2840] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
      {showIntro ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(4,8,14,0.88)] p-4">
          <div className="terminal-panel max-w-3xl">
            {bootSequenceLines.map((line, index) => (
              <p
                key={`${line}-${index}`}
                className={[
                  "typewriter-line font-mono text-sm tracking-[0.16em] text-[#d4a843]",
                  line === "" ? "h-4" : "",
                ].join(" ")}
                style={{ animationDelay: `${index * 120}ms` }}
              >
                {line || " "}
              </p>
            ))}
            <button
              type="button"
              onClick={() => {
                setShowIntro(false);
                setStatusTone("info");
                setStatusLine(levelReadyStatuses["caesar-cipher"]);
              }}
              className="mt-8 rounded border border-[#1a2840] bg-[#10192a] px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] transition hover:border-[#d4a843] hover:text-[#f2c96a]"
            >
              {"// [BEGIN MISSION]"}
            </button>
          </div>
        </div>
      ) : null}

      <div className="terminal-panel mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-mono text-sm uppercase tracking-[0.22em] text-[#d4a843]">
            {`SIGINT STATION // ANALYST: CIPHER // TRANSMISSION: ${currentLevelIndex + 1}/3`}
          </p>
          <p
            className={[
              "mt-2 font-mono text-xs uppercase tracking-[0.16em]",
              statusTone === "success"
                ? "text-[#4ade80]"
                : statusTone === "error"
                  ? "text-[#ef4444]"
                  : "text-[#5a6a7a]",
            ].join(" ")}
          >
            {statusLine}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StatusWaveform state={waveformState} />
          <p
            className={[
              "font-mono text-xs uppercase tracking-[0.18em]",
              waveformState === "success"
                ? "text-[#4ade80]"
                : waveformState === "error"
                  ? "text-[#ef4444]"
                  : "text-[#d4a843]",
            ].join(" ")}
          >
            {waveformState === "success"
              ? "// SIGNAL CLEAR"
              : waveformState === "error"
                ? "// SIGNAL DEGRADED"
                : "// INTERCEPT LOCKED"}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_200px] lg:items-start">
        <div className="space-y-4">
          <div className="terminal-panel">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">
              {"// Mission Briefing"}
          </p>
            <h2 className="mt-3 font-mono text-lg uppercase tracking-[0.14em] text-[#d4a843]">
              {currentLevel.title}
            </h2>
            <p className="mt-4 font-mono text-sm leading-7 text-[#c3a257]">
              {currentLevel.mission}
            </p>
          </div>

          <div className="terminal-panel">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">
              {"// Signal Stats"}
            </p>
            <div className="mt-4 space-y-3 font-mono text-sm text-[#d4a843]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#5a6a7a]">Transmission</span>
                <span>{currentLevelIndex + 1} / {levelOrder.length}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#5a6a7a]">Decrypt attempts</span>
                <span>{attempts}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#5a6a7a]">Intel requests</span>
                <span>{revealedHintCount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[#5a6a7a]">Signal Log</span>
                <span>{unlockedCodexEntries.length} / 3</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {currentLevelId === "caesar-cipher"
            ? renderCaesarLevel()
            : currentLevelId === "xor-stream"
              ? renderXorLevel()
              : renderBlockCipherLevel()}

          {renderTransitionBeat()}

          {completedByLevel[currentLevelId] && currentLevelId === "block-cipher" ? (
            <div className="terminal-panel">
              <button
                type="button"
                onClick={() => onComplete(Array.from(skippedLevels))}
                className="rounded border border-[#1a2840] bg-[#10192a] px-4 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] transition hover:border-[#d4a843] hover:text-[#f2c96a]"
              >
                {"// [PRESS ENTER TO OPEN POST-MISSION DEBRIEF]"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="terminal-panel space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">
                  {"// Intel"}
                </p>
                {unlockedHintCount > revealedHintCount ? (
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#4ade80]">
                    {"// NEW"}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 font-mono text-sm leading-7 text-[#5a6a7a]">
                {"// Intel unlocks automatically as you work. Review it only when you need it."}
              </p>
            </div>

            <Button
              variant="secondary"
              onClick={handleRevealHint}
              disabled={revealedHintCount >= unlockedHintCount}
              fullWidth
              className="rounded border border-[#1a2840] bg-[#10192a] font-mono text-xs uppercase tracking-[0.18em] text-[#d4a843] hover:border-[#d4a843] hover:bg-[#10192a] hover:text-[#f2c96a]"
            >
              {unlockedHintCount === 0
                ? "// NO INTEL AVAILABLE"
                : revealedHintCount < unlockedHintCount
                  ? "// NEW INTEL RECEIVED"
                  : "// ALL INTEL REVIEWED"}
            </Button>

            {revealedHints.length > 0 ? (
              <div className="space-y-3">
                {revealedHints.map((hint, index) => (
                  <div key={hint} className="rounded border border-[#1a2840] bg-[#09111c] px-4 py-3 font-mono text-sm leading-7 text-[#c3a257]">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#4ade80]">
                      {`// INTEL ${index + 1}`}
                    </p>
                    <p className="mt-2">&gt; {hint}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded border border-dashed border-[#1a2840] bg-[#09111c] px-4 py-3 font-mono text-sm leading-7 text-[#5a6a7a]">
                {"// NO INTEL AVAILABLE"}
              </div>
            )}
          </div>

          <CodexPanel
            activeEntryId={activeCodexEntry}
            isOpen={codexOpen}
            onSelectEntry={handleCodexEntrySelect}
            onToggle={handleCodexToggle}
            unlockedEntries={unlockedCodexEntries}
          />
        </div>
      </div>
    </div>
  );
}
