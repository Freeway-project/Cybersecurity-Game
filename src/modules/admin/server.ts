import { createHash } from "crypto";

import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers";
import { z } from "zod";

import { getServerEnv } from "@/config/env";
import { toCsv } from "@/lib/csv";
import { getMongoDb } from "@/lib/mongodb";
import { ensureStudyIndexes } from "@/modules/instrumentation/server";
import type {
  AssessmentRecord,
  ParticipantRecord,
  SessionRecord,
  StudyEventRecord,
  SurveyRecord,
} from "@/types/study";

export const ADMIN_COOKIE_NAME = "pilot_admin_session";

export function adminCookieValue(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function validateAdminSecret(secret: string) {
  const env = getServerEnv();

  if (!env.ADMIN_SECRET) {
    throw new Error("ADMIN_SECRET is not configured.");
  }

  return secret === env.ADMIN_SECRET;
}

export async function isAdminAuthenticated(
  cookieStore?: ReadonlyRequestCookies,
) {
  const env = getServerEnv();

  if (!env.ADMIN_SECRET) {
    return false;
  }

  const store = cookieStore ?? (await cookies());
  const value = store.get(ADMIN_COOKIE_NAME)?.value;

  return value === adminCookieValue(env.ADMIN_SECRET);
}

export async function requireAdmin(cookieStore?: ReadonlyRequestCookies) {
  const isAuthenticated = await isAdminAuthenticated(cookieStore);

  if (!isAuthenticated) {
    throw new Error("Admin access denied.");
  }
}

export async function getAdminOverview() {
  await ensureStudyIndexes();
  const db = await getMongoDb();

  const [participants, sessions, surveys, events] = await Promise.all([
    db.collection<ParticipantRecord>("participants").countDocuments({
      consentAccepted: true,
    }),
    db.collection<SessionRecord>("sessions").countDocuments(),
    db.collection<SurveyRecord>("surveys").countDocuments(),
    db.collection<StudyEventRecord>("events").countDocuments(),
  ]);

  const completed = await db.collection<SessionRecord>("sessions").countDocuments({
    completed: true,
  });

  return {
    counts: {
      consented: participants,
      started: sessions,
      completed,
      surveyed: surveys,
      events,
    },
  };
}

const collectionSchema = z.enum([
  "participants",
  "sessions",
  "events",
  "assessments",
  "surveys",
]);

export async function exportRawData(collectionName?: string | null) {
  await ensureStudyIndexes();
  const db = await getMongoDb();

  if (collectionName) {
    const name = collectionSchema.parse(collectionName);
    return db.collection(name).find({}).sort({ _id: 1 }).toArray();
  }

  const [participants, sessions, events, assessments, surveys] = await Promise.all([
    db.collection("participants").find({}).toArray(),
    db.collection("sessions").find({}).toArray(),
    db.collection("events").find({}).toArray(),
    db.collection("assessments").find({}).toArray(),
    db.collection("surveys").find({}).toArray(),
  ]);

  return {
    participants,
    sessions,
    events,
    assessments,
    surveys,
  };
}

export async function exportAnalysisCsv() {
  await ensureStudyIndexes();
  const db = await getMongoDb();

  const [participants, sessions, assessments, surveys, events] = await Promise.all([
    db.collection<ParticipantRecord>("participants").find({}).toArray(),
    db.collection<SessionRecord>("sessions").find({}).toArray(),
    db.collection<AssessmentRecord>("assessments").find({}).toArray(),
    db.collection<SurveyRecord>("surveys").find({}).toArray(),
    db.collection<StudyEventRecord>("events").find({}).toArray(),
  ]);

  const rows = participants.map((participant) => {
    const session = sessions
      .filter((item) => item.participantId === participant.participantId)
      .sort((left, right) => right.startedAt.getTime() - left.startedAt.getTime())[0];
    const assessment = assessments.find((item) => item.participantId === participant.participantId);
    const survey = surveys.find((item) => item.participantId === participant.participantId);
    const participantEvents = events.filter((item) => item.participantId === participant.participantId);

    return {
      participantId: participant.participantId,
      name: participant.name ?? "",
      consentAccepted: participant.consentAccepted,
      cohort: participant.cohort ?? "",
      yearLevel: participant.yearLevel ?? "",
      priorCryptoExperience: participant.priorCryptoExperience ?? "",
      sessionId: session?.sessionId ?? "",
      deviceType: session?.deviceType ?? "",
      browserFamily: session?.browserFamily ?? "",
      osFamily: session?.osFamily ?? "",
      inputType: session?.inputType ?? "",
      viewport: session?.viewport ?? "",
      startedAt: session?.startedAt ?? "",
      endedAt: session?.endedAt ?? "",
      completed: session?.completed ?? false,
      preScore: assessment?.preScore ?? "",
      postScore: assessment?.postScore ?? "",
      helpfulScore: survey?.helpfulScore ?? "",
      hintsScore: survey?.hintsScore ?? "",
      engagementScore: survey?.engagementScore ?? "",
      reuseScore: survey?.reuseScore ?? "",
      helpfulComment: survey?.helpfulComment ?? "",
      confusingComment: survey?.confusingComment ?? "",
      totalEvents: participantEvents.length,
      hintsOpened: participantEvents.filter((event) => event.eventName === "hint_opened").length,
      codexOpened: participantEvents.filter((event) => event.eventName === "codex_opened").length,
      attemptsFailed: participantEvents.filter((event) => event.eventName === "attempt_failed").length,
      attemptsSucceeded: participantEvents.filter((event) => event.eventName === "attempt_succeeded").length,
    };
  });

  return toCsv(rows);
}
