"use client";

import type { LevelId } from "@/types/study";
import { levelOrder } from "@/modules/game/content";
import { totalMaxScore } from "@/modules/game/scoring";

interface Props {
  score: number;
  flagsCaptured: number;
  totalFlags: number;
  currentLevelId: LevelId | null;
  elapsedMs: number;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ScoreBar({ score, flagsCaptured, totalFlags, currentLevelId, elapsedMs }: Props) {
  const levelIndex = currentLevelId ? levelOrder.indexOf(currentLevelId) + 1 : 0;
  const scorePercent = Math.round((score / totalMaxScore) * 100);

  return (
    <div className="flex items-center gap-4 border-b border-[#1a2840] bg-[#06080f] px-4 py-2">
      {/* Mission label */}
      <span className="hidden shrink-0 font-mono text-[0.65rem] uppercase tracking-[0.18em] text-[#5a6a7a] sm:block">
        // OPERATION SIGNAL GHOST
      </span>

      {/* Score */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[#5a6a7a]">SCORE</span>
        <span className="font-mono text-xs font-semibold text-[#d4a843]">
          {score.toLocaleString()}
          <span className="text-[#5a6a7a]">/{totalMaxScore.toLocaleString()}</span>
        </span>
        <span className="font-mono text-[0.6rem] text-[#5a6a7a]">({scorePercent}%)</span>
      </div>

      {/* Flags */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[#5a6a7a]">FLAGS</span>
        <span className="font-mono text-xs font-semibold text-[#4ade80]">
          {flagsCaptured}<span className="text-[#5a6a7a]">/{totalFlags}</span>
        </span>
      </div>

      {/* Level */}
      {currentLevelId && (
        <div className="hidden items-center gap-1.5 sm:flex">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[#5a6a7a]">LEVEL</span>
          <span className="font-mono text-xs text-[#d4a843]">{levelIndex}/{levelOrder.length}</span>
        </div>
      )}

      {/* Elapsed time */}
      <div className="ml-auto flex items-center gap-1.5">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[#5a6a7a]">TIME</span>
        <span className="font-mono text-xs tabular-nums text-[#c3a257]">{formatTime(elapsedMs)}</span>
      </div>
    </div>
  );
}
