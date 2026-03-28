import { randomUUID } from "crypto";

import { z } from "zod";

import { buildDeviceContext } from "@/lib/device-context";
import { getMongoDb } from "@/lib/mongodb";
import { ensureStudyIndexes, logStudyEvent } from "@/modules/instrumentation/server";
import { GAME_VERSION } from "@/config/study";
import type {
  ConsentResponse,
  ParticipantRecord,
  SessionRecord,
  SurveyRecord,
} from "@/types/study";

const consentSchema = z.object({
  participantId: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Name is required"),
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

const surveySchema = z.object({
  participantId: z.string().min(1),
  sessionId: z.string().min(1),
  helpfulScore: z.coerce.number().int().min(1).max(5).optional(),
  hintsScore: z.coerce.number().int().min(1).max(5).optional(),
  engagementScore: z.coerce.number().int().min(1).max(5).optional(),
  reuseScore: z.coerce.number().int().min(1).max(5).optional(),
  helpfulComment: z.string().trim().max(1200).optional(),
  confusingComment: z.string().trim().max(1200).optional(),
});

const sessionEndSchema = z.object({
  participantId: z.string().min(1),
  sessionId: z.string().min(1),
  completed: z.boolean(),
  skippedLevels: z.array(z.string()).optional(),
});

export async function acceptConsent(rawInput: unknown, userAgent: string | null): Promise<ConsentResponse> {
  const input = consentSchema.parse(rawInput);
  const db = await getMongoDb();
  const now = new Date();

  const participantId = input.participantId || randomUUID();

  const [_, existingSession] = await Promise.all([
    ensureStudyIndexes(),
    db.collection<SessionRecord>("sessions").findOne({
      participantId,
      completed: false,
    })
  ]);

  const deviceContext = buildDeviceContext({
    userAgent,
    viewport: input.viewport,
    inputType: input.inputType,
  });

  const sessionId = existingSession?.sessionId ?? randomUUID();

  await Promise.all([
    db.collection<ParticipantRecord>("participants").updateOne(
      { participantId },
      {
        $set: {
          consentAccepted: true,
          name: input.name,
          cohort: input.cohort,
          yearLevel: input.yearLevel,
          priorCryptoExperience: input.priorCryptoExperience,
          updatedAt: now,
        },
        $setOnInsert: {
          participantId,
          createdAt: now,
        },
      },
      { upsert: true },
    ),
    db.collection<SessionRecord>("sessions").updateOne(
      { sessionId },
      {
        $set: {
          participantId,
          gameVersion: GAME_VERSION,
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
    ),
    logStudyEvent(
      {
        participantId,
        sessionId,
        eventName: "consent_accepted",
        viewport: input.viewport,
        inputType: input.inputType,
        metadata: {
          priorCryptoExperience: input.priorCryptoExperience,
          name: input.name,
        },
      },
      userAgent,
    ),
    logStudyEvent(
      {
        participantId,
        sessionId,
        eventName: "session_started",
        viewport: input.viewport,
        inputType: input.inputType,
      },
      userAgent,
    )
  ]);

  return {
    ok: true,
    sessionId,
    participantId,
  };
}

export async function submitSurvey(rawInput: unknown, userAgent: string | null) {
  await ensureStudyIndexes();
  const input = surveySchema.parse(rawInput);
  const db = await getMongoDb();
  const hasSurveyContent = Boolean(
    input.helpfulScore ??
      input.hintsScore ??
      input.engagementScore ??
      input.reuseScore ??
      input.helpfulComment ??
      input.confusingComment,
  );

  if (hasSurveyContent) {
    const surveyRecord: SurveyRecord = {
      participantId: input.participantId,
      helpfulScore: input.helpfulScore as SurveyRecord["helpfulScore"],
      hintsScore: input.hintsScore as SurveyRecord["hintsScore"],
      engagementScore: input.engagementScore as SurveyRecord["engagementScore"],
      reuseScore: input.reuseScore as SurveyRecord["reuseScore"],
      helpfulComment: input.helpfulComment,
      confusingComment: input.confusingComment,
      submittedAt: new Date(),
    };

    await db.collection<SurveyRecord>("surveys").updateOne(
      { participantId: input.participantId },
      { $set: surveyRecord },
      { upsert: true },
    );
  }

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
        skipped: !hasSurveyContent,
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
        ...(input.skippedLevels ? { skippedLevels: input.skippedLevels } : {}),
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
