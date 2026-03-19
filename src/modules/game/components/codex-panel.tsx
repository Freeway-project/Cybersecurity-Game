"use client";

import { codexEntries } from "@/modules/game/content";
import type { CodexEntryId } from "@/types/study";

interface CodexPanelProps {
  activeEntryId: CodexEntryId;
  isOpen: boolean;
  onSelectEntry: (entryId: CodexEntryId) => void;
  onToggle: () => void;
  unlockedEntries: CodexEntryId[];
}

export function CodexPanel({
  activeEntryId,
  isOpen,
  onSelectEntry,
  onToggle,
  unlockedEntries,
}: CodexPanelProps) {
  const activeEntry = codexEntries[activeEntryId];
  const activeEntryUnlocked = unlockedEntries.includes(activeEntryId);

  return (
    <aside className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-strong)]">
          Codex
        </p>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full border border-[var(--border-strong)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-[var(--card)]"
        >
          {isOpen ? "Hide" : "Open"}
        </button>
      </div>
      {isOpen ? (
        <div className="space-y-4 rounded-[28px] border border-white/60 bg-white/86 p-5 shadow-[0_24px_80px_rgba(28,40,82,0.12)] backdrop-blur">
          <div className="space-y-2">
            {Object.values(codexEntries).map((entry) => {
              const unlocked = unlockedEntries.includes(entry.id);

              return (
                <button
                  key={entry.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelectEntry(entry.id)}
                  className={[
                    "w-full rounded-2xl px-4 py-3 text-left text-sm transition",
                    unlocked
                      ? activeEntryId === entry.id
                        ? "bg-[var(--accent-strong)] text-white"
                        : "bg-[var(--card)] text-[var(--ink)] hover:bg-white"
                      : "cursor-not-allowed bg-slate-100 text-slate-400",
                  ].join(" ")}
                >
                  {unlocked ? entry.title : `${entry.title} (Locked)`}
                </button>
              );
            })}
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card)]/80 p-4">
            <h3 className="text-lg font-semibold text-[var(--ink)]">{activeEntry.title}</h3>
            {activeEntryUnlocked ? (
              <>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                  {activeEntry.summary}
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--ink-muted)]">
                  {activeEntry.bullets.map((bullet) => (
                    <li key={bullet} className="rounded-2xl bg-white/75 px-3 py-2">
                      {bullet}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                Clear the matching level to unlock this concept summary.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card)]/70 p-4 text-sm text-[var(--ink-muted)]">
          {unlockedEntries.length}/3 entries unlocked. Open the Codex to review the concepts you have earned.
        </div>
      )}
    </aside>
  );
}
