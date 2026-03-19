import { randomUUID } from "crypto";

import { z } from "zod";

import { assessmentItems } from "@/config/study";
import { buildDeviceContext } from "@/lib/device-context";
import { getMongoDb } from "@/lib/mongodb";
import { ensureStudyIndexes, logStudyEvent } from "@/modules/instrumentation/server";
import type {
  AssessmentPhase,
  AssessmentAnswer,
  AssessmentRecord,
  ConsentResponse,
  ParticipantRecord,
  SessionRecord,
  SurveyRecord,
} from "@/types/study";

const consentSchema = z.object({
  participantId: z.string().min(1),
  inviteToken: z.string().nullable().optional(),
  cohort: z.string().trim().max(120).optional(),
  yearLevel: z.string().trim().max(120).optional(),
  priorCryptoExperience: z.enum(["none", "some", "moderate", "strong"]),
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .nullable(),
  inputType: z.enum(["touch", "mouse-keyboard", "unknown"]),
});

const assessmentSchema = z.object({
  participantId: z.string().min(1),
  sessionId: z.string().min(1),
  answers: z.object({
    "caesar-basics": z.string().min(1),
    "xor-alignment": z.string().min(1),
    "block-key-iv": z.string().min(1),
  }),
});

const surveySchema = z.object({
  participantId: z.string().min(1),
  sessionId: z.string().min(1),
  helpfulScore: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  hintsScore: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  engagementScore: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  reuseScore: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  helpfulComment: z.string().trim().max(1200).optional(),
  confusingComment: z.string().trim().max(1200).optional(),
});

const sessionEndSchema = z.object({
  participantId: z.string().min(1),
  sessionId: z.string().min(1),
  completed: z.boolean(),
});

export async function acceptConsent(rawInput: unknown, userAgent: string | null): Promise<ConsentResponse> {
  await ensureStudyIndexes();
  const input = consentSchema.parse(rawInput);
  const db = await getMongoDb();
  const now = new Date();

  const existingSession = await db.collection<SessionRecord>("sessions").findOne({
    participantId: input.participantId,
    completed: false,
  });

  const deviceContext = buildDeviceContext({
    userAgent,
    viewport: input.viewport,
    inputType: input.inputType,
  });

  await db.collection<ParticipantRecord>("participants").updateOne(
    { participantId: input.participantId },
    {
      $set: {
        consentAccepted: true,
        cohort: input.cohort,
        yearLevel: input.yearLevel,
        priorCryptoExperience: input.priorCryptoExperience,
        updatedAt: now,
      },
      $setOnInsert: {
        participantId: input.participantId,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  const sessionId = existingSession?.sessionId ?? randomUUID();

  await db.collection<SessionRecord>("sessions").updateOne(
    { sessionId },
    {
      $set: {
        participantId: input.participantId,
        deviceType: deviceContext.deviceType,
        browserFamily: deviceContext.browserFamily,
        osFamily: deviceContext.osFamily,
        viewport: deviceContext.viewport,
        inputType: deviceContext.inputType,
        completed: false,
      },
      $setOnInsert: {
        sessionId,
        startedAt: now,
      },
    },
    { upsert: true },
  );

  await logStudyEvent(
    {
      participantId: input.participantId,
      sessionId,
      eventName: "consent_accepted",
      viewport: input.viewport,
      inputType: input.inputType,
      metadata: {
        inviteTokenPresent: Boolean(input.inviteToken),
        priorCryptoExperience: input.priorCryptoExperience,
      },
    },
    userAgent,
  );

  await logStudyEvent(
    {
      participantId: input.participantId,
      sessionId,
      eventName: "session_started",
      viewport: input.viewport,
      inputType: input.inputType,
    },
    userAgent,
  );

  return {
    ok: true,
    sessionId,
    participantId: input.participantId,
  };
}

export async function submitAssessment(
  phase: AssessmentPhase,
  rawInput: unknown,
  userAgent: string | null,
) {
  await ensureStudyIndexes();
  const input = assessmentSchema.parse(rawInput);
  const scoreMap = Object.fromEntries(
    assessmentItems.map((item) => [
      item.id,
      {
        answer: input.answers[item.id],
        correct: input.answers[item.id] === item.correctAnswer,
      },
    ]),
  ) as Record<string, AssessmentAnswer>;

  const score = Object.values(scoreMap).filter((entry) => entry.correct).length;
  const db = await getMongoDb();

  await db.collection<AssessmentRecord>("assessments").updateOne(
    { participantId: input.participantId },
    {
      $set: {
        updatedAt: new Date(),
        ...(phase === "pre"
          ? { preScore: score, itemScoresPre: scoreMap }
          : { postScore: score, itemScoresPost: scoreMap }),
      },
      $setOnInsert: {
        participantId: input.participantId,
      },
    },
    { upsert: true },
  );

  await logStudyEvent(
    {
      participantId: input.participantId,
      sessionId: input.sessionId,
      eventName: phase === "pre" ? "pretest_submitted" : "posttest_submitted",
      result: `${score}/${assessmentItems.length}`,
    },
    userAgent,
  );

  return {
    ok: true,
    score,
    phase,
  };
}

export async function submitSurvey(rawInput: unknown, userAgent: string | null) {
  await ensureStudyIndexes();
  const input = surveySchema.parse(rawInput);
  const db = await getMongoDb();

  const surveyRecord: SurveyRecord = {
    participantId: input.participantId,
    helpfulScore: input.helpfulScore,
    hintsScore: input.hintsScore,
    engagementScore: input.engagementScore,
    reuseScore: input.reuseScore,
    helpfulComment: input.helpfulComment,
    confusingComment: input.confusingComment,
    submittedAt: new Date(),
  };

  await db.collection<SurveyRecord>("surveys").updateOne(
    { participantId: input.participantId },
    { $set: surveyRecord },
    { upsert: true },
  );

  await logStudyEvent(
    {
      participantId: input.participantId,
      sessionId: input.sessionId,
      eventName: "survey_completed",
      metadata: {
        helpfulScore: input.helpfulScore,
        hintsScore: input.hintsScore,
        engagementScore: input.engagementScore,
        reuseScore: input.reuseScore,
      },
    },
    userAgent,
  );

  return { ok: true };
}

export async function endSession(rawInput: unknown, userAgent: string | null) {
  await ensureStudyIndexes();
  const input = sessionEndSchema.parse(rawInput);
  const db = await getMongoDb();

  await db.collection<SessionRecord>("sessions").updateOne(
    { sessionId: input.sessionId, participantId: input.participantId },
    {
      $set: {
        completed: input.completed,
        endedAt: new Date(),
      },
    },
  );

  await logStudyEvent(
    {
      participantId: input.participantId,
      sessionId: input.sessionId,
      eventName: "session_ended",
      result: input.completed ? "completed" : "partial",
    },
    userAgent,
  );

  return { ok: true };
}
