import { z } from "zod";

import { toCsv } from "@/lib/csv";
import { getMongoDb } from "@/lib/mongodb";
import { ensureStudyIndexes } from "@/modules/instrumentation/server";
import type {
  LevelId,
  ParticipantRecord,
  SessionRecord,
  StudyEventRecord,
  SurveyRecord,
} from "@/types/study";

// Legacy stubs — assessment step removed; types and constants kept to preserve CSV export shape
type AssessmentItemId = "caesar-basics" | "xor-alignment" | "block-key-iv";
interface AssessmentRecord {
  participantId: string;
  updatedAt?: Date;
  preScore?: number;
  postScore?: number;
  itemScoresPre?: Record<string, { answer: string; correct: boolean }>;
  itemScoresPost?: Record<string, { answer: string; correct: boolean }>;
}
const assessmentItemIds: AssessmentItemId[] = ["caesar-basics", "xor-alignment", "block-key-iv"];
const assessmentItemPrefixes: Record<AssessmentItemId, string> = {
  "caesar-basics": "caesarBasics",
  "xor-alignment": "xorAlignment",
  "block-key-iv": "blockKeyIv",
};

const collectionSchema = z.enum([
  "participants",
  "sessions",
  "events",
  "assessments",
  "surveys",
]);

const reportLevelIds: LevelId[] = [
  "caesar-cipher",
  "xor-stream",
  "block-cipher",
  "phishing-inspector",
  "network-defense",
  "terminal-forensics",
  "dual-role-defender",
  "soc-triage",
];

const reportLevelPrefixes: Record<LevelId, string> = {
  "caesar-cipher": "caesar",
  "xor-stream": "xor",
  "block-cipher": "block",
  "phishing-inspector": "phishing",
  "network-defense": "networkDefense",
  "terminal-forensics": "terminalForensics",
  "dual-role-defender": "dualRoleDefender",
  "soc-triage": "socTriage",
};

export interface AdminAssessmentAnswerReport {
  answer: string;
  correct: boolean | null;
}

export interface AdminLevelReport {
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  attemptsTotal: number;
  attemptsFailed: number;
  attemptsSucceeded: number;
  hintsOpened: number;
  codexOpened: number;
  codexEntriesViewed: string[];
  completed: boolean;
  skipped: boolean;
}

export interface AdminParticipantReportRow {
  participantId: string;
  name: string;
  consentAccepted: boolean;
  cohort: string;
  yearLevel: string;
  priorCryptoExperience: string;
  gameVersion: string;
  sessionId: string;
  deviceType: string;
  browserFamily: string;
  osFamily: string;
  inputType: string;
  viewport: string;
  startedAt: string | null;
  endedAt: string | null;
  completed: boolean;
  sessionDurationMs: number | null;
  preScore: number | null;
  postScore: number | null;
  scoreGain: number | null;
  preTestStartedAt: string | null;
  preTestSubmittedAt: string | null;
  preTestDurationMs: number | null;
  postTestStartedAt: string | null;
  postTestSubmittedAt: string | null;
  postTestDurationMs: number | null;
  helpfulScore: number | null;
  hintsScore: number | null;
  engagementScore: number | null;
  reuseScore: number | null;
  helpfulComment: string;
  confusingComment: string;
  totalEvents: number;
  totalAttempts: number;
  hintsOpened: number;
  codexOpened: number;
  attemptsFailed: number;
  attemptsSucceeded: number;
  caesarShiftChanges: number;
  levelsCompletedCount: number;
  skippedLevelsCount: number;
  skippedLevels: string[];
  codexEntriesViewed: string[];
  assessments: {
    pre: Record<AssessmentItemId, AdminAssessmentAnswerReport>;
    post: Record<AssessmentItemId, AdminAssessmentAnswerReport>;
  };
  levels: Record<LevelId, AdminLevelReport>;
}

export interface AdminReportSummary {
  participantRows: number;
  completionRatePct: number | null;
  averagePreScore: number | null;
  averagePostScore: number | null;
  averageScoreGain: number | null;
  averageSessionDurationMs: number | null;
  averageTotalAttempts: number | null;
  averageTotalHintsOpened: number | null;
  averageLevelsCompletedCount: number | null;
}

