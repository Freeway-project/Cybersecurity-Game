"use client";

import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  levelOrder,
  levelReadyStatuses,
  transitionBeats,
} from "@/modules/game/content";
import { CodexPanel } from "@/modules/game/components/codex-panel";
import { CaesarCipherLevel } from "@/modules/game/components/levels/caesar-cipher-level";
import { XorStreamLevel } from "@/modules/game/components/levels/xor-stream-level";
import { BlockCipherLevel } from "@/modules/game/components/levels/block-cipher-level";
import { PhishingInspectorLevel } from "@/modules/game/components/levels/phishing-inspector-level";
import { NetworkDefenseLevel } from "@/modules/game/components/levels/network-defense-level";
import { TerminalForensicsLevel } from "@/modules/game/components/levels/terminal-forensics-level";
import { DualRoleDefenderLevel } from "@/modules/game/components/levels/dual-role-defender-level";
import { SocTriageLevel } from "@/modules/game/components/levels/soc-triage-level";
import { BreachOverlay } from "@/modules/game/components/ui/breach-overlay";
import { FlagCapture } from "@/modules/game/components/ui/flag-capture";
import { ScoreBar } from "@/modules/game/components/ui/score-bar";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import { totalMaxScore } from "@/modules/game/scoring";
import type { LevelResult } from "@/modules/game/types";
import type { CodexEntryId, LevelId } from "@/types/study";

interface GameplayExperienceProps {
  participantId: string;
  sessionId: string;
  onComplete: (skippedLevels: string[]) => void;
}

type Phase = "intro" | "level" | "transition" | "done";
type StatusTone = "info" | "error" | "success";
type WaveformState = "active" | "error" | "success";

const bootLines = [
  "OPERATION: SIGNAL GHOST // BOOT SEQUENCE INITIATED",
  "",
  "> LOADING SIGNAL ANALYSIS SUITE.............. OK",
  "> CONNECTING TO INTERCEPT ARRAY.............. OK",
  "> AUTHENTICATING ANALYST: CIPHER............. OK",
  "> THREAT DATABASE: LOADED",
  `> TRANSMISSION QUEUE: ${levelOrder.length} INTERCEPTS PENDING`,
  "",
  "// BRIEFING:",
  "// An unknown network has been transmitting on monitored frequencies.",
  `// ${levelOrder.length} transmissions intercepted — some encoded, some threats, some traces.`,
  "// Your task: decode, detect, defend, investigate.",
  "// Method: classified. Work from what you have.",
];

function StatusWaveform({ state }: { state: WaveformState }) {
  const path =
    state === "success"
      ? "M4 20 L14 20 L22 10 L30 30 L38 12 L46 26 L56 20"
      : state === "error"
        ? "M4 20 L56 20"
        : "M4 20 L12 16 L18 24 L26 12 L34 28 L42 16 L50 22 L56 20";

  return (
    <svg aria-hidden="true" viewBox="0 0 60 40" className="h-10 w-24 shrink-0" fill="none">
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

// ── Boot intro ────────────────────────────────────────────────────────────────

function BootIntro({ onDone }: { onDone: () => void }) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= bootLines.length) return;
    const delay = bootLines[visibleCount] === "" ? 80 : 120;
    const timer = window.setTimeout(() => setVisibleCount((p) => p + 1), delay);
    return () => window.clearTimeout(timer);
  }, [visibleCount]);

  return (
    <div className="terminal-panel space-y-0 font-mono text-xs leading-6">
      {bootLines.slice(0, visibleCount).map((line, i) => (
        <div
          key={i}
          className={[
            "whitespace-pre",
            line.startsWith("//") ? "text-[#c3a257]" : line.startsWith(">") ? "text-[#5a6a7a]" : "text-[#d4a843]",
          ].join(" ")}
        >
          {line || "\u00a0"}
        </div>
      ))}
      {visibleCount >= bootLines.length && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onDone}
            className="rounded border border-[#1a2840] bg-[#10192a] px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] transition hover:border-[#d4a843] hover:text-[#f2c96a]"
          >
            // [BEGIN MISSION]
          </button>
        </div>
      )}
    </div>
  );
}

// ── Transition beat ───────────────────────────────────────────────────────────

