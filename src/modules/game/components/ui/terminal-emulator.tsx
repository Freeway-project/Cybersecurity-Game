"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import type { VirtualFile } from "@/modules/game/content";

interface TerminalLine {
  type: "input" | "output" | "error";
  text: string;
}

interface Props {
  filesystem: VirtualFile[];
  onCommand?: (cmd: string, args: string[]) => void;
}

// Build a lookup map from file paths — normalise all paths to have a leading /
function buildFsMap(files: VirtualFile[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of files) {
    const key = f.path.startsWith("/") ? f.path : `/${f.path}`;
    map.set(key, f.content);
  }
  return map;
}

// Normalise a path: resolve ".." and handle leading slashes
function resolvePath(cwd: string, target: string): string {
  if (target.startsWith("/")) return normalisePath(target);
  return normalisePath(cwd === "/" ? `/${target}` : `${cwd}/${target}`);
}

function normalisePath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") resolved.pop();
    else if (part !== ".") resolved.push(part);
  }
  return "/" + resolved.join("/");
}

export function TerminalEmulator({ filesystem, onCommand }: Props) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: "output", text: "// FORENSIC TERMINAL v1.0 -- SIGINT BREACH RESPONSE" },
    { type: "output", text: '// Type "help" to list available commands.' },
    { type: "output", text: "" },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [cwd, setCwd] = useState("/");

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fsMap = buildFsMap(filesystem);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  function appendLines(...newLines: TerminalLine[]) {
    setLines((prev) => [...prev, ...newLines]);
  }

  function runCommand(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    // Echo input
    appendLines({ type: "input", text: `${cwd} $ ${trimmed}` });

    // History
    setHistory((prev) => [trimmed, ...prev.slice(0, 49)]);
    setHistoryIndex(-1);

    const [cmd, ...args] = trimmed.split(/\s+/);
    onCommand?.(cmd ?? "", args);

    switch (cmd) {
      case "help":
        appendLines(
          { type: "output", text: "Available commands:" },
          { type: "output", text: "  ls [path]       — list directory contents" },
          { type: "output", text: "  cat <file>      — display file contents" },
          { type: "output", text: "  head <file>     — display first 10 lines" },
          { type: "output", text: "  tail <file>     — display last 10 lines" },
          { type: "output", text: "  grep <pat> <f>  — search for pattern in file" },
          { type: "output", text: "  find <path> <name> — find files by name" },
          { type: "output", text: "  cd <path>       — change directory" },
          { type: "output", text: "  pwd             — print working directory" },
          { type: "output", text: "  whoami          — current user" },
          { type: "output", text: "  clear           — clear terminal" },
          { type: "output", text: "" },
        );
        break;

      case "whoami":
        appendLines({ type: "output", text: "analyst" }, { type: "output", text: "" });
        break;

      case "pwd":
        appendLines({ type: "output", text: cwd }, { type: "output", text: "" });
        break;

      case "clear":
        setLines([]);
        break;

      case "cd": {
        const target = args[0] ?? "/";
        const resolved = resolvePath(cwd, target);
        // Check it's a directory (present in fs as a listing or as a path prefix)
        const isDir = fsMap.has(resolved) || filesystem.some((f) => f.path !== resolved && f.path.startsWith(resolved === "/" ? "/" : resolved + "/"));
        if (!isDir) {
          appendLines({ type: "error", text: `cd: ${target}: No such directory` }, { type: "output", text: "" });
        } else {
          setCwd(resolved);
          appendLines({ type: "output", text: "" });
        }
        break;
      }

      case "ls": {
        const target = args[0] ? resolvePath(cwd, args[0]) : cwd;
        const content = fsMap.get(target);
        if (content !== undefined) {
          // It's a file listing (directory)
          appendLines({ type: "output", text: content }, { type: "output", text: "" });
        } else {
          // Try to derive listing from paths that start with target
          const prefix = target === "/" ? "/" : target + "/";
          const children = filesystem
            .filter((f) => {
              if (target === "/") {
                // Direct children of root
                const rel = f.path.startsWith("/") ? f.path.slice(1) : f.path;
                return !rel.includes("/") && rel.length > 0;
              }
              return f.path.startsWith(prefix) && f.path !== target;
            })
            .map((f) => {
              const rel = f.path.slice(prefix.length);
              return rel.split("/")[0];
            })
            .filter((v, i, a) => v && a.indexOf(v) === i);

          if (children.length > 0) {
            appendLines({ type: "output", text: children.join("  ") }, { type: "output", text: "" });
          } else {
            appendLines({ type: "error", text: `ls: ${target}: No such file or directory` }, { type: "output", text: "" });
          }
        }
        break;
      }

      case "cat": {
        if (!args[0]) {
          appendLines({ type: "error", text: "cat: missing operand" }, { type: "output", text: "" });
          break;
        }
        const resolved = resolvePath(cwd, args[0]);
        const content = fsMap.get(resolved);
        if (content === undefined) {
          appendLines({ type: "error", text: `cat: ${args[0]}: No such file` }, { type: "output", text: "" });
        } else {
          const outLines = content.split("\n").map((l) => ({ type: "output" as const, text: l }));
          appendLines(...outLines, { type: "output", text: "" });
        }
        break;
      }

      case "head": {
        if (!args[0]) {
          appendLines({ type: "error", text: "head: missing operand" }, { type: "output", text: "" });
          break;
        }
        const resolved = resolvePath(cwd, args[0]);
        const content = fsMap.get(resolved);
        if (content === undefined) {
          appendLines({ type: "error", text: `head: ${args[0]}: No such file` }, { type: "output", text: "" });
        } else {
          const outLines = content.split("\n").slice(0, 10).map((l) => ({ type: "output" as const, text: l }));
          appendLines(...outLines, { type: "output", text: "" });
        }
        break;
      }

      case "tail": {
        if (!args[0]) {
          appendLines({ type: "error", text: "tail: missing operand" }, { type: "output", text: "" });
          break;
        }
        const resolved = resolvePath(cwd, args[0]);
        const content = fsMap.get(resolved);
        if (content === undefined) {
          appendLines({ type: "error", text: `tail: ${args[0]}: No such file` }, { type: "output", text: "" });
        } else {
          const allLines = content.split("\n");
          const outLines = allLines.slice(-10).map((l) => ({ type: "output" as const, text: l }));
          appendLines(...outLines, { type: "output", text: "" });
        }
        break;
      }

      case "grep": {
        if (!args[0] || !args[1]) {
          appendLines({ type: "error", text: "Usage: grep <pattern> <file>" }, { type: "output", text: "" });
          break;
        }
        const resolved = resolvePath(cwd, args[1]);
        const content = fsMap.get(resolved);
        if (content === undefined) {
          appendLines({ type: "error", text: `grep: ${args[1]}: No such file` }, { type: "output", text: "" });
        } else {
          let re: RegExp;
          try {
            re = new RegExp(args[0], "i");
          } catch {
            re = new RegExp(args[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
          }
          const matches = content.split("\n").filter((l) => re.test(l));
          if (matches.length === 0) {
            appendLines({ type: "output", text: "(no matches)" });
          } else {
            appendLines(...matches.map((l) => ({ type: "output" as const, text: l })));
          }
          appendLines({ type: "output", text: "" });
        }
        break;
      }

      case "find": {
        const searchPath = args[0] ? resolvePath(cwd, args[0]) : cwd;
        const namePattern = args[1] ?? "";
        const prefix = searchPath === "/" ? "/" : searchPath + "/";
        const matches = filesystem
          .filter((f) => {
            if (!f.path.startsWith(prefix) && f.path !== searchPath) return false;
            if (!namePattern) return true;
            const basename = f.path.split("/").pop() ?? "";
            return basename.includes(namePattern);
          })
          .map((f) => f.path);
        if (matches.length === 0) {
          appendLines({ type: "output", text: "(no results)" });
        } else {
          appendLines(...matches.map((m) => ({ type: "output" as const, text: m })));
        }
        appendLines({ type: "output", text: "" });
        break;
      }

      default:
        appendLines(
          { type: "error", text: `${cmd}: command not found. Type "help" for available commands.` },
          { type: "output", text: "" },
        );
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      runCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(nextIndex);
      setInput(nextIndex === -1 ? "" : (history[nextIndex] ?? ""));
    }
  }

  return (
    <div
      className="terminal-panel flex flex-col overflow-hidden p-0 h-full"
      style={{ minHeight: "280px" }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Output area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
        {lines.map((line, i) => (
          <div
            key={i}
            className={[
              "font-mono text-xs leading-5 whitespace-pre-wrap break-all",
              line.type === "input"  ? "text-[#d4a843]" :
              line.type === "error"  ? "text-[#ef4444]" :
              "text-[#c3a257]",
            ].join(" ")}
          >
            {line.text || "\u00a0"}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex items-center border-t border-[#1a2840] px-4 py-3">
        <span className="shrink-0 font-mono text-xs text-[#5a6a7a]">{cwd} $&nbsp;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 bg-transparent font-mono text-xs text-[#d4a843] outline-none caret-[#d4a843]"
          aria-label="Terminal input"
        />
        <span className="animate-pulse text-[#d4a843] font-mono text-xs">█</span>
      </div>
    </div>
  );
}
