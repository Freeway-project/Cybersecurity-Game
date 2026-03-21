"use client";

import { useEffect, useRef, useState } from "react";

import { assessmentItems, likertLabels, priorExperienceLabels, studyCopy, surveyItems } from "@/config/study";
import { getClientEnv } from "@/config/env";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteShell } from "@/components/layout/site-shell";
import { GameplayExperience } from "@/modules/game";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import {
  priorCryptoExperienceOptions,
  type AssessmentItemId,
  type ConsentResponse,
  type InputType,
  type LikertScore,
  type PriorCryptoExperience,
  type StudyStep,
  type TokenResolutionResponse,
  type ViewportInfo,
} from "@/types/study";

const STORAGE_KEY = "pilot-study-state";

interface PersistedStudyState {
  currentStep: StudyStep;
  participantId: string;
  sessionId?: string;
  inviteToken?: string | null;
  tokenKey: string;
  devBypass?: boolean;
}

interface StudyExperienceProps {
  initialToken: string | null;
}

interface ConsentFormState {
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

const initialConsentForm: ConsentFormState = {
  cohort: "",
  yearLevel: "",
  priorCryptoExperience: "none",
};

const initialSurveyForm: SurveyFormState = {
  helpfulComment: "",
  confusingComment: "",
};

function getViewport(): ViewportInfo | null {
  if (typeof window === "undefined") {
    return null;
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function getInputType(): InputType {
  if (typeof window === "undefined") {
    return "unknown";
  }

  return window.matchMedia("(pointer: coarse)").matches ? "touch" : "mouse-keyboard";
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function StudyExperience({ initialToken }: StudyExperienceProps) {
  const devBypassEnabled =
    process.env.NODE_ENV !== "production" && getClientEnv().NEXT_PUBLIC_ENABLE_DEV_BYPASS;
  const [tokenState, setTokenState] = useState<TokenResolutionResponse | null>(null);
  const [currentStep, setCurrentStep] = useState<StudyStep>("landing");
  const [consentForm, setConsentForm] = useState<ConsentFormState>(initialConsentForm);
  const [preAnswers, setPreAnswers] = useState<Record<AssessmentItemId, string>>({
    "caesar-basics": "",
    "xor-alignment": "",
    "block-key-iv": "",
  });
  const [postAnswers, setPostAnswers] = useState<Record<AssessmentItemId, string>>({
    "caesar-basics": "",
    "xor-alignment": "",
    "block-key-iv": "",
  });
  const [surveyForm, setSurveyForm] = useState<SurveyFormState>(initialSurveyForm);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const loggedStepsRef = useRef<Set<StudyStep>>(new Set());

  const participantId = tokenState?.participantId ?? "";
  const tokenKey = initialToken ?? "__dev__";

  useEffect(() => {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!storedValue) {
      return;
    }

    try {
      const persisted = JSON.parse(storedValue) as PersistedStudyState;

      if (persisted.tokenKey === tokenKey) {
        setSessionId(persisted.sessionId ?? null);
        setCurrentStep(persisted.currentStep);
        setTokenState((previous) =>
          previous
            ? {
                ...previous,
                participantId: persisted.participantId,
                inviteToken: persisted.inviteToken ?? previous.inviteToken,
                devBypass: persisted.devBypass ?? previous.devBypass,
              }
            : previous,
        );
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [tokenKey]);

  useEffect(() => {
    async function resolveCurrentToken() {
      setLoading(true);
      setFeedback(null);

      try {
        const response = await fetch("/api/study/resolve-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: initialToken,
          }),
        });

        const payload = await readJson<TokenResolutionResponse>(response);

        if (!response.ok || !payload.ok) {
          setTokenState(payload);
          setCurrentStep("landing");
          return;
        }

        setTokenState(payload);
        setCurrentStep((previous) => (previous === "landing" ? "consent" : previous));
      } catch (error) {
        setTokenState({
          ok: false,
          status: "invalid",
          error: error instanceof Error ? error.message : "Unable to resolve invite.",
        });
      } finally {
        setLoading(false);
      }
    }

    void resolveCurrentToken();
  }, [initialToken]);

  useEffect(() => {
    if (!participantId || currentStep === "landing") {
      return;
    }

    const persisted: PersistedStudyState = {
      currentStep,
      participantId,
      sessionId: sessionId ?? undefined,
      inviteToken: tokenState?.inviteToken,
      devBypass: tokenState?.devBypass,
      tokenKey,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [currentStep, participantId, sessionId, tokenKey, tokenState?.devBypass, tokenState?.inviteToken]);

  useEffect(() => {
    if (!participantId || loggedStepsRef.current.has(currentStep)) {
      return;
    }

    if (currentStep === "consent") {
      loggedStepsRef.current.add(currentStep);
      void sendStudyEvent({
        participantId,
        eventName: "consent_viewed",
        sessionId,
        viewport: getViewport(),
        inputType: getInputType(),
      });
      return;
    }

    if (currentStep === "pretest" && sessionId) {
      loggedStepsRef.current.add(currentStep);
      void sendStudyEvent({
        participantId,
        sessionId,
        eventName: "pretest_started",
        viewport: getViewport(),
        inputType: getInputType(),
      });
      return;
    }

    if (currentStep === "posttest" && sessionId) {
      loggedStepsRef.current.add(currentStep);
      void sendStudyEvent({
        participantId,
        sessionId,
        eventName: "posttest_started",
        viewport: getViewport(),
        inputType: getInputType(),
      });
      return;
    }

    if (currentStep === "survey" && sessionId) {
      loggedStepsRef.current.add(currentStep);
      void sendStudyEvent({
        participantId,
        sessionId,
        eventName: "survey_started",
        viewport: getViewport(),
        inputType: getInputType(),
      });
    }
  }, [currentStep, participantId, sessionId]);

  async function handleConsentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/study/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId,
          inviteToken: tokenState?.inviteToken ?? null,
          cohort: consentForm.cohort || undefined,
          yearLevel: consentForm.yearLevel || undefined,
          priorCryptoExperience: consentForm.priorCryptoExperience,
          viewport: getViewport(),
          inputType: getInputType(),
        }),
      });

      const payload = await readJson<ConsentResponse & { error?: string }>(response);

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save consent.");
      }

