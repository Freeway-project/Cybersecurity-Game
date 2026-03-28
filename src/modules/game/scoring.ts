import type { SessionScoreRecord } from "@/types/scoring";

export const levelMaxScores: Record<string, number> = {
  "caesar-cipher": 800,
  "xor-stream": 900,
  "block-cipher": 800,
  "phishing-inspector": 1000,
  "network-defense": 1200,
  "terminal-forensics": 1000,
  "dual-role-defender": 1100,
  "soc-triage": 1200,
};

export const levelTargetDurations: Record<string, number> = {
  "caesar-cipher": 120_000,
  "xor-stream": 150_000,
  "block-cipher": 120_000,
  "phishing-inspector": 180_000,
  "network-defense": 180_000,
  "terminal-forensics": 240_000,
  "dual-role-defender": 240_000,
  "soc-triage": 300_000,
};

export function calculateLevelScore(config: {
  levelId: string;
  attempts: number;
  hintsUsed: number;
  durationMs: number;
  skipped: boolean;
}): { score: number; timeBonus: number; hintPenalty: number } {
  if (config.skipped) {
    return { score: 0, timeBonus: 0, hintPenalty: 0 };
  }

  const maxScore = levelMaxScores[config.levelId] ?? 800;
  const targetDuration = levelTargetDurations[config.levelId] ?? 120_000;
  const hintPenalty = config.hintsUsed * 50;
  const attemptPenalty = Math.max(0, config.attempts - 1) * 30;
  const timeBonus =
    config.durationMs < targetDuration
      ? Math.round((1 - config.durationMs / targetDuration) * 150)
      : 0;
  const score = Math.max(0, maxScore - hintPenalty - attemptPenalty + timeBonus);

  return { score, timeBonus, hintPenalty };
}

export function classifyScore(
  totalScore: number,
  maxPossibleScore: number,
): SessionScoreRecord["classification"] {
  if (maxPossibleScore === 0) return "UNRANKED";
  const pct = totalScore / maxPossibleScore;
  if (pct >= 0.75) return "GOLD";
  if (pct >= 0.5) return "SILVER";
  if (pct > 0) return "BRONZE";
  return "UNRANKED";
}

export const totalMaxScore = Object.values(levelMaxScores).reduce((a, b) => a + b, 0);