export interface AdminOverview {
  counts: {
    consented: number;
    started: number;
    completed: number;
    surveyed: number;
    events: number;
  };
  summary: AdminReportSummary;
  rows: AdminParticipantReportRow[];
}

function emptyAssessmentReport(): Record<AssessmentItemId, AdminAssessmentAnswerReport> {
  return {
    "caesar-basics": { answer: "", correct: null },
    "xor-alignment": { answer: "", correct: null },
    "block-key-iv": { answer: "", correct: null },
  };
}

function dateToIso(value?: Date | null) {
  return value instanceof Date ? value.toISOString() : null;
}

function durationBetween(start?: Date | null, end?: Date | null) {
  return start instanceof Date && end instanceof Date
    ? end.getTime() - start.getTime()
    : null;
}

function toViewportLabel(viewport?: SessionRecord["viewport"] | null) {
  return viewport ? `${viewport.width}x${viewport.height}` : "";
}

function average(values: number[], digits = 1) {
  if (values.length === 0) {
    return null;
  }

  const factor = 10 ** digits;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.round(mean * factor) / factor;
}

function percentage(numerator: number, denominator: number) {
  if (denominator === 0) {
    return null;
  }

  return Math.round((numerator / denominator) * 1000) / 10;
}

function latestByDate<T>(records: T[], getDate: (record: T) => Date | null | undefined) {
  return [...records].sort(
    (left, right) =>
      (getDate(right)?.getTime() ?? 0) - (getDate(left)?.getTime() ?? 0),
  )[0];
}

function buildArrayMap<T extends { participantId: string }>(records: T[]) {
  const map = new Map<string, T[]>();

  records.forEach((record) => {
    const existing = map.get(record.participantId);

    if (existing) {
      existing.push(record);
      return;
    }

    map.set(record.participantId, [record]);
  });

  return map;
}

function buildAssessmentAnswerMap(
  answers?: AssessmentRecord["itemScoresPre"] | AssessmentRecord["itemScoresPost"],
) {
  const report = emptyAssessmentReport();

  assessmentItemIds.forEach((itemId) => {
    const answer = answers?.[itemId];
    report[itemId] = {
      answer: answer?.answer ?? "",
      correct: typeof answer?.correct === "boolean" ? answer.correct : null,
    };
  });

  return report;
}

