import type { LevelId } from "@/types/study";

export interface LevelResult {
  levelId: LevelId;
  flag: string;
  score: number;
  attempts: number;
  hintsUsed: number;
  durationMs: number;
  skipped: boolean;
  metadata?: Record<string, unknown>;
}

export interface LevelComponentProps {
  participantId: string;
  sessionId: string;
  onComplete: (result: LevelResult) => void;
  onBreach: () => void;
}
