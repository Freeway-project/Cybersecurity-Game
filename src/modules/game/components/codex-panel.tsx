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
    <aside className="terminal-panel space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-[#5a6a7a]">
            What you learned
          </p>
          <p className="mt-1 font-mono text-sm text-[#d4a843]">
            {unlockedEntries.length}/{Object.keys(codexEntries).length} topics unlocked
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded border border-[#1a2840] bg-[#10192a] px-3 py-2 font-mono text-xs uppercase tracking-[0.18em] text-[#d4a843] transition hover:border-[#d4a843] hover:text-[#f2c96a]"
        >
          {isOpen ? "Hide" : "Open"}
        </button>
      </div>

      {isOpen ? (
        <div className="space-y-4">
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
                    "w-full rounded border px-3 py-2 text-left font-mono text-xs uppercase tracking-[0.16em] transition",
                    unlocked
                      ? activeEntryId === entry.id
                        ? "border-[#d4a843] bg-[#182338] text-[#f2c96a]"
                        : "border-[#1a2840] bg-[#0e1626] text-[#d4a843] hover:border-[#d4a843]"
                      : "cursor-not-allowed border-[#1a2840] bg-[#0b1220] text-[#5a6a7a] opacity-70",
                  ].join(" ")}
                >
                  {unlocked ? entry.title : `${entry.title} (locked)`}
                </button>
              );
            })}
          </div>

          <div className="rounded border border-[#1a2840] bg-[#09111c] p-4 font-mono">
            <p className="text-xs uppercase tracking-[0.2em] text-[#4ade80]">{activeEntry.title}</p>
            {activeEntryUnlocked ? (
              <div className="mt-4 space-y-4 text-sm leading-7 text-[#c3a257]">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#5a6a7a]">
                    What is it?
                  </p>
                  <p className="mt-2 text-[#d4a843]">{activeEntry.method}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#5a6a7a]">
                    How it works
                  </p>
                  <div className="mt-2 space-y-2">
                    {activeEntry.analysis.map((line) => (
                      <p key={line}>&gt; {line}</p>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#5a6a7a]">
                    Why it matters
                  </p>
                  <div className="mt-2 space-y-2">
                    {activeEntry.note.map((line) => (
                      <p key={line}>&gt; {line}</p>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-[#5a6a7a]">
                Complete this level to unlock the explanation.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="font-mono text-sm leading-6 text-[#5a6a7a]">
          Complete levels to unlock explanations of what you just learned.
        </p>
      )}
    </aside>
  );
}
