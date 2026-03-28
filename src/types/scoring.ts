export interface FlagRecord {
  participantId: string;
  sessionId: string;
  levelId: string;
  flag: string;
  score: number;
  attempts: number;
  hintsUsed: number;
  hintPenalty: number;
  timeBonus: number;
  durationMs: number;
  skipped: boolean;
  capturedAt: Date;
}

export interface SessionScoreRecord {
  participantId: string;
  sessionId: string;
  totalScore: number;
  maxPossibleScore: number;
  flagsCaptured: string[];
  levelsCompleted: string[];
  levelsSkipped: string[];
  classification: "BRONZE" | "SILVER" | "GOLD" | "UNRANKED";
  updatedAt: Date;
}

export interface ScoreSubmission {
  participantId: string;
  sessionId: string;
  levelId: string;
  flag: string;
  attempts: number;
  hintsUsed: number;
  durationMs: number;
  skipped: boolean;
}

export interface ScoreResponse {
  ok: boolean;
  score: number;
  totalScore: number;
  flag: string;
  classification: SessionScoreRecord["classification"];
}
