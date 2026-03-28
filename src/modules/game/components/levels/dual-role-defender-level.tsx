"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { dualRoleDefenderLevel } from "@/modules/game/content";
import { calculateLevelScore } from "@/modules/game/scoring";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import type { LevelComponentProps } from "@/modules/game/types";

interface Props extends LevelComponentProps {
  onStatusChange: (line: string, tone: "info" | "error" | "success") => void;
  onUnlockCodex: (id: "dual-role-defender") => void;
  onBurst: () => void;
  attempts: number;
  onAttempt: (n: number) => void;
  hintsUsed: number;
  startTime: number;
}

type AttackType = "sql-injection" | "brute-force" | "directory-traversal";
type Phase = "attack-select" | "attack-input" | "attack-result" | "defender";

interface AttackRecord {
  type: AttackType;
  parameter: string;
  sourceIp: string;
}

interface LogRow {
  timestamp: string;
  sourceIp: string;
  eventType: string;
  details: string;
}

// Normalise for comparison: lowercase, strip non-alphanumeric
function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function attackTypeMatches(input: string, type: AttackType): boolean {
  const n = normalise(input);
  const keys: Record<AttackType, string> = {
    "sql-injection": "sqlinjection",
    "brute-force": "bruteforce",
    "directory-traversal": "directorytraversal",
  };
  const key = keys[type];
  return n === key || n.includes(key);
}

// Timestamps for the 4 attack rows, interspersed among the noise rows
const ATTACK_TIMESTAMPS = ["04:05:15", "04:11:58", "04:18:22", "04:26:09"];

function buildLogRows(attack: AttackRecord): LogRow[] {
  const config = dualRoleDefenderLevel;
  const vector = config.attackVectors.find((v) => v.id === attack.type)!;

  const attackRows: LogRow[] = vector.logRows.map((row, i) => ({
    timestamp: ATTACK_TIMESTAMPS[i] ?? "04:10:00",
    sourceIp: attack.sourceIp,
    eventType: row.eventType,
    details: row.detailTemplate.replace(/\{param\}/g, attack.parameter),
  }));

  const allRows: LogRow[] = [...config.noiseRows, ...attackRows];
  allRows.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return allRows;
}