function getEventsForSession(events: StudyEventRecord[], sessionId?: string | null) {
  if (!sessionId) {
    return [...events].sort(
      (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
    );
  }

  const matchingEvents = events.filter((event) => event.sessionId === sessionId);
  const scopedEvents = matchingEvents.length > 0 ? matchingEvents : events;

  return [...scopedEvents].sort(
    (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
  );
}

function firstEvent(
  events: StudyEventRecord[],
  eventName: StudyEventRecord["eventName"],
  levelId?: LevelId,
) {
  return events.find(
    (event) => event.eventName === eventName && (!levelId || event.levelId === levelId),
  );
}

function uniqueStrings(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function buildLevelReport(
  events: StudyEventRecord[],
  levelId: LevelId,
  skippedLevels: Set<string>,
): AdminLevelReport {
  const levelEvents = events.filter((event) => event.levelId === levelId);
  const startedEvent = firstEvent(levelEvents, "level_started", levelId);
  const completedEvents = levelEvents.filter(
    (event) => event.eventName === "level_completed",
  );
  const skippedEvents = levelEvents.filter((event) => event.eventName === "level_skipped");
  const endedEvents = [...completedEvents, ...skippedEvents].sort(
    (left, right) => left.timestamp.getTime() - right.timestamp.getTime(),
  );

  const durationCandidates = endedEvents
    .map((event) => event.durationMs)
    .filter((value): value is number => typeof value === "number");

  const failedAttempts = levelEvents.filter(
    (event) => event.eventName === "attempt_failed",
  ).length;
  const succeededAttempts = levelEvents.filter(
    (event) => event.eventName === "attempt_succeeded",
  ).length;
  const codexEvents = levelEvents.filter((event) => event.eventName === "codex_opened");

  return {
    startedAt: dateToIso(startedEvent?.timestamp),
    endedAt: dateToIso(endedEvents.at(-1)?.timestamp),
    durationMs:
      durationCandidates.length > 0 ? Math.max(...durationCandidates) : null,
    attemptsTotal: failedAttempts + succeededAttempts,
    attemptsFailed: failedAttempts,
    attemptsSucceeded: succeededAttempts,
    hintsOpened: levelEvents.filter((event) => event.eventName === "hint_opened").length,
    codexOpened: codexEvents.length,
    codexEntriesViewed: uniqueStrings(
      codexEvents.map((event) => {
        const entryId =
          typeof event.metadata?.entryId === "string" ? event.metadata.entryId : null;
        return entryId ?? event.levelId ?? null;
      }),
    ),
    completed: completedEvents.length > 0,
    skipped: skippedLevels.has(levelId) || skippedEvents.length > 0,
  };
}

function flattenAnalysisRow(row: AdminParticipantReportRow) {
  const flattened: Record<string, unknown> = {
    participantId: row.participantId,
    name: row.name,
    consentAccepted: row.consentAccepted,
    cohort: row.cohort,
    yearLevel: row.yearLevel,
    priorCryptoExperience: row.priorCryptoExperience,
    gameVersion: row.gameVersion,
    sessionId: row.sessionId,
    deviceType: row.deviceType,
    browserFamily: row.browserFamily,
    osFamily: row.osFamily,
    inputType: row.inputType,
    viewport: row.viewport,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    sessionDurationMs: row.sessionDurationMs,
    completed: row.completed,
    preScore: row.preScore,
    postScore: row.postScore,
    scoreGain: row.scoreGain,
    preTestStartedAt: row.preTestStartedAt,
    preTestSubmittedAt: row.preTestSubmittedAt,
    preTestDurationMs: row.preTestDurationMs,
    postTestStartedAt: row.postTestStartedAt,
    postTestSubmittedAt: row.postTestSubmittedAt,
    postTestDurationMs: row.postTestDurationMs,
    helpfulScore: row.helpfulScore,
    hintsScore: row.hintsScore,
    engagementScore: row.engagementScore,
    reuseScore: row.reuseScore,
    helpfulComment: row.helpfulComment,
    confusingComment: row.confusingComment,
    totalEvents: row.totalEvents,
    totalAttempts: row.totalAttempts,
    hintsOpened: row.hintsOpened,
    codexOpened: row.codexOpened,
    attemptsFailed: row.attemptsFailed,
    attemptsSucceeded: row.attemptsSucceeded,
    caesarShiftChanges: row.caesarShiftChanges,
    levelsCompletedCount: row.levelsCompletedCount,
    skippedLevelsCount: row.skippedLevelsCount,
    skippedLevels: row.skippedLevels.join(", "),
    codexEntriesViewed: row.codexEntriesViewed.join(", "),
  };

  assessmentItemIds.forEach((itemId) => {
    const prefix = assessmentItemPrefixes[itemId];
    flattened[`pre${prefix[0].toUpperCase()}${prefix.slice(1)}Answer`] =
      row.assessments.pre[itemId].answer || null;
    flattened[`pre${prefix[0].toUpperCase()}${prefix.slice(1)}Correct`] =
      row.assessments.pre[itemId].correct;
    flattened[`post${prefix[0].toUpperCase()}${prefix.slice(1)}Answer`] =
      row.assessments.post[itemId].answer || null;
    flattened[`post${prefix[0].toUpperCase()}${prefix.slice(1)}Correct`] =
      row.assessments.post[itemId].correct;
  });

  reportLevelIds.forEach((levelId) => {
    const prefix = reportLevelPrefixes[levelId];
    const level = row.levels[levelId];
    const label = `${prefix[0].toUpperCase()}${prefix.slice(1)}`;

    flattened[`${label}LevelStartedAt`] = level.startedAt;
    flattened[`${label}LevelEndedAt`] = level.endedAt;
    flattened[`${label}LevelDurationMs`] = level.durationMs;
    flattened[`${label}AttemptsTotal`] = level.attemptsTotal;
    flattened[`${label}AttemptsFailed`] = level.attemptsFailed;
    flattened[`${label}AttemptsSucceeded`] = level.attemptsSucceeded;
    flattened[`${label}HintsOpened`] = level.hintsOpened;
    flattened[`${label}CodexOpened`] = level.codexOpened;
    flattened[`${label}CodexEntriesViewed`] = level.codexEntriesViewed.join(", ");
    flattened[`${label}Completed`] = level.completed;
    flattened[`${label}Skipped`] = level.skipped;
  });

  return flattened;
}

function buildAdminRows({
  participants,
  sessions,
  assessments,
  surveys,
  events,
}: {
  participants: ParticipantRecord[];
  sessions: SessionRecord[];
  assessments: AssessmentRecord[];
  surveys: SurveyRecord[];
  events: StudyEventRecord[];
}) {
  const sessionsByParticipant = buildArrayMap(sessions);
  const assessmentsByParticipant = buildArrayMap(assessments);
  const surveysByParticipant = buildArrayMap(surveys);
  const eventsByParticipant = buildArrayMap(events);

  return participants
    .map((participant) => {
      const latestSession = latestByDate(
        sessionsByParticipant.get(participant.participantId) ?? [],
        (session) => session.startedAt,
      );
      const latestAssessment = latestByDate(
        assessmentsByParticipant.get(participant.participantId) ?? [],
        (assessment) => assessment.updatedAt,
      );
      const latestSurvey = latestByDate(
        surveysByParticipant.get(participant.participantId) ?? [],
        (survey) => survey.submittedAt,
      );
      const scopedEvents = getEventsForSession(
        eventsByParticipant.get(participant.participantId) ?? [],
        latestSession?.sessionId,
      );
      const skippedLevels = new Set(latestSession?.skippedLevels ?? []);
      const levels = {
        "caesar-cipher":      buildLevelReport(scopedEvents, "caesar-cipher", skippedLevels),
        "xor-stream":         buildLevelReport(scopedEvents, "xor-stream", skippedLevels),
        "block-cipher":       buildLevelReport(scopedEvents, "block-cipher", skippedLevels),
        "phishing-inspector": buildLevelReport(scopedEvents, "phishing-inspector", skippedLevels),
        "network-defense":    buildLevelReport(scopedEvents, "network-defense", skippedLevels),
        "terminal-forensics": buildLevelReport(scopedEvents, "terminal-forensics", skippedLevels),
        "dual-role-defender": buildLevelReport(scopedEvents, "dual-role-defender", skippedLevels),
        "soc-triage":         buildLevelReport(scopedEvents, "soc-triage", skippedLevels),
      } satisfies Record<LevelId, AdminLevelReport>;

      // Assessment step removed — scores always null
      const preStartEvent = null;
      const preSubmitEvent = null;
      const postStartEvent = null;
      const postSubmitEvent = null;
      const scoreGain: number | null = null;
      const codexEntriesViewed = uniqueStrings(
        reportLevelIds.flatMap((levelId) => levels[levelId].codexEntriesViewed),
      );
      const attemptsFailed = scopedEvents.filter(
        (event) => event.eventName === "attempt_failed",
      ).length;
      const attemptsSucceeded = scopedEvents.filter(
        (event) => event.eventName === "attempt_succeeded",
      ).length;

      return {
        participantId: participant.participantId,
        name: participant.name ?? "",
        consentAccepted: participant.consentAccepted,
        cohort: participant.cohort ?? "",
        yearLevel: participant.yearLevel ?? "",
        priorCryptoExperience: participant.priorCryptoExperience ?? "",
        gameVersion: latestSession?.gameVersion ?? "pre-v3",
        sessionId: latestSession?.sessionId ?? "",
        deviceType: latestSession?.deviceType ?? "",
        browserFamily: latestSession?.browserFamily ?? "",
        osFamily: latestSession?.osFamily ?? "",
        inputType: latestSession?.inputType ?? "",
        viewport: toViewportLabel(latestSession?.viewport),
        startedAt: dateToIso(latestSession?.startedAt),
        endedAt: dateToIso(latestSession?.endedAt),
        completed: latestSession?.completed ?? false,
        sessionDurationMs: durationBetween(
          latestSession?.startedAt,
          latestSession?.endedAt,
        ),
        preScore:
          typeof latestAssessment?.preScore === "number"
            ? latestAssessment.preScore
            : null,
        postScore:
          typeof latestAssessment?.postScore === "number"
            ? latestAssessment.postScore
            : null,
        scoreGain,
        preTestStartedAt: null,
        preTestSubmittedAt: null,
        preTestDurationMs: null,
        postTestStartedAt: null,
        postTestSubmittedAt: null,
        postTestDurationMs: null,
        helpfulScore:
          typeof latestSurvey?.helpfulScore === "number"
            ? latestSurvey.helpfulScore
            : null,
        hintsScore:
          typeof latestSurvey?.hintsScore === "number"
            ? latestSurvey.hintsScore
            : null,
        engagementScore:
          typeof latestSurvey?.engagementScore === "number"
            ? latestSurvey.engagementScore
            : null,
        reuseScore:
          typeof latestSurvey?.reuseScore === "number"
            ? latestSurvey.reuseScore
            : null,
        helpfulComment: latestSurvey?.helpfulComment ?? "",
        confusingComment: latestSurvey?.confusingComment ?? "",
        totalEvents: scopedEvents.length,
        totalAttempts: attemptsFailed + attemptsSucceeded,
        hintsOpened: scopedEvents.filter((event) => event.eventName === "hint_opened").length,
        codexOpened: scopedEvents.filter((event) => event.eventName === "codex_opened").length,
        attemptsFailed,
        attemptsSucceeded,
        caesarShiftChanges: scopedEvents.filter(
          (event) => event.eventName === "shift_changed",
        ).length,
        levelsCompletedCount: reportLevelIds.filter(
          (levelId) => levels[levelId].completed,
        ).length,
        skippedLevelsCount: latestSession?.skippedLevels?.length ?? 0,
        skippedLevels: latestSession?.skippedLevels ?? [],
        codexEntriesViewed,
        assessments: {
          pre: buildAssessmentAnswerMap(latestAssessment?.itemScoresPre),
          post: buildAssessmentAnswerMap(latestAssessment?.itemScoresPost),
        },
        levels,
      } satisfies AdminParticipantReportRow;
    })
    .sort(
      (left, right) =>
        (Date.parse(right.startedAt ?? "") || 0) - (Date.parse(left.startedAt ?? "") || 0),
    );
}

function buildAdminSummary(rows: AdminParticipantReportRow[]): AdminReportSummary {
  return {
    participantRows: rows.length,
    completionRatePct: percentage(
      rows.filter((row) => row.completed).length,
      rows.length,
    ),
    averagePreScore: average(
      rows.flatMap((row) => (row.preScore === null ? [] : [row.preScore])),
    ),
    averagePostScore: average(
      rows.flatMap((row) => (row.postScore === null ? [] : [row.postScore])),
    ),
    averageScoreGain: average(
      rows.flatMap((row) => (row.scoreGain === null ? [] : [row.scoreGain])),
    ),
    averageSessionDurationMs: average(
      rows.flatMap((row) =>
        row.sessionDurationMs === null ? [] : [row.sessionDurationMs],
      ),
      0,
    ),
    averageTotalAttempts: average(rows.map((row) => row.totalAttempts)),
    averageTotalHintsOpened: average(rows.map((row) => row.hintsOpened)),
    averageLevelsCompletedCount: average(
      rows.map((row) => row.levelsCompletedCount),
    ),
  };
}

async function loadAdminDataset() {
  await ensureStudyIndexes();
  const db = await getMongoDb();

  const [participants, sessions, assessments, surveys, events] = await Promise.all([
    db.collection<ParticipantRecord>("participants").find({}).toArray(),
    db.collection<SessionRecord>("sessions").find({}).toArray(),
    db.collection<AssessmentRecord>("assessments").find({}).toArray(),
    db.collection<SurveyRecord>("surveys").find({}).toArray(),
    db.collection<StudyEventRecord>("events").find({}).toArray(),
  ]);

  const rows = buildAdminRows({
    participants,
    sessions,
    assessments,
    surveys,
    events,
  });

  return {
    participants,
    sessions,
    assessments,
    surveys,
    events,
    rows,
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { participants, sessions, surveys, events, rows } = await loadAdminDataset();

  return {
    counts: {
      consented: participants.filter((participant) => participant.consentAccepted).length,
      started: sessions.length,
      completed: sessions.filter((session) => session.completed).length,
      surveyed: surveys.length,
      events: events.length,
    },
    summary: buildAdminSummary(rows),
    rows,
  };
}

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
  const { rows } = await loadAdminDataset();
  return toCsv(rows.map(flattenAnalysisRow));
}
