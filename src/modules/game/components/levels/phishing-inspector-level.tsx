"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { phishingInspectorLevel } from "@/modules/game/content";
import type { PhishingEmail, SuspiciousElement } from "@/modules/game/content";
import { calculateLevelScore } from "@/modules/game/scoring";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import type { LevelComponentProps } from "@/modules/game/types";

interface Props extends LevelComponentProps {
  onStatusChange: (line: string, tone: "info" | "error" | "success") => void;
  onUnlockCodex: (id: "phishing-inspector") => void;
  onBurst: () => void;
  attempts: number;
  onAttempt: (n: number) => void;
  hintsUsed: number;
  startTime: number;
}

export function PhishingInspectorLevel({
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
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [foundSuspicious, setFoundSuspicious] = useState<Set<string>>(new Set());
  const [verdict, setVerdict] = useState<"phishing" | "legitimate" | null>(null);
  const [verdictFeedback, setVerdictFeedback] = useState<string | null>(null);
  const [emailResults, setEmailResults] = useState<("phishing" | "legitimate" | null)[]>(
    Array.from({ length: phishingInspectorLevel.emails.length }, () => null),
  );
  const [completed, setCompleted] = useState(false);
  const [showReveal, setShowReveal] = useState(false);

  const currentEmail = phishingInspectorLevel.emails[currentEmailIndex];
  const isLastEmail = currentEmailIndex === phishingInspectorLevel.emails.length - 1;

  function toggleSuspicious(element: SuspiciousElement) {
    setFoundSuspicious((prev) => {
      const next = new Set(prev);
      if (next.has(element.id)) {
        next.delete(element.id);
      } else {
        next.add(element.id);
        void sendStudyEvent({
          participantId, sessionId, eventName: "phishing_element_found",
          levelId: "phishing-inspector", taskId: "email-inspection",
          metadata: { elementId: element.id, elementType: element.type, emailId: currentEmail?.id },
        });
      }
      return next;
    });
  }

  function handleSkip() {
    setCompleted(true);
    onUnlockCodex("phishing-inspector");
    onStatusChange("// TRANSMISSION BYPASSED -- SIGNAL LOG UPDATED", "info");
    void sendStudyEvent({ participantId, sessionId, eventName: "level_skipped", levelId: "phishing-inspector", taskId: "email-inspection", attemptNo: attempts, durationMs: Date.now() - startTime });
    const { score } = calculateLevelScore({ levelId: "phishing-inspector", attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true });
    onComplete({ levelId: "phishing-inspector", flag: phishingInspectorLevel.flag, score, attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true });
  }

  function submitVerdict(selected: "phishing" | "legitimate") {
    if (!currentEmail) return;
    const attemptNo = attempts + 1;
    onAttempt(attemptNo);
    setVerdict(selected);

    const isCorrect = selected === (currentEmail.isPhishing ? "phishing" : "legitimate");

    void sendStudyEvent({
      participantId, sessionId, eventName: isCorrect ? "attempt_succeeded" : "attempt_failed",
      levelId: "phishing-inspector", taskId: "email-inspection", attemptNo,
      result: isCorrect ? "correct-verdict" : "wrong-verdict",
      metadata: { emailId: currentEmail.id, verdict: selected, expected: currentEmail.isPhishing ? "phishing" : "legitimate", suspiciousFound: foundSuspicious.size },
    });

    if (!isCorrect) {
      setVerdictFeedback(
        selected === "phishing"
          ? "// MISCLASSIFIED: This email is legitimate. Review the sender and context carefully."
          : "// BREACH DETECTED: This was a phishing email. Check the sender domain and suspicious links.",
      );
      onBreach();
      onStatusChange("// MISCLASSIFICATION -- PHISHING ATTEMPT MISSED", "error");
      void sendStudyEvent({ participantId, sessionId, eventName: "breach_detected", levelId: "phishing-inspector", taskId: "email-inspection", metadata: { emailId: currentEmail.id } });
      setShowReveal(true);
      return;
    }

    const nextResults = [...emailResults];
    nextResults[currentEmailIndex] = selected;
    setEmailResults(nextResults);
    setVerdictFeedback(
      currentEmail.isPhishing
        ? `// CORRECT: Phishing detected. ${foundSuspicious.size}/${currentEmail.suspicious.length} indicators found.`
        : "// CORRECT: Email is legitimate.",
    );
    onStatusChange("// EMAIL CLASSIFIED -- PROCEEDING", "info");
    setShowReveal(currentEmail.isPhishing);

    if (isLastEmail) {
      const allCorrect = nextResults.every((r, i) => r === (phishingInspectorLevel.emails[i]?.isPhishing ? "phishing" : "legitimate"));
      if (allCorrect) {
        const durationMs = Date.now() - startTime;
        const { score } = calculateLevelScore({ levelId: "phishing-inspector", attempts: attemptNo, hintsUsed, durationMs, skipped: false });
        setTimeout(() => {
          setCompleted(true);
          onBurst();
          onUnlockCodex("phishing-inspector");
          onStatusChange("// PHISHING CAMPAIGN IDENTIFIED -- DELTA FRAGMENT LOGGED", "success");
          void sendStudyEvent({ participantId, sessionId, eventName: "level_completed", levelId: "phishing-inspector", taskId: "email-inspection", attemptNo, durationMs, result: "completed" });
          onComplete({ levelId: "phishing-inspector", flag: phishingInspectorLevel.flag, score, attempts: attemptNo, hintsUsed, durationMs, skipped: false });
        }, 1800);
      }
    }
  }

  function advanceEmail() {
    setCurrentEmailIndex((p) => p + 1);
    setVerdict(null);
    setVerdictFeedback(null);
    setFoundSuspicious(new Set());
    setShowReveal(false);
  }

  if (completed) {
    return (
      <div className="space-y-4">
        <div className="terminal-panel relative overflow-hidden">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#4ade80]">// PHISHING CAMPAIGN NEUTRALISED</p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[#5a6a7a]">// CONTENT: CLASSIFIED FRAGMENT 4/6</p>
          <div className="mt-5 space-y-2 font-mono text-sm leading-7 text-[#d4a843]">
            <p>// ALL {phishingInspectorLevel.emails.length} EMAILS CLASSIFIED</p>
            <p>// PHISHING SOURCE: EXTERNAL THREAT ACTOR</p>
            <p>// CAMPAIGN TRACED -- NETWORK TOPOLOGY COMPROMISED</p>
            <p>// LOGGING TO SIGNAL LOG...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentEmail) return null;

  const emailProgress = emailResults.filter((r) => r !== null).length;

  return (
    <div className="space-y-4">
      <div className="terminal-panel">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">
            {`// EMAIL INTERCEPT ${currentEmailIndex + 1} OF ${phishingInspectorLevel.emails.length}`}
          </p>
          <div className="flex gap-2">
            {phishingInspectorLevel.emails.map((_, i) => (
              <div key={i} className={[
                "h-2 w-6 rounded-full",
                i < emailProgress ? "bg-[#4ade80]" : i === currentEmailIndex ? "bg-[#d4a843]" : "bg-[#1a2840]",
              ].join(" ")} />
            ))}
          </div>
        </div>
      </div>

      {/* Faux email client */}
      <div className="terminal-panel space-y-0 overflow-hidden p-0">
        {/* Email header */}
        <div className="border-b border-[#1a2840] bg-[#09111c] px-5 py-4 space-y-2">
          <div className="flex items-start gap-3 font-mono text-xs">
            <span className="w-14 shrink-0 uppercase tracking-[0.18em] text-[#5a6a7a]">FROM</span>
            <span className="text-[#d4a843]">{currentEmail.from.name}</span>
            <span className="text-[#5a6a7a]">&lt;{currentEmail.from.address}&gt;</span>
          </div>
          <div className="flex items-start gap-3 font-mono text-xs">
            <span className="w-14 shrink-0 uppercase tracking-[0.18em] text-[#5a6a7a]">TO</span>
            <span className="text-[#c3a257]">{currentEmail.to}</span>
          </div>
          <div className="flex items-start gap-3 font-mono text-xs">
            <span className="w-14 shrink-0 uppercase tracking-[0.18em] text-[#5a6a7a]">SUBJ</span>
            <span className="font-semibold text-[#edf4ff]">{currentEmail.subject}</span>
          </div>
          <div className="flex items-start gap-3 font-mono text-xs">
            <span className="w-14 shrink-0 uppercase tracking-[0.18em] text-[#5a6a7a]">TIME</span>
            <span className="text-[#5a6a7a]">{currentEmail.timestamp}</span>
          </div>
        </div>

        {/* Email body */}
        <div className="px-5 py-5 font-mono text-sm leading-7 text-[#c3a257]">
          {currentEmail.bodyLines.map((line, i) => (
            <div key={i} className="min-h-[1.75rem]">{line || "\u00a0"}</div>
          ))}
        </div>

        {/* Suspicious elements to click */}
        {currentEmail.suspicious.length > 0 && !showReveal && (
          <div className="border-t border-[#1a2840] bg-[#06080f] px-5 py-4">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[#5a6a7a]">
              // CLICK TO FLAG SUSPICIOUS ELEMENTS
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {currentEmail.suspicious.map((el) => {
                const isFound = foundSuspicious.has(el.id);
                return (
                  <button
                    key={el.id}
                    type="button"
                    onClick={() => toggleSuspicious(el)}
                    className={[
                      "rounded border px-3 py-2 font-mono text-xs transition",
                      isFound
                        ? "border-[#ef4444] bg-[#1a0808] text-[#ef4444]"
                        : "border-[#1a2840] bg-[#0d1625] text-[#d4a843] hover:border-[#ef4444] hover:text-[#ef4444]",
                    ].join(" ")}
                  >
                    {isFound ? "⚑ " : "○ "}{el.text.length > 36 ? el.text.slice(0, 36) + "…" : el.text}
                  </button>
                );
              })}
            </div>
            {foundSuspicious.size > 0 && (
              <div className="mt-3 space-y-2">
                {currentEmail.suspicious.filter((el) => foundSuspicious.has(el.id)).map((el) => (
                  <div key={el.id} className="rounded border border-[#ef4444]/30 bg-[#1a0808] px-3 py-2 font-mono text-xs text-[#f87171]">
                    <span className="text-[#ef4444]">[{el.type.toUpperCase()}]</span> {el.explanation}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reveal after wrong answer or correct phishing */}
        {showReveal && currentEmail.isPhishing && currentEmail.suspicious.length > 0 && (
          <div className="border-t border-[#1a2840] bg-[#06080f] px-5 py-4">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[#ef4444]">// PHISHING INDICATORS REVEALED</p>
            <div className="mt-3 space-y-2">
              {currentEmail.suspicious.map((el) => (
                <div key={el.id} className="rounded border border-[#ef4444]/30 bg-[#1a0808] px-3 py-2 font-mono text-xs text-[#f87171]">
                  <span className="text-[#ef4444]">[{el.type.toUpperCase()}]</span> {el.explanation}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Verdict feedback */}
      {verdictFeedback && (
        <div className={["terminal-panel font-mono text-sm", verdict && emailResults[currentEmailIndex] !== null && emailResults[currentEmailIndex] !== undefined ? "border-[#4ade80]/30 text-[#4ade80]" : "border-[#ef4444]/30 text-[#ef4444]"].join(" ")}>
          {verdictFeedback}
        </div>
      )}

      {/* Action buttons */}
      {!verdict && (
        <div className="terminal-panel space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#5a6a7a]">// CLASSIFY THIS EMAIL</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => submitVerdict("phishing")}
              className="flex-1 rounded border border-[#ef4444]/40 bg-[#1a0808] px-4 py-3 font-mono text-sm uppercase tracking-[0.18em] text-[#ef4444] transition hover:border-[#ef4444] hover:bg-[#220a0a]"
            >
              ⚠ PHISHING
            </button>
            <button
              type="button"
              onClick={() => submitVerdict("legitimate")}
              className="flex-1 rounded border border-[#4ade80]/40 bg-[#081a10] px-4 py-3 font-mono text-sm uppercase tracking-[0.18em] text-[#4ade80] transition hover:border-[#4ade80] hover:bg-[#0a2215]"
            >
              ✓ LEGITIMATE
            </button>
          </div>
          {attempts >= 3 && (
            <Button variant="secondary" onClick={handleSkip} className="w-full rounded border border-[#624616] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] hover:bg-[#2a1c08]">
              // BYPASS DELTA
            </Button>
          )}
        </div>
      )}

      {verdict && !isLastEmail && (
        <div className="flex justify-end">
          <Button onClick={advanceEmail} className="rounded border border-[#1a2840] bg-[#162134] font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] shadow-none hover:bg-[#1d2a43]">
            {`// NEXT EMAIL (${currentEmailIndex + 2}/${phishingInspectorLevel.emails.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}