function TransitionBeat({
  lines,
  action,
  onNext,
}: {
  lines: string[];
  action: string;
  onNext: () => void;
}) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount >= lines.length) return;
    const timer = window.setTimeout(() => setVisibleCount((p) => p + 1), 150);
    return () => window.clearTimeout(timer);
  }, [visibleCount, lines.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && visibleCount >= lines.length) onNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onNext, visibleCount, lines.length]);

  return (
    <div className="terminal-panel space-y-2 font-mono text-sm leading-7">
      {lines.slice(0, visibleCount).map((line, i) => (
        <p key={i} className="text-[#4ade80]">{line}</p>
      ))}
      {visibleCount >= lines.length && (
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onNext}
            className="rounded border border-[#1a2840] bg-[#10192a] px-5 py-3 font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] transition hover:border-[#d4a843] hover:text-[#f2c96a]"
          >
            {action}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export function GameplayExperience({
  participantId,
  sessionId,
  onComplete,
}: GameplayExperienceProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [levelResults, setLevelResults] = useState<Partial<Record<LevelId, LevelResult>>>({});

  // Per-level tracking
  const [attemptsPerLevel, setAttemptsPerLevel] = useState<Record<string, number>>({});
  const [hintsUnlockedPerLevel, setHintsUnlockedPerLevel] = useState<Record<string, number>>({});
  const [hintsRevealedPerLevel, setHintsRevealedPerLevel] = useState<Record<string, number>>({});
  const levelStartTimes = useRef<Record<string, number>>({});
  const startedLevels = useRef<Set<string>>(new Set());

  // Score / flags
  const [totalScore, setTotalScore] = useState(0);
  const [flagsCaptured, setFlagsCaptured] = useState(0);

  // Status
  const [statusLine, setStatusLine] = useState("// STATION ONLINE -- AWAITING FIRST INTERCEPT");
  const [statusTone, setStatusTone] = useState<StatusTone>("info");

  // Codex
  const [unlockedCodexEntries, setUnlockedCodexEntries] = useState<CodexEntryId[]>([]);
  const [codexOpen, setCodexOpen] = useState(false);
  const [activeCodexEntry, setActiveCodexEntry] = useState<CodexEntryId>("caesar-cipher");

  // Overlay states
  const [breachKey, setBreachKey] = useState(0);
  const [breachActive, setBreachActive] = useState(false);
  const [flagCaptureData, setFlagCaptureData] = useState<{ flag: string; levelTitle: string; score: number } | null>(null);

  // Elapsed time
  const [elapsedMs, setElapsedMs] = useState(0);
  const sessionStartRef = useRef(Date.now());
  const lastInteractionRef = useRef(Date.now());

  // Current level
  const currentLevelId = levelOrder[currentLevelIndex];
  const attempts = currentLevelId ? (attemptsPerLevel[currentLevelId] ?? 0) : 0;
  const hintsUsed = currentLevelId ? (hintsRevealedPerLevel[currentLevelId] ?? 0) : 0;
  const startTime = currentLevelId ? (levelStartTimes.current[currentLevelId] ?? Date.now()) : Date.now();
  const hintsUnlocked = currentLevelId ? (hintsUnlockedPerLevel[currentLevelId] ?? 0) : 0;
  const hintsRevealed = currentLevelId ? (hintsRevealedPerLevel[currentLevelId] ?? 0) : 0;
  // Get hints from level content
  const levelHints = currentLevelId ? getLevelHints(currentLevelId) : [];
  const revealedHints = levelHints.slice(0, hintsRevealed);

  const waveformState: WaveformState =
    currentLevelId && levelResults[currentLevelId]
      ? "success"
      : statusTone === "error"
        ? "error"
        : "active";

  // Tick elapsed time
  useEffect(() => {
    if (phase === "intro" || phase === "done") return;
    const interval = window.setInterval(() => {
      setElapsedMs(Date.now() - sessionStartRef.current);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase]);

  // Auto-unlock hints from inactivity
  useEffect(() => {
    if (phase !== "level" || !currentLevelId || levelResults[currentLevelId]) return;
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - lastInteractionRef.current;
      if (elapsed >= 30000) {
        setHintsUnlockedPerLevel((prev) => ({
          ...prev,
          [currentLevelId]: Math.max(prev[currentLevelId] ?? 0, 1),
        }));
      }
      if (elapsed >= 90000) {
        setHintsUnlockedPerLevel((prev) => ({
          ...prev,
          [currentLevelId]: Math.max(prev[currentLevelId] ?? 0, 2),
        }));
      }
    }, 5000);
    return () => window.clearInterval(interval);
  }, [phase, currentLevelId, levelResults]);

  // Log level start
  useEffect(() => {
    if (phase !== "level" || !currentLevelId || startedLevels.current.has(currentLevelId)) return;
    startedLevels.current.add(currentLevelId);
    levelStartTimes.current[currentLevelId] = Date.now();
    void sendStudyEvent({
      participantId, sessionId, eventName: "level_started",
      levelId: currentLevelId,
    });
  }, [phase, currentLevelId, participantId, sessionId]);

  function handleBreach() {
    lastInteractionRef.current = Date.now();
    setBreachKey((k) => k + 1);
    setBreachActive(false);
    window.requestAnimationFrame(() => setBreachActive(true));
  }

  function handleStatusChange(line: string, tone: StatusTone) {
    lastInteractionRef.current = Date.now();
    setStatusLine(line);
    setStatusTone(tone);
  }

  function handleUnlockCodex(id: CodexEntryId) {
    setUnlockedCodexEntries((prev) => prev.includes(id) ? prev : [...prev, id]);
    setActiveCodexEntry(id);
  }

  function handleAttempt(n: number) {
    lastInteractionRef.current = Date.now();
    if (!currentLevelId) return;
    setAttemptsPerLevel((prev) => ({ ...prev, [currentLevelId]: n }));
    // Unlock hints on failures
    if (n >= 2) setHintsUnlockedPerLevel((prev) => ({ ...prev, [currentLevelId]: Math.max(prev[currentLevelId] ?? 0, 1) }));
    if (n >= 3) setHintsUnlockedPerLevel((prev) => ({ ...prev, [currentLevelId]: Math.max(prev[currentLevelId] ?? 0, 2) }));
    if (n >= 4) setHintsUnlockedPerLevel((prev) => ({ ...prev, [currentLevelId]: Math.max(prev[currentLevelId] ?? 0, 3) }));
  }

  function handleRevealHint() {
    if (!currentLevelId || hintsRevealed >= hintsUnlocked) return;
    const next = hintsRevealed + 1;
    setHintsRevealedPerLevel((prev) => ({ ...prev, [currentLevelId]: next }));
    void sendStudyEvent({ participantId, sessionId, eventName: "hint_opened", levelId: currentLevelId, metadata: { hintIndex: next } });
  }

  // onBurst is called by levels just before onComplete — flag capture is triggered in handleLevelComplete instead
  function handleBurst() { /* no-op — handled in handleLevelComplete */ }

  function handleLevelComplete(result: LevelResult) {
    lastInteractionRef.current = Date.now();
    setLevelResults((prev) => ({ ...prev, [result.levelId]: result }));
    setTotalScore((prev) => prev + result.score);
    setFlagsCaptured((prev) => prev + 1);
    setFlagCaptureData({
      flag: result.flag,
      levelTitle: getLevelTitle(result.levelId),
      score: result.score,
    });

    void sendStudyEvent({
      participantId, sessionId, eventName: "flag_captured",
      levelId: result.levelId,
      metadata: { flag: result.flag, score: result.score },
    });

    // After flag animation, show transition beat (or done)
    window.setTimeout(() => {
      if (currentLevelIndex >= levelOrder.length - 1) {
        // Last level — done
        const skipped = Object.values(levelResults)
          .concat([result])
          .filter((r) => r?.skipped)
          .map((r) => r!.levelId);
        setPhase("done");
        void sendStudyEvent({ participantId, sessionId, eventName: "mission_completed" });
        window.setTimeout(() => onComplete(skipped), 1500);
      } else {
        setPhase("transition");
      }
    }, 3400); // wait for flag capture animation
  }

  function advanceToNextLevel() {
    const nextIndex = currentLevelIndex + 1;
    setCurrentLevelIndex(nextIndex);
    const nextId = levelOrder[nextIndex];
    if (nextId) setStatusLine(levelReadyStatuses[nextId]);
    setStatusTone("info");
    setPhase("level");
  }

  // ── Render level ────────────────────────────────────────────────────────────

  function renderLevel() {
    if (!currentLevelId) return null;

    const commonProps = {
      participantId,
      sessionId,
      onComplete: handleLevelComplete,
      onBreach: handleBreach,
      onStatusChange: handleStatusChange,
      onBurst: handleBurst,
      attempts,
      onAttempt: handleAttempt,
      hintsUsed,
      startTime,
    };

    switch (currentLevelId) {
      case "caesar-cipher":
        return <CaesarCipherLevel {...commonProps} onUnlockCodex={(id) => handleUnlockCodex(id)} />;
      case "xor-stream":
        return <XorStreamLevel {...commonProps} onUnlockCodex={(id) => handleUnlockCodex(id)} />;
      case "block-cipher":
        return <BlockCipherLevel {...commonProps} onUnlockCodex={(id) => handleUnlockCodex(id)} />;
      case "phishing-inspector":
        return <PhishingInspectorLevel {...commonProps} onUnlockCodex={(id) => handleUnlockCodex(id)} />;
      case "network-defense":
        return <NetworkDefenseLevel {...commonProps} onUnlockCodex={(id) => handleUnlockCodex(id)} />;
      case "terminal-forensics":
        return <TerminalForensicsLevel {...commonProps} onUnlockCodex={(id) => handleUnlockCodex(id)} />;
      case "dual-role-defender":
        return <DualRoleDefenderLevel {...commonProps} onUnlockCodex={(id) => handleUnlockCodex(id)} />;
      case "soc-triage":
        return <SocTriageLevel {...commonProps} onUnlockCodex={(id) => handleUnlockCodex(id)} />;
    }
  }

  // ── Game canvas ─────────────────────────────────────────────────────────────

  return (
    <div className="terminal-canvas">
      {/* Score bar */}
      <ScoreBar
        score={totalScore}
        flagsCaptured={flagsCaptured}
        totalFlags={levelOrder.length}
        currentLevelId={currentLevelId ?? null}
        elapsedMs={elapsedMs}
      />

      {/* Overlays */}
      <BreachOverlay
        key={breachKey}
        active={breachActive}
        onDone={() => setBreachActive(false)}
      />
      {flagCaptureData && (
        <FlagCapture
          flag={flagCaptureData.flag}
          levelTitle={flagCaptureData.levelTitle}
          score={flagCaptureData.score}
          active={!!flagCaptureData}
          onDone={() => setFlagCaptureData(null)}
        />
      )}

      <div className="terminal-canvas-inner">

        {/* ── Boot intro ── */}
        {phase === "intro" && (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-2xl">
              <BootIntro onDone={() => {
                setPhase("level");
                void sendStudyEvent({ participantId, sessionId, eventName: "mission_started" });
              }} />
            </div>
          </div>
        )}

        {/* ── Transition beat ── */}
        {phase === "transition" && currentLevelId && currentLevelId !== "terminal-forensics" && currentLevelId !== "network-defense" && currentLevelId !== "dual-role-defender" && currentLevelId !== "soc-triage" && (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-2xl">
              <TransitionBeat
                lines={transitionBeats[currentLevelId as Exclude<typeof currentLevelId, "terminal-forensics" | "network-defense" | "dual-role-defender" | "soc-triage">].lines}
                action={transitionBeats[currentLevelId as Exclude<typeof currentLevelId, "terminal-forensics" | "network-defense" | "dual-role-defender" | "soc-triage">].action}
                onNext={advanceToNextLevel}
              />
            </div>
          </div>
        )}

        {/* ── Mission complete ── */}
        {phase === "done" && (
          <div className="flex flex-1 items-center justify-center">
            <div className="terminal-panel w-full max-w-xl space-y-4">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#4ade80]">// OPERATION SIGNAL GHOST -- COMPLETE</p>
              <div className="space-y-2 font-mono text-sm leading-7 text-[#d4a843]">
                <p>// ALL {levelOrder.length} TRANSMISSIONS ANALYSED</p>
                <p>// TOTAL SCORE: {totalScore.toLocaleString()} / {totalMaxScore.toLocaleString()}</p>
                <p>// FLAGS CAPTURED: {flagsCaptured}/{levelOrder.length}</p>
                <p>// LOGGING TO SIGNAL LOG...</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Active level — 2-column desktop layout ── */}
        {phase === "level" && (
          <div className="grid flex-1 min-h-0 gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">

            {/* Left: status strip + level component */}
            <div className="flex min-h-0 min-w-0 flex-col gap-3">
              {/* Status header */}
              <div className="terminal-panel flex shrink-0 items-center gap-3 px-3 py-2">
                <StatusWaveform state={waveformState} />
                <p className={[
                  "font-mono text-xs uppercase tracking-[0.22em] truncate",
                  statusTone === "success" ? "text-[#4ade80]" : statusTone === "error" ? "text-[#ef4444]" : "text-[#c3a257]",
                ].join(" ")}>
                  {statusLine}
                </p>
              </div>

              {/* Level component — scrollable if content overflows */}
              <div className="game-scroll-area flex-1 min-h-0 overflow-y-auto pr-1">
                {renderLevel()}
              </div>
            </div>

            {/* Right sidebar — fixed width, vertically stacked */}
            <div className="game-sidebar flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto xl:w-72 xl:shrink-0">

              {/* Intel / hints */}
              <div className="terminal-panel space-y-3 shrink-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[0.65rem] uppercase tracking-[0.28em] text-[#5a6a7a]">// Intel</p>
                  {hintsUnlocked > hintsRevealed && (
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[#4ade80]">NEW</span>
                  )}
                </div>

                <Button
                  variant="secondary"
                  onClick={handleRevealHint}
                  disabled={hintsRevealed >= hintsUnlocked}
                  fullWidth
                  className="rounded border border-[#1a2840] bg-[#10192a] font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#d4a843] hover:border-[#d4a843] hover:bg-[#10192a] hover:text-[#f2c96a]"
                >
                  {hintsUnlocked === 0
                    ? "// NO INTEL"
                    : hintsRevealed < hintsUnlocked
                      ? "// NEW INTEL"
                      : "// ALL REVIEWED"}
                </Button>

                {revealedHints.length > 0 ? (
                  <div className="space-y-2">
                    {revealedHints.map((hint, index) => (
                      <div key={hint} className="rounded border border-[#1a2840] bg-[#09111c] px-3 py-2 font-mono text-xs leading-5 text-[#c3a257]">
                        <p className="text-[0.6rem] uppercase tracking-[0.18em] text-[#4ade80]">{`// INTEL ${index + 1}`}</p>
                        <p className="mt-1 text-[#9aa8b8]">{hint}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-mono text-[0.65rem] text-[#3a4a5a]">// Unlocks after inactivity or failed attempts.</p>
                )}
              </div>

              {/* Signal Log / Codex */}
              <CodexPanel
                activeEntryId={activeCodexEntry}
                isOpen={codexOpen}
                onSelectEntry={(id) => setActiveCodexEntry(id)}
                onToggle={() => setCodexOpen((p) => !p)}
                unlockedEntries={unlockedCodexEntries}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLevelTitle(levelId: LevelId): string {
  const titles: Record<LevelId, string> = {
    "caesar-cipher":      "Transmission Alpha",
    "xor-stream":         "Transmission Bravo",
    "block-cipher":       "Transmission Charlie",
    "phishing-inspector": "Transmission Delta",
    "network-defense":    "Transmission Echo",
    "terminal-forensics": "Transmission Foxtrot",
    "dual-role-defender": "Transmission Golf",
    "soc-triage":         "Transmission Hotel",
  };
  return titles[levelId];
}

function getLevelHints(levelId: LevelId): string[] {
  const hints: Record<LevelId, string[]> = {
    "caesar-cipher": [
      "The shift value is likely small. Start in the single digits.",
      "All visible intercepts come from the same source — one key cleans all messages.",
      "A fixed alphabetic shift of 3 resolves the Alpha channel.",
    ],
    "xor-stream": [
      "Start with the core XOR rule: matching bits produce 0.",
      "Different bits produce 1. Apply the same rule to every recovery column.",
      "Use the calibrated rule straight across the row: 0110 XOR 1100 resolves to 1010.",
    ],
    "block-cipher": [
      "Plaintext enters first and ciphertext exits last.",
      "The IV randomises the first block. It is not the secret key.",
      "One valid flow is Plaintext → IV → Key → Encrypt → Ciphertext.",
    ],
    "phishing-inspector": [
      "Check the sender's full email address, not just the display name.",
      "Look for urgency language, threats of account suspension, and countdown timers.",
      "Hover over links — the domain in the URL should match the company it claims to be from.",
    ],
    "network-defense": [
      "Place defenses where threat paths converge — the router and server are high-traffic nodes.",
      "Each tool only blocks certain threat types. Match the defense to the threat.",
      "The database is critical — ensure its access path has at least one defense against every threat.",
    ],
    "terminal-forensics": [
      "Start with 'ls' to see the files, then 'cat auth.log' to begin your investigation.",
      "The auth.log shows login events — look for repeated failed attempts followed by a success from an unusual IP.",
      "Check the .bash_history file in the attacker's home directory — it shows every command they ran.",
    ],
    "dual-role-defender": [
      "The attacker's source IP appears in multiple log rows — look for the same IP in repeated entries.",
      "The event type in the log rows will match the attack you chose — SQL, AUTH, or traversal patterns.",
      "Your exact target parameter appears in the log details. Look for the value you entered in phase 1.",
    ],
    "soc-triage": [
      "Check source IPs — internal IPs (10.x.x.x) are more likely to be false positives from known systems.",
      "Look at the payload snippet carefully. Real attacks have recognisable patterns: SQL keywords, high-entropy strings, known scan signatures.",
      "Scheduled and automated systems (cron jobs, health checks, asset scanners) generate legitimate alerts that look suspicious.",
    ],
  };
  return hints[levelId];
}
