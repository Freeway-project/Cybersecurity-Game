export const priorCryptoExperienceOptions = [
  "none",
  "some",
  "moderate",
  "strong",
] as const;

export const likertOptions = [1, 2, 3, 4, 5] as const;

export const studySteps = [
  "landing",
  "consent",
  "briefing",
  "game-placeholder",
  "debrief",
  "survey",
  "complete",
] as const;

export const studyEventNames = [
  "consent_viewed",
  "consent_accepted",
  "mission_started",
  "level_started",
  "shift_changed",
  "hint_opened",
  "codex_opened",
  "attempt_submitted",
  "attempt_failed",
  "attempt_succeeded",
  "channel_configured",
  "level_completed",
  "level_skipped",
  "flag_captured",
  "breach_detected",
  "defense_placed",
  "phishing_element_found",
  "terminal_command_executed",
  "mission_completed",
  "survey_started",
  "survey_completed",
  "session_started",
  "session_ended",
] as const;

export const levelIds = [
  "caesar-cipher",
  "xor-stream",
  "block-cipher",
  "phishing-inspector",
  "network-defense",
  "terminal-forensics",
] as const;

export const codexEntryIds = [
  "caesar-cipher",
  "xor-stream",
  "block-cipher",
  "phishing-inspector",
  "network-defense",
  "terminal-forensics",
] as const;

export const deviceTypes = ["phone", "tablet", "laptop", "desktop", "unknown"] as const;
export const inputTypes = ["touch", "mouse-keyboard", "unknown"] as const;

export type PriorCryptoExperience = (typeof priorCryptoExperienceOptions)[number];
export type LikertScore = (typeof likertOptions)[number];
export type StudyStep = (typeof studySteps)[number];
export type StudyEventName = (typeof studyEventNames)[number];
export type LevelId = (typeof levelIds)[number];
export type CodexEntryId = (typeof codexEntryIds)[number];
export type DeviceType = (typeof deviceTypes)[number];
export type InputType = (typeof inputTypes)[number];

export type SurveyItemId =
  | "helpfulScore"
  | "hintsScore"
  | "engagementScore"
  | "reuseScore";

export interface ViewportInfo {
  width: number;
  height: number;
}

export interface DeviceContext {
  deviceType: DeviceType;
  browserFamily: string;
  osFamily: string;
  viewport: ViewportInfo | null;
  inputType: InputType;
}

export interface ParticipantRecord {
  participantId: string;
  name?: string;
  consentAccepted: boolean;
  cohort?: string;
  yearLevel?: string;
  priorCryptoExperience?: PriorCryptoExperience;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  sessionId: string;
  participantId: string;
  deviceType: DeviceType;
  browserFamily: string;
  osFamily: string;
  viewport: ViewportInfo | null;
  inputType: InputType;
  startedAt: Date;
  endedAt?: Date | null;
  completed: boolean;
  skippedLevels?: string[];
}

export interface StudyEventRecord {
  participantId: string;
  sessionId?: string | null;
  timestamp: Date;
  eventName: StudyEventName;
  levelId?: string | null;
  taskId?: string | null;
  result?: string | null;
  durationMs?: number | null;
  attemptNo?: number | null;
  deviceType: DeviceType;
  browserFamily: string;
  osFamily: string;
  metadata?: Record<string, unknown>;
}

export interface SurveyRecord {
  participantId: string;
  helpfulScore?: LikertScore;
  hintsScore?: LikertScore;
  engagementScore?: LikertScore;
  reuseScore?: LikertScore;
  helpfulComment?: string;
  confusingComment?: string;
  submittedAt: Date;
}

export interface ConsentSubmission {
  participantId?: string;
  name: string;
  cohort?: string;
  yearLevel?: string;
  priorCryptoExperience: PriorCryptoExperience;
  viewport: ViewportInfo | null;
  inputType: InputType;
}

export interface ConsentResponse {
  ok: boolean;
  sessionId: string;
  participantId: string;
}

export interface SurveySubmission {
  participantId: string;
  sessionId: string;
  helpfulScore?: LikertScore;
  hintsScore?: LikertScore;
  engagementScore?: LikertScore;
  reuseScore?: LikertScore;
  helpfulComment?: string;
  confusingComment?: string;
}

export interface SessionEndSubmission {
  participantId: string;
  sessionId: string;
  completed: boolean;
  skippedLevels?: string[];
}

export interface ClientStudyEventInput {
  participantId: string;
  sessionId?: string | null;
  eventName: StudyEventName;
  levelId?: string | null;
  taskId?: string | null;
  result?: string | null;
  durationMs?: number | null;
  attemptNo?: number | null;
  metadata?: Record<string, unknown>;
  viewport?: ViewportInfo | null;
  inputType?: InputType;
}
