"use client";

import { useEffect, useRef, useState } from "react";

import { likertLabels, priorExperienceLabels, studyCopy, surveyItems } from "@/config/study";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteShell } from "@/components/layout/site-shell";
import { GameplayExperience } from "@/modules/game";
import { levelOrder } from "@/modules/game/content";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import {
  priorCryptoExperienceOptions,
  type ConsentResponse,
  type InputType,
  type LikertScore,
  type PriorCryptoExperience,
  type StudyStep,
  type ViewportInfo,
} from "@/types/study";

const STORAGE_KEY = "pilot-study-state";

interface PersistedStudyState {
  currentStep: StudyStep;
  participantId: string;
  sessionId?: string;
  name?: string;
  tokenKey: string;
}

interface StudyExperienceProps {
  initialName: string;
}

interface ConsentFormState {
  name: string;
  cohort: string;
  yearLevel: string;
  priorCryptoExperience: PriorCryptoExperience;
}

interface SurveyFormState {
  helpfulScore?: LikertScore;
  hintsScore?: LikertScore;
  engagementScore?: LikertScore;
  reuseScore?: LikertScore;
  helpfulComment: string;
  confusingComment: string;
}

const initialSurveyForm: SurveyFormState = {
  helpfulComment: "",
  confusingComment: "",
};

function getViewport(): ViewportInfo | null {
  if (typeof window === "undefined") return null;
  return { width: window.innerWidth, height: window.innerHeight };
}

