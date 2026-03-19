import { z } from "zod";

import { buildDeviceContext } from "@/lib/device-context";
import { getMongoDb } from "@/lib/mongodb";
import type {
  ClientStudyEventInput,
  InviteRecord,
  ParticipantRecord,
  SessionRecord,
  StudyEventRecord,
  SurveyRecord,
  AssessmentRecord,
} from "@/types/study";

const eventSchema = z.object({
  participantId: z.string().min(1),
  sessionId: z.string().min(1).nullable().optional(),
  eventName: z.enum([
    "invite_link_clicked",
    "consent_viewed",
    "consent_accepted",
    "pretest_started",
    "pretest_submitted",
    "level_started",
    "hint_opened",
    "codex_opened",
    "attempt_submitted",
    "attempt_failed",
    "attempt_succeeded",
    "level_completed",
    "posttest_started",
    "posttest_submitted",
    "survey_started",
    "survey_completed",
    "session_started",
    "session_ended",
  ]),
  levelId: z.string().nullable().optional(),
  taskId: z.string().nullable().optional(),
  result: z.string().nullable().optional(),
  durationMs: z.number().int().nonnegative().nullable().optional(),
  attemptNo: z.number().int().nonnegative().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  viewport: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .nullable()
    .optional(),
  inputType: z.enum(["touch", "mouse-keyboard", "unknown"]).optional(),
});

const globalForIndexes = globalThis as typeof globalThis & {
  __studyIndexesPromise?: Promise<void>;
};

export async function ensureStudyIndexes() {
  if (!globalForIndexes.__studyIndexesPromise) {
    globalForIndexes.__studyIndexesPromise = (async () => {
      const db = await getMongoDb();

      await Promise.all([
        db.collection<InviteRecord>("invites").createIndex({ inviteToken: 1 }, { unique: true }),
        db
          .collection<ParticipantRecord>("participants")
          .createIndex({ participantId: 1 }, { unique: true }),
        db.collection<SessionRecord>("sessions").createIndex({ sessionId: 1 }, { unique: true }),
        db.collection<SessionRecord>("sessions").createIndex({ participantId: 1 }),
        db
          .collection<StudyEventRecord>("events")
          .createIndex({ sessionId: 1, timestamp: 1 }),
        db
          .collection<AssessmentRecord>("assessments")
          .createIndex({ participantId: 1 }, { unique: true }),
        db.collection<SurveyRecord>("surveys").createIndex({ participantId: 1 }, { unique: true }),
      ]);
    })();
  }

  await globalForIndexes.__studyIndexesPromise;
}

export async function logStudyEvent(
  rawInput: ClientStudyEventInput,
  userAgent: string | null,
) {
  await ensureStudyIndexes();

  const parsed = eventSchema.parse(rawInput);
  const deviceContext = buildDeviceContext({
    userAgent,
    viewport: parsed.viewport,
    inputType: parsed.inputType,
  });

  const db = await getMongoDb();
  const eventRecord: StudyEventRecord = {
    participantId: parsed.participantId,
    sessionId: parsed.sessionId ?? null,
    timestamp: new Date(),
    eventName: parsed.eventName,
    levelId: parsed.levelId ?? null,
    taskId: parsed.taskId ?? null,
    result: parsed.result ?? null,
    durationMs: parsed.durationMs ?? null,
    attemptNo: parsed.attemptNo ?? null,
    deviceType: deviceContext.deviceType,
    browserFamily: deviceContext.browserFamily,
    osFamily: deviceContext.osFamily,
    metadata: parsed.metadata,
  };

  await db.collection<StudyEventRecord>("events").insertOne(eventRecord);
}

export async function markInviteClicked(inviteToken: string) {
  await ensureStudyIndexes();
  const db = await getMongoDb();

  await db.collection<InviteRecord>("invites").updateOne(
    { inviteToken },
    {
      $set: {
        clickedAt: new Date(),
      },
    },
  );
}
