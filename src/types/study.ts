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
  "pretest",
  "game-placeholder",
  "posttest",
  "survey",
  "complete",
] as const;

export const studyEventNames = [
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
] as const;

export const assessmentPhases = ["pre", "post"] as const;

export const deviceTypes = ["phone", "tablet", "laptop", "desktop", "unknown"] as const;
export const inputTypes = ["touch", "mouse-keyboard", "unknown"] as const;

export type PriorCryptoExperience = (typeof priorCryptoExperienceOptions)[number];
export type LikertScore = (typeof likertOptions)[number];
export type StudyStep = (typeof studySteps)[number];
export type StudyEventName = (typeof studyEventNames)[number];
export type AssessmentPhase = (typeof assessmentPhases)[number];
export type DeviceType = (typeof deviceTypes)[number];
export type InputType = (typeof inputTypes)[number];

export type AssessmentItemId =
  | "caesar-basics"
  | "xor-alignment"
  | "block-key-iv";

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

export interface InviteRecord {
  inviteToken: string;
  participantId: string;
  email: string;
  cohort?: string;
  yearLevel?: string;
  sentAt: Date;
  clickedAt?: Date | null;
}

export interface ParticipantRecord {
  participantId: string;
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

export interface AssessmentAnswer {
  answer: string;
  correct: boolean;
}

export interface AssessmentRecord {
  participantId: string;
  preScore?: number;
  postScore?: number;
  itemScoresPre?: Record<AssessmentItemId, AssessmentAnswer>;
  itemScoresPost?: Record<AssessmentItemId, AssessmentAnswer>;
  updatedAt: Date;
}

export interface SurveyRecord {
  participantId: string;
  helpfulScore: LikertScore;
  hintsScore: LikertScore;
  engagementScore: LikertScore;
  reuseScore: LikertScore;
  helpfulComment?: string;
  confusingComment?: string;
  submittedAt: Date;
}

export interface TokenResolutionResponse {
  ok: boolean;
  status: "ready" | "resume-available" | "invalid" | "completed";
  participantId?: string;
  inviteToken?: string | null;
  existingSessionId?: string;
  devBypass?: boolean;
  error?: string;
}

export interface ConsentSubmission {
  participantId: string;
  inviteToken?: string | null;
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

export interface AssessmentSubmission {
  participantId: string;
  sessionId: string;
  answers: Record<AssessmentItemId, string>;
}

export interface AssessmentResponse {
  ok: boolean;
  score: number;
  phase: AssessmentPhase;
}

export interface SurveySubmission {
  participantId: string;
  sessionId: string;
  helpfulScore: LikertScore;
  hintsScore: LikertScore;
  engagementScore: LikertScore;
  reuseScore: LikertScore;
  helpfulComment?: string;
  confusingComment?: string;
}

export interface SessionEndSubmission {
  participantId: string;
  sessionId: string;
  completed: boolean;
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