      setSessionId(payload.sessionId);
      setCurrentStep("pretest");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save consent.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssessmentSubmit(phase: "pre" | "post") {
    if (!sessionId) {
      setFeedback("Session is not ready yet.");
      return;
    }

    const answers = phase === "pre" ? preAnswers : postAnswers;
    const hasMissingAnswer = assessmentItems.some((item) => !answers[item.id]);

    if (hasMissingAnswer) {
      setFeedback("Please answer all three questions before continuing.");
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/assessment/${phase}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId,
          sessionId,
          answers,
        }),
      });

      const payload = await readJson<{ ok: boolean; score: number; error?: string }>(response);

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Unable to submit answers.");
      }

      setFeedback(
        `${phase === "pre" ? "Pre-test" : "Post-test"} submitted. Score: ${payload.score}/${assessmentItems.length}.`,
      );
      setCurrentStep(phase === "pre" ? "game-placeholder" : "survey");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to submit answers.");
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
        headers: {
          "Content-Type": "application/json",
        },
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

      if (!surveyResponse.ok || !surveyPayload.ok) {
        throw new Error(surveyPayload.error ?? "Unable to save survey.");
      }

      const endResponse = await fetch("/api/session/end", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId,
          sessionId,
          completed: true,
        }),
      });

      const endPayload = await readJson<{ ok: boolean; error?: string }>(endResponse);

      if (!endResponse.ok || !endPayload.ok) {
        throw new Error(endPayload.error ?? "Unable to close the session.");
      }

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
    if (loading) {
      return (
        <Card className="p-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
            Token Gate
          </p>
          <h2 className="mt-4 text-2xl font-semibold text-[var(--ink)]">
            Resolving your study link
          </h2>
          <p className="mt-3 text-[var(--ink-muted)]">
            Verifying the invite token and preparing the anonymous participant session.
          </p>
        </Card>
      );
    }

    if (!tokenState?.ok) {
      return (
        <Card className="space-y-4 p-8">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
            Access
          </p>
          <h2 className="text-2xl font-semibold text-[var(--ink)]">
            {tokenState?.status === "completed" ? "Pilot already completed" : "Invite token required"}
          </h2>
          <p className="text-[var(--ink-muted)]">
            {tokenState?.error ??
              "This study link could not be verified. Use the invite link exactly as it was sent."}
          </p>
          {devBypassEnabled ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--card)]/70 p-4 text-sm text-[var(--ink-muted)]">
              Local development can use the dev bypass when
              {" "}
              <code>NEXT_PUBLIC_ENABLE_DEV_BYPASS=true</code>.
            </div>
          ) : null}
        </Card>
      );
    }

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
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink)]">
                  Cohort or course
                </span>
                <input
                  value={consentForm.cohort}
                  onChange={(event) =>
                    setConsentForm((previous) => ({
                      ...previous,
                      cohort: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
                  placeholder="Optional"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink)]">Year level</span>
                <input
                  value={consentForm.yearLevel}
                  onChange={(event) =>
                    setConsentForm((previous) => ({
                      ...previous,
                      yearLevel: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
                  placeholder="Optional"
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--ink)]">
                Prior cryptography experience
              </span>
              <select
                value={consentForm.priorCryptoExperience}
                onChange={(event) =>
                  setConsentForm((previous) => ({
                    ...previous,
                    priorCryptoExperience: event.target.value as PriorCryptoExperience,
                  }))
                }
                className="w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
              >
                {priorCryptoExperienceOptions.map((option) => (
                  <option key={option} value={option}>
                    {priorExperienceLabels[option]}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[var(--ink-muted)]">
                Anonymous participant ID:
                {" "}
                <span className="font-mono">{participantId}</span>
              </p>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving consent..." : "I agree and want to continue"}
              </Button>
            </div>
          </form>
        </Card>
      );
    }

    if (currentStep === "pretest" || currentStep === "posttest") {
      const phase = currentStep === "pretest" ? "pre" : "post";
      const answers = phase === "pre" ? preAnswers : postAnswers;

      return (
        <Card className="p-8">
          <div className="space-y-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
                {currentStep === "pretest" ? "Baseline assessment" : "Post-use assessment"}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-[var(--ink)]">
                {currentStep === "pretest"
                  ? "Answer three quick concept checks before gameplay"
                  : "Answer the same three checks after the gameplay slot"}
              </h2>
            </div>
            <div className="space-y-4">
              {assessmentItems.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/70 p-5"
                >
                  <p className="text-base font-semibold text-[var(--ink)]">
                    {index + 1}. {item.prompt}
                  </p>
                  <div className="mt-4 space-y-2">
                    {item.options.map((option) => (
                      <label
                        key={option.value}
                        className={[
                          "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-base transition",
                          answers[item.id] === option.value
                            ? "border-[var(--accent-strong)] bg-[var(--accent)]/18 text-white shadow-[0_0_0_1px_rgba(78,155,255,0.2)]"
                            : "border-[var(--border)] bg-[var(--card-strong)] text-[#f3f7ff] hover:bg-[var(--card-soft)]",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name={item.id}
                          value={option.value}
                          checked={answers[item.id] === option.value}
                          onChange={(event) => {
                            const updater =
                              phase === "pre" ? setPreAnswers : setPostAnswers;

                            updater((previous) => ({
                              ...previous,
                              [item.id]: event.target.value,
                            }));
                          }}
                          className="sr-only"
                        />
                        <span
                          className={answers[item.id] === option.value ? "font-medium text-white" : "font-medium text-[#f3f7ff]"}
                        >
                          {option.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void handleAssessmentSubmit(phase)} disabled={submitting}>
                {submitting ? "Submitting..." : currentStep === "pretest" ? "Save pre-test" : "Save post-test"}
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    if (currentStep === "game-placeholder") {
      return (
        <GameplayExperience
          participantId={participantId}
          sessionId={sessionId ?? ""}
          onComplete={() => {
            setCurrentStep("posttest");
            setFeedback(null);
          }}
        />
      );
    }

    if (currentStep === "survey") {
      return (
        <Card className="p-8">
          <form className="space-y-6" onSubmit={handleSurveySubmit}>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
                Perception survey
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
                        <span
                          className={[
                            "text-base font-semibold",
                            surveyForm[item.id] === value ? "text-white" : "text-[var(--ink)]",
                          ].join(" ")}
                        >
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
                          onChange={() =>
                            setSurveyForm((previous) => ({
                              ...previous,
                              [item.id]: value,
                            }))
                          }
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
                  onChange={(event) =>
                    setSurveyForm((previous) => ({
                      ...previous,
                      helpfulComment: event.target.value,
                    }))
                  }
                  className="min-h-36 w-full rounded-3xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink)]">What was confusing?</span>
                <textarea
                  value={surveyForm.confusingComment}
                  onChange={(event) =>
                    setSurveyForm((previous) => ({
                      ...previous,
                      confusingComment: event.target.value,
                    }))
                  }
                  className="min-h-36 w-full rounded-3xl border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-3 text-[var(--ink)] outline-none transition focus:border-[var(--accent-strong)]"
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Finishing..." : "Finish session"}
              </Button>
            </div>
          </form>
        </Card>
      );
    }

    return (
      <Card className="p-8">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
          Session complete
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-[var(--ink)]">
          Thank you for completing the pilot
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--ink-muted)]">
          Your assessment, survey, and session records have been stored with the anonymous participant ID.
        </p>
      </Card>
    );
  }

  return (
    <SiteShell
      eyebrow="Research Pilot"
      title={studyCopy.title}
      description={studyCopy.subtitle}
      compact={currentStep === "game-placeholder"}
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