function getInputType(): InputType {
  if (typeof window === "undefined") return "unknown";
  return window.matchMedia("(pointer: coarse)").matches ? "touch" : "mouse-keyboard";
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function StudyExperience({ initialName }: StudyExperienceProps) {
  const [currentStep, setCurrentStep] = useState<StudyStep>("consent");
  const [consentForm, setConsentForm] = useState<ConsentFormState>({
    name: initialName,
    cohort: "",
    yearLevel: "",
    priorCryptoExperience: "none",
  });
  const [skippedLevels, setSkippedLevels] = useState<string[]>([]);
  const [surveyForm, setSurveyForm] = useState<SurveyFormState>(initialSurveyForm);
  const [participantId, setParticipantId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const loggedStepsRef = useRef<Set<StudyStep>>(new Set());

  const tokenKey = initialName || "__anon__";

  /* Restore persisted state */
  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    if (!storedValue) return;
    try {
      const persisted = JSON.parse(storedValue) as PersistedStudyState;
      if (persisted.tokenKey === tokenKey && persisted.participantId) {
        setParticipantId(persisted.participantId);
        setSessionId(persisted.sessionId ?? null);
        setCurrentStep(persisted.currentStep);
        if (persisted.name) {
          setConsentForm((prev) => ({ ...prev, name: persisted.name! }));
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [tokenKey]);

  /* Persist state */
  useEffect(() => {
    if (!participantId || currentStep === "consent") return;
    const persisted: PersistedStudyState = {
      currentStep,
      participantId,
      sessionId: sessionId ?? undefined,
      name: consentForm.name,
      tokenKey,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [currentStep, participantId, sessionId, tokenKey, consentForm.name]);

  /* Log step-entry events */
  useEffect(() => {
    if (!participantId || loggedStepsRef.current.has(currentStep)) return;

    if (currentStep === "consent") {
      loggedStepsRef.current.add(currentStep);
      void sendStudyEvent({ participantId, eventName: "consent_viewed", sessionId, viewport: getViewport(), inputType: getInputType() });
      return;
    }

    if (currentStep === "survey" && sessionId) {
      loggedStepsRef.current.add(currentStep);
      void sendStudyEvent({ participantId, sessionId, eventName: "survey_started", viewport: getViewport(), inputType: getInputType() });
    }
  }, [currentStep, participantId, sessionId]);

  async function handleConsentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consentForm.name.trim()) {
      setFeedback("Please enter your name.");
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/study/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: consentForm.name.trim(),
          cohort: consentForm.cohort || undefined,
          yearLevel: consentForm.yearLevel || undefined,
          priorCryptoExperience: consentForm.priorCryptoExperience,
          viewport: getViewport(),
          inputType: getInputType(),
        }),
      });
      const payload = await readJson<ConsentResponse & { error?: string }>(response);
      if (!response.ok) throw new Error(payload.error ?? "Unable to save consent.");
      setParticipantId(payload.participantId);
      setSessionId(payload.sessionId);
      setCurrentStep("game-placeholder");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save consent.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSurveySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionId) {
      setFeedback("Session is not ready yet.");
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const surveyResponse = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          sessionId,
          helpfulScore: surveyForm.helpfulScore ?? undefined,
          hintsScore: surveyForm.hintsScore ?? undefined,
          engagementScore: surveyForm.engagementScore ?? undefined,
          reuseScore: surveyForm.reuseScore ?? undefined,
          helpfulComment: surveyForm.helpfulComment || undefined,
          confusingComment: surveyForm.confusingComment || undefined,
        }),
      });
      const surveyPayload = await readJson<{ ok: boolean; error?: string }>(surveyResponse);
      if (!surveyResponse.ok || !surveyPayload.ok) throw new Error(surveyPayload.error ?? "Unable to save survey.");

      const endResponse = await fetch("/api/session/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId,
          sessionId,
          completed: true,
          skippedLevels: skippedLevels.length > 0 ? skippedLevels : undefined,
        }),
      });
      const endPayload = await readJson<{ ok: boolean; error?: string }>(endResponse);
      if (!endResponse.ok || !endPayload.ok) throw new Error(endPayload.error ?? "Unable to close the session.");

      window.localStorage.removeItem(STORAGE_KEY);
      setCurrentStep("complete");
      setFeedback(null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to finish survey.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderStepCard() {
    if (currentStep === "consent") {
      return (
        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleConsentSubmit}>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
                {studyCopy.consentHeading}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--ink)]">
                Confirm participation before any study data is stored
              </h2>
            </div>
            <ul className="space-y-3 text-sm leading-6 text-[var(--ink-muted)]">
              {studyCopy.consentBullets.map((bullet) => (
                <li key={bullet} className="rounded-2xl bg-[var(--card)]/80 px-4 py-3">
                  {bullet}
                </li>
              ))}
            </ul>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--ink)]">
                Your name <span className="text-red-400">*</span>
              </span>
              <input
                type="text"
                value={consentForm.name}
                onChange={(e) => setConsentForm((prev) => ({ ...prev, name: e.target.value }))}
                required
                className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink)]">Cohort / Class</span>
                <input
                  type="text"
                  value={consentForm.cohort}
                  onChange={(e) => setConsentForm((prev) => ({ ...prev, cohort: e.target.value }))}
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink)]">Year level</span>
                <select
                  value={consentForm.yearLevel}
                  onChange={(e) => setConsentForm((prev) => ({ ...prev, yearLevel: e.target.value }))}
                  className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
                >
                  <option value="">Optional</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--ink)]">Prior cybersecurity experience</span>
              <select
                value={consentForm.priorCryptoExperience}
                onChange={(e) => setConsentForm((prev) => ({ ...prev, priorCryptoExperience: e.target.value as PriorCryptoExperience }))}
                className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
              >
                {priorCryptoExperienceOptions.map((option) => (
                  <option key={option} value={option}>
                    {priorExperienceLabels[option]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "I agree — begin mission"}
              </Button>
            </div>
          </form>
        </Card>
      );
    }

    if (currentStep === "game-placeholder") {
      return (
        <GameplayExperience
          participantId={participantId}
          sessionId={sessionId ?? ""}
          onComplete={(skipped) => {
            setSkippedLevels(skipped);
            setCurrentStep("survey");
            setFeedback(null);
          }}
        />
      );
    }

    if (currentStep === "debrief") {
      // Debrief is handled inside GameplayExperience — this step is a pass-through
      setCurrentStep("survey");
      return null;
    }

    if (currentStep === "survey") {
      return (
        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleSurveySubmit}>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
                // MISSION DEBRIEF
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--ink)]">
                Optional survey before you finish
              </h2>
              <p className="mt-2 text-base leading-7 text-[var(--ink-muted)]">
                You can rate any items you want, leave comments, or skip the survey and finish the session.
              </p>
            </div>
            <div className="space-y-4">
              {surveyItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/70 p-5"
                >
                  <p className="text-base font-semibold text-[var(--ink)]">{item.label}</p>
                  <div className="mt-4 grid gap-2 sm:grid-cols-5">
                    {(Object.keys(likertLabels) as unknown as LikertScore[]).map((value) => (
                      <label
                        key={value}
                        className={[
                          "flex cursor-pointer flex-col rounded-2xl border px-4 py-3 text-center text-sm transition",
                          surveyForm[item.id] === value
                            ? "border-[var(--accent-strong)] bg-[var(--accent)]/18 text-sky-50 shadow-[0_0_0_1px_rgba(78,155,255,0.2)]"
                            : "border-[var(--border)] bg-[var(--card-strong)] text-[#dbe7f8] hover:bg-[var(--card-soft)]",
                        ].join(" ")}
                      >
                        <span className={["text-base font-semibold", surveyForm[item.id] === value ? "text-white" : "text-[var(--ink)]"].join(" ")}>
                          {value}
                        </span>
                        <span className={surveyForm[item.id] === value ? "mt-1 font-medium text-sky-50" : "mt-1 font-medium text-[#dbe7f8]"}>
                          {likertLabels[value]}
                        </span>
                        <input
                          type="radio"
                          name={item.id}
                          value={value}
                          checked={surveyForm[item.id] === value}
                          onChange={() => setSurveyForm((prev) => ({ ...prev, [item.id]: value }))}
                          className="sr-only"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink)]">What helped most?</span>
                <textarea
                  value={surveyForm.helpfulComment}
                  onChange={(e) => setSurveyForm((prev) => ({ ...prev, helpfulComment: e.target.value }))}
                  className="min-h-36 w-full rounded-3xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink)]">What was confusing?</span>
                <textarea
                  value={surveyForm.confusingComment}
                  onChange={(e) => setSurveyForm((prev) => ({ ...prev, confusingComment: e.target.value }))}
                  className="min-h-36 w-full rounded-3xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Finishing..." : "Finish mission"}
              </Button>
            </div>
          </form>
        </Card>
      );
    }

    return (
      <Card className="p-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
          // OPERATION COMPLETE
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">
          Mission accomplished, Agent.
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--ink-muted)]">
          All {levelOrder.length} transmissions logged. Your gameplay and survey data have been stored.
        </p>
      </Card>
    );
  }

  const progressSteps = [
    { key: "consent", label: "Register" },
    { key: "game-placeholder", label: "Mission" },
    { key: "survey", label: "Survey" },
    { key: "complete", label: "Done" },
  ];

  const stepToProgressIndex: Record<StudyStep, number> = {
    landing: 0,
    consent: 0,
    briefing: 1,
    "game-placeholder": 1,
    debrief: 2,
    survey: 2,
    complete: 3,
  };

  return (
    <SiteShell
      eyebrow="Research Pilot"
      title={studyCopy.title}
      description={studyCopy.subtitle}
      compact={currentStep === "game-placeholder"}
      progressSteps={progressSteps}
      progressCurrent={stepToProgressIndex[currentStep]}
    >
      <div className="space-y-4">
        {feedback ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/12 px-4 py-3 text-sm text-amber-100">
            {feedback}
          </div>
        ) : null}
        {renderStepCard()}
      </div>
    </SiteShell>
  );
}
