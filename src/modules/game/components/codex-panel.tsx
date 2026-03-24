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
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent-strong)]">
          Codex
        </p>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full border border-[var(--border-strong)] bg-[var(--card-strong)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink)] transition hover:bg-[var(--card-soft)]"
        >
          {isOpen ? "Hide" : "Open"}
        </button>
      </div>
      {isOpen ? (
        <div className="space-y-4 rounded-[28px] border border-[var(--border)] bg-[var(--card)]/92 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur lg:p-6">
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
                    "w-full rounded-2xl px-4 py-3 text-left text-base font-medium transition",
                    unlocked
                      ? activeEntryId === entry.id
                        ? "bg-[var(--accent-strong)] text-white"
                        : "bg-[var(--card-strong)] text-[var(--ink)] hover:bg-[var(--card-soft)]"
                      : "cursor-not-allowed bg-[var(--card-soft)] text-[var(--ink-muted)] opacity-60",
                  ].join(" ")}
                >
                  {unlocked ? entry.title : `${entry.title} (Locked)`}
                </button>
              );
            })}
          </div>
          <div className="rounded-[22px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
            <h3 className="text-xl font-semibold text-[var(--ink)]">{activeEntry.title}</h3>
            {activeEntryUnlocked ? (
              <>
                <p className="mt-2 text-base leading-7 text-[var(--ink)]">
                  {activeEntry.summary}
                </p>
                <ul className="mt-4 space-y-2 text-base leading-7 text-[var(--ink)]">
                  {activeEntry.bullets.map((bullet) => (
                    <li key={bullet} className="rounded-2xl bg-[var(--card-strong)] px-3 py-2 font-medium">
                      {bullet}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
                Each entry unlocks when you solve its matching level. Check back after completing a level.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--card-soft)] p-4">
          <p className="text-sm font-semibold text-[var(--ink)]">
            {unlockedEntries.length}/3 entries unlocked
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
            Complete each level to unlock a concept summary. These entries explain the cryptography behind each puzzle.
          </p>
        </div>
      )}
    </aside>
  );
}
