"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { socTriageLevel } from "@/modules/game/content";
import type { SocAlert } from "@/modules/game/content";
import { calculateLevelScore, levelMaxScores } from "@/modules/game/scoring";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import type { LevelComponentProps } from "@/modules/game/types";

interface Props extends LevelComponentProps {
  onStatusChange: (line: string, tone: "info" | "error" | "success") => void;
  onUnlockCodex: (id: "soc-triage") => void;
  onBurst: () => void;
  attempts: number;
  onAttempt: (n: number) => void;
  hintsUsed: number;
  startTime: number;
}

type Classification = "escalate" | "dismiss";

function shuffleAlerts(alerts: SocAlert[]): SocAlert[] {
  const arr = [...alerts];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

const SEV_COLOR: Record<SocAlert["severity"], string> = {
  CRITICAL: "text-[#ef4444]",
  HIGH: "text-[#f97316]",
  MEDIUM: "text-[#d4a843]",
  LOW: "text-[#5a6a7a]",
};

export function SocTriageLevel({
  participantId,
  sessionId,
  onComplete,
  onBreach,
  onStatusChange,
  onUnlockCodex,
  attempts,
  onAttempt,
  hintsUsed,
  startTime,
}: Props) {
  const config = socTriageLevel;

  // Shuffle alert order on mount (useMemo with empty deps = stable across re-renders)
  const shuffledAlerts = useMemo(() => shuffleAlerts(config.alerts), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [classifications, setClassifications] = useState<Record<string, Classification>>({});
  const [submitted, setSubmitted] = useState(false);
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);

  const allClassified = shuffledAlerts.every((a) => classifications[a.id] !== undefined);

  function classify(alertId: string, call: Classification) {
    if (submitted) return;
    setClassifications((prev) => ({ ...prev, [alertId]: call }));
  }

  function handleSubmit() {
    if (!allClassified || submitted || completed) return;

    const wrongs = shuffledAlerts.filter((a) => {
      const call = classifications[a.id];
      return (a.isThreat && call !== "escalate") || (!a.isThreat && call !== "dismiss");
    });

    const wrongSet = new Set(wrongs.map((a) => a.id));
    const correctCount = shuffledAlerts.length - wrongs.length;
    setWrongIds(wrongSet);
    setSubmitted(true);

    if (correctCount >= config.passingThreshold) {
      // Pass — score proportional to accuracy
      const baseMax = levelMaxScores["soc-triage"] ?? 1200;
      const proportionalMax = Math.round(baseMax * (correctCount / shuffledAlerts.length));
      const { score } = calculateLevelScore({
        levelId: "soc-triage",
        attempts,
        hintsUsed,
        durationMs: Date.now() - startTime,
        skipped: false,
      });
      // Apply accuracy multiplier on top of the time/attempt score
      const finalScore = Math.round(score * (correctCount / shuffledAlerts.length));

      setCompleted(true);
      onStatusChange(`// TRIAGE COMPLETE — ${correctCount}/${shuffledAlerts.length} CORRECT`, "success");
      onUnlockCodex("soc-triage");

      void sendStudyEvent({
        participantId, sessionId, eventName: "attempt_succeeded",
        levelId: "soc-triage", taskId: "soc-triage",
        metadata: { correctCount, totalAlerts: shuffledAlerts.length },
      });

      onComplete({
        levelId: "soc-triage",
        flag: config.flag,
        score: finalScore,
        attempts,
        hintsUsed,
        durationMs: Date.now() - startTime,
        skipped: false,
      });
    } else {
      // Fail
      const next = attempts + 1;
      onAttempt(next);
      onBreach();
      onStatusChange(
        `// TRIAGE FAILED — ${correctCount}/${shuffledAlerts.length} CORRECT — ${config.passingThreshold} REQUIRED`,
        "error",
      );
      void sendStudyEvent({
        participantId, sessionId, eventName: "attempt_failed",
        levelId: "soc-triage", taskId: "soc-triage",
        attemptNo: next, metadata: { correctCount, totalAlerts: shuffledAlerts.length },
      });

      // Allow retry after a short delay
      window.setTimeout(() => {
        setSubmitted(false);
        setWrongIds(new Set());
        setClassifications({});
      }, 2500);
    }
  }

  function handleSkip() {
    onComplete({
      levelId: "soc-triage",
      flag: config.flag,
      score: 0,
      attempts,
      hintsUsed,
      durationMs: Date.now() - startTime,
      skipped: true,
    });
  }

  return (
    <div className="terminal-panel space-y-6">
      {/* Header */}
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#d4a843]">
          // SOC ALERT FEED — TRIAGE REQUIRED
        </p>
        <p className="mt-1 font-mono text-xs leading-6 text-[#5a6a7a]">
          {config.mission}
        </p>
      </div>

      {/* Alert table */}
      <div className="space-y-2">
        {shuffledAlerts.map((alert) => {
          const call = classifications[alert.id];
          const isWrong = wrongIds.has(alert.id);

          return (
            <div
              key={alert.id}
              className={[
                "rounded border p-3 transition-colors",
                isWrong
                  ? "border-[#ef4444]/60 bg-[#1a0a0a]"
                  : call === "escalate"
                    ? "border-[#ef4444]/30 bg-[#120808]"
                    : call === "dismiss"
                      ? "border-[#4ade80]/20 bg-[#081208]"
                      : "border-[#1a2840]",
              ].join(" ")}
            >
              {/* Alert header row */}
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="flex items-center gap-3 font-mono text-[0.65rem]">
                  <span className="text-[#5a6a7a]">[{alert.id}]</span>
                  <span className={SEV_COLOR[alert.severity]}>{alert.severity}</span>
                  <span className="text-[#c3a257] uppercase tracking-[0.12em]">{alert.rule}</span>
                </div>
                <span className="font-mono text-[0.6rem] text-[#5a6a7a]">{alert.time}</span>
              </div>

              {/* Details row */}
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 font-mono text-[0.65rem] text-[#4a5a6a]">
                <span>SRC: <span className="text-[#d4a843]">{alert.sourceIp}</span></span>
                <span className="truncate max-w-xs">{alert.payloadSnippet}</span>
              </div>

              {/* Wrong explanation */}
              {isWrong && (
                <p className="mt-2 font-mono text-[0.65rem] text-[#ef4444] leading-5">
                  ✗ {alert.explanation}
                </p>
              )}

              {/* Classification buttons */}
              {!completed && (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => classify(alert.id, "escalate")}
                    disabled={submitted}
                    className={[
                      "rounded border px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] transition",
                      call === "escalate"
                        ? "border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]"
                        : "border-[#3a2020] text-[#5a6a7a] hover:border-[#ef4444]/50 hover:text-[#ef4444]",
                    ].join(" ")}
                  >
                    ESCALATE
                  </button>
                  <button
                    type="button"
                    onClick={() => classify(alert.id, "dismiss")}
                    disabled={submitted}
                    className={[
                      "rounded border px-3 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] transition",
                      call === "dismiss"
                        ? "border-[#4ade80]/60 bg-[#4ade80]/10 text-[#4ade80]"
                        : "border-[#1a3020] text-[#5a6a7a] hover:border-[#4ade80]/40 hover:text-[#4ade80]",
                    ].join(" ")}
                  >
                    DISMISS
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-[0.65rem] text-[#5a6a7a]">
          {Object.keys(classifications).length}/{shuffledAlerts.length} classified
          {" · "}need {config.passingThreshold}/{shuffledAlerts.length} correct to pass
        </p>
        <div className="flex gap-3">
          {attempts >= 2 && !completed && (
            <Button variant="ghost" onClick={handleSkip} className="font-mono text-xs text-[#5a6a7a]">
              // [SKIP]
            </Button>
          )}
          {!completed && (
            <Button
  
              onClick={handleSubmit}
              disabled={!allClassified || submitted}
              className="font-mono text-xs bg-[#d4a843] hover:bg-[#b8903a] text-[#06080f] border-0"
            >
              // [SUBMIT TRIAGE REPORT]
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