export function DualRoleDefenderLevel({
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
  const config = dualRoleDefenderLevel;

  const [phase, setPhase] = useState<Phase>("attack-select");
  const [selectedVector, setSelectedVector] = useState<AttackType | null>(null);
  const [paramInput, setParamInput] = useState("");
  const [attackRecord, setAttackRecord] = useState<AttackRecord | null>(null);

  // Defender phase state
  const [solvedCount, setSolvedCount] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({ 0: "", 1: "", 2: "" });
  const [feedback, setFeedback] = useState<Record<number, "correct" | "wrong" | null>>({
    0: null, 1: null, 2: null,
  });
  const [completed, setCompleted] = useState(false);

  const logRows = useMemo(
    () => (attackRecord ? buildLogRows(attackRecord) : []),
    [attackRecord],
  );

  function pickAttackerIp(): string {
    const ips = config.attackerIps;
    return ips[Math.floor(Math.random() * ips.length)] ?? "10.0.4.77";
  }

  function handleSelectVector(type: AttackType) {
    setSelectedVector(type);
    setParamInput("");
    setPhase("attack-input");
  }

  function handleLaunchAttack() {
    if (!selectedVector || !paramInput.trim()) return;
    const record: AttackRecord = {
      type: selectedVector,
      parameter: paramInput.trim(),
      sourceIp: pickAttackerIp(),
    };
    setAttackRecord(record);
    setPhase("attack-result");
    onStatusChange("// ATTACK EXECUTED — SWITCHING TO DEFENDER MODE", "error");
    void sendStudyEvent({
      participantId, sessionId, eventName: "attempt_submitted",
      levelId: "dual-role-defender", taskId: "dual-role-simulation",
      metadata: { phase: "attack", attackType: selectedVector, parameter: paramInput.trim() },
    });
  }

  function handleSwitchToDefender() {
    setPhase("defender");
    onStatusChange("// DEFENDER MODE ACTIVE — IDENTIFY YOUR ATTACK IN THE LOG", "info");
  }

  function submitAnswer(fieldIndex: number) {
    if (!attackRecord || completed) return;
    if (fieldIndex !== solvedCount) return; // must solve in order

    const input = answers[fieldIndex] ?? "";

    let isCorrect = false;
    if (fieldIndex === 0) {
      isCorrect = attackTypeMatches(input, attackRecord.type);
    } else if (fieldIndex === 1) {
      isCorrect = normalise(input) === normalise(attackRecord.sourceIp);
    } else if (fieldIndex === 2) {
      isCorrect = normalise(input) === normalise(attackRecord.parameter);
    }

    if (isCorrect) {
      setFeedback((prev) => ({ ...prev, [fieldIndex]: "correct" }));
      const next = solvedCount + 1;
      setSolvedCount(next);
      if (next === 3) {
        // All 3 answered correctly
        setCompleted(true);
        onStatusChange("// ALL INDICATORS CONFIRMED — ATTACK IDENTIFIED", "success");
        onUnlockCodex("dual-role-defender");
        const { score } = calculateLevelScore({
          levelId: "dual-role-defender",
          attempts,
          hintsUsed,
          durationMs: Date.now() - startTime,
          skipped: false,
        });
        void sendStudyEvent({
          participantId, sessionId, eventName: "attempt_succeeded",
          levelId: "dual-role-defender", taskId: "dual-role-simulation",
        });
        onComplete({
          levelId: "dual-role-defender",
          flag: config.flag,
          score,
          attempts,
          hintsUsed,
          durationMs: Date.now() - startTime,
          skipped: false,
        });
      }
    } else {
      setFeedback((prev) => ({ ...prev, [fieldIndex]: "wrong" }));
      window.setTimeout(() => setFeedback((prev) => ({ ...prev, [fieldIndex]: null })), 900);
      const next = attempts + 1;
      onAttempt(next);
      onBreach();
      onStatusChange("// INCORRECT — RE-EXAMINE THE LOG", "error");
      void sendStudyEvent({
        participantId, sessionId, eventName: "attempt_failed",
        levelId: "dual-role-defender", taskId: "dual-role-simulation",
        attemptNo: next, metadata: { fieldIndex },
      });
    }
  }

  function handleSkip() {
    onComplete({
      levelId: "dual-role-defender",
      flag: config.flag,
      score: 0,
      attempts,
      hintsUsed,
      durationMs: Date.now() - startTime,
      skipped: true,
    });
  }

  const vector = selectedVector ? config.attackVectors.find((v) => v.id === selectedVector) : null;

  // ── Phase: Attack select ────────────────────────────────────────────────────
  if (phase === "attack-select") {
    return (
      <div className="terminal-panel space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#d4a843]">
            // PHASE 1 — OFFENSIVE SIMULATION
          </p>
          <p className="mt-2 font-mono text-xs leading-6 text-[#5a6a7a]">
            {config.mission}
          </p>
        </div>

        <div className="rounded border border-[#ef4444]/30 bg-[#1a0a0a] p-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ef4444]">
            {">"} TARGET SYSTEM: corp-internal.signal-ghost.net
          </p>
          <p className="mt-1 font-mono text-xs text-[#5a6a7a]">
            {">"} SELECT ATTACK VECTOR:
          </p>
        </div>

        <div className="space-y-2">
          {config.attackVectors.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => handleSelectVector(v.id as AttackType)}
              className="w-full rounded border border-[#1a2840] bg-[#0d1421] px-4 py-3 text-left font-mono text-xs transition hover:border-[#ef4444]/50 hover:bg-[#1a0a0a]"
            >
              <span className="text-[#ef4444]">[{v.shortcut}]</span>
              <span className="ml-2 uppercase tracking-[0.15em] text-[#d4a843]">{v.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Phase: Attack input ─────────────────────────────────────────────────────
  if (phase === "attack-input" && vector) {
    return (
      <div className="terminal-panel space-y-6">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#ef4444]">
          // SELECTED: {vector.label}
        </p>

        <div className="rounded border border-[#ef4444]/30 bg-[#1a0a0a] p-4 space-y-2">
          <p className="font-mono text-xs text-[#5a6a7a]">{">"} ATTACK MODULE: {vector.id}</p>
          <p className="font-mono text-xs text-[#d4a843]">{">"} {vector.prompt}</p>
          <div className="flex gap-2 items-center">
            <span className="font-mono text-xs text-[#ef4444]">{">"}</span>
            <input
              type="text"
              value={paramInput}
              onChange={(e) => setParamInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLaunchAttack()}
              placeholder={vector.exampleParam}
              className="flex-1 bg-transparent font-mono text-xs text-[#d4a843] outline-none placeholder:text-[#3a4a5a] caret-[#d4a843]"
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="ghost"

            onClick={() => setPhase("attack-select")}
            className="font-mono text-xs"
          >
            ← BACK
          </Button>
          <Button

            onClick={handleLaunchAttack}
            disabled={!paramInput.trim()}
            className="font-mono text-xs bg-[#ef4444] hover:bg-[#dc2626] text-white border-0"
          >
            // [EXECUTE ATTACK]
          </Button>
        </div>
      </div>
    );
  }

  // ── Phase: Attack result ────────────────────────────────────────────────────
  if (phase === "attack-result" && attackRecord && vector) {
    return (
      <div className="terminal-panel space-y-6">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#ef4444]">
          // ATTACK EXECUTED
        </p>

        <div className="rounded border border-[#ef4444]/40 bg-[#1a0a0a] p-4 space-y-1 font-mono text-xs leading-6">
          <p className="text-[#5a6a7a]">{">"} Connecting to corp-internal.signal-ghost.net...</p>
          <p className="text-[#d4a843]">{">"} Injecting {vector.label} payload...</p>
          <p className="text-[#d4a843]">{">"} Target parameter: <span className="text-[#ef4444]">{attackRecord.parameter}</span></p>
          <p className="text-[#5a6a7a]">{">"} Source routed via: <span className="text-[#d4a843]">{attackRecord.sourceIp}</span></p>
          <p className="mt-2 text-[#4ade80]">{">"} [!] ACCESS GRANTED — payload delivered</p>
          <p className="text-[#4ade80]">{">"} CONNECTION CLOSED — trace suppressed</p>
        </div>

        <p className="font-mono text-xs leading-6 text-[#5a6a7a]">
          You launched the attack. Now switch sides — find it in the log stream.
          Your source IP, attack type, and target are all in there.
        </p>

        <Button
          onClick={handleSwitchToDefender}
          className="w-full font-mono text-xs bg-[#4ade80] hover:bg-[#22c55e] text-[#06080f] border-0"
        >
          // [SWITCH TO DEFENDER MODE]
        </Button>
      </div>
    );
  }

  // ── Phase: Defender log review ──────────────────────────────────────────────
  if (phase === "defender" && attackRecord) {
    const defenderFields = [
      { label: "Attack type?", placeholder: "e.g. sql-injection" },
      { label: "Attacker source IP?", placeholder: "e.g. 10.0.x.x" },
      { label: "What was targeted?", placeholder: vector?.exampleParam ?? "target" },
    ];

    return (
      <div className="terminal-panel space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#4ade80]">
            // PHASE 2 — DEFENDER LOG REVIEW
          </p>
          <p className="mt-1 font-mono text-xs text-[#5a6a7a]">
            Analyse the log stream. Identify the attack you just launched.
          </p>
        </div>

        {/* Log table */}
        <div className="overflow-x-auto rounded border border-[#1a2840]">
          <table className="w-full font-mono text-[0.65rem] leading-6">
            <thead>
              <tr className="border-b border-[#1a2840] bg-[#0a1220]">
                <th className="px-3 py-2 text-left uppercase tracking-[0.15em] text-[#5a6a7a]">Time</th>
                <th className="px-3 py-2 text-left uppercase tracking-[0.15em] text-[#5a6a7a]">Source IP</th>
                <th className="px-3 py-2 text-left uppercase tracking-[0.15em] text-[#5a6a7a]">Event</th>
                <th className="px-3 py-2 text-left uppercase tracking-[0.15em] text-[#5a6a7a]">Details</th>
              </tr>
            </thead>
            <tbody>
              {logRows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-[#0d1421] even:bg-[#0a1220]/50 hover:bg-[#1a2840]/30"
                >
                  <td className="px-3 py-1.5 text-[#5a6a7a] whitespace-nowrap">{row.timestamp}</td>
                  <td className="px-3 py-1.5 text-[#d4a843] whitespace-nowrap">{row.sourceIp}</td>
                  <td className="px-3 py-1.5 text-[#c3a257] whitespace-nowrap">{row.eventType}</td>
                  <td className="px-3 py-1.5 text-[#4a5a6a] max-w-xs truncate">{row.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Answer fields */}
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#5a6a7a]">
            // Submit your findings:
          </p>
          {defenderFields.map((field, i) => {
            const isSolved = i < solvedCount;
            const isActive = i === solvedCount && !completed;
            const fb = feedback[i];

            return (
              <div
                key={i}
                className={[
                  "rounded border px-4 py-3 transition-colors",
                  isSolved ? "border-[#4ade80]/40 bg-[#0a1a10]" : isActive ? "border-[#d4a843]/40" : "border-[#1a2840] opacity-40",
                  fb === "wrong" ? "border-[#ef4444] !bg-[#1a0a0a]" : "",
                ].join(" ")}
              >
                <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#5a6a7a]">
                  {">"} {field.label}
                </p>
                {isSolved ? (
                  <p className="mt-1 font-mono text-xs text-[#4ade80]">
                    ✓ {i === 0 ? attackRecord.type : i === 1 ? attackRecord.sourceIp : attackRecord.parameter}
                  </p>
                ) : isActive ? (
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && submitAnswer(i)}
                      placeholder={field.placeholder}
                      className="flex-1 bg-transparent font-mono text-xs text-[#d4a843] outline-none placeholder:text-[#3a4a5a] caret-[#d4a843]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => submitAnswer(i)}
                      className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#d4a843] hover:text-[#f2c96a]"
                    >
                      [SUBMIT]
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {attempts >= 3 && !completed && (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleSkip} className="font-mono text-xs text-[#5a6a7a]">
              // [SKIP LEVEL]
            </Button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
