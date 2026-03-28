"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { networkDefenseLevel } from "@/modules/game/content";
import type { NetworkNode, Threat } from "@/modules/game/content";
import { calculateLevelScore } from "@/modules/game/scoring";
import { sendStudyEvent } from "@/modules/instrumentation/client";
import type { LevelComponentProps } from "@/modules/game/types";

interface Props extends LevelComponentProps {
  onStatusChange: (line: string, tone: "info" | "error" | "success") => void;
  onUnlockCodex: (id: "network-defense") => void;
  onBurst: () => void;
  attempts: number;
  onAttempt: (n: number) => void;
  hintsUsed: number;
  startTime: number;
}

type SimPhase = "idle" | "running" | "result";

const TOOL_COLOR: Record<string, { border: string; text: string; bg: string }> = {
  firewall:   { border: "#ef4444", text: "#ef4444",  bg: "#1a0808" },
  ids:        { border: "#a855f7", text: "#c084fc",  bg: "#160820" },
  antivirus:  { border: "#3b82f6", text: "#60a5fa",  bg: "#0a1020" },
  encryption: { border: "#4ade80", text: "#4ade80",  bg: "#081a10" },
};

function nodeLabel(nodeId: string): string {
  return networkDefenseLevel.nodes.find((n) => n.id === nodeId)?.label ?? nodeId;
}

function getBlockingNode(threat: Threat, placements: Record<string, string>): string | null {
  for (const nodeId of threat.path) {
    const toolId = placements[nodeId];
    if (!toolId) continue;
    const tool = networkDefenseLevel.defenseTools.find((t) => t.id === toolId);
    if (tool?.effectiveAgainst.includes(threat.type)) return nodeId;
  }
  return null;
}

// ── Node shapes ───────────────────────────────────────────────────────────────

function NodeShape({ type, stroke, strokeWidth }: { type: NetworkNode["type"]; stroke: string; strokeWidth: number }) {
  switch (type) {
    case "internet":
      return (
        <>
          <circle r={24} fill="#09111c" stroke={stroke} strokeWidth={strokeWidth} />
          <circle r={16} fill="none" stroke={stroke} strokeOpacity={0.35} strokeWidth={1} strokeDasharray="3 2" />
          <circle r={8}  fill="none" stroke={stroke} strokeOpacity={0.25} strokeWidth={1} />
        </>
      );
    case "router":
      return <polygon points="0,-24 24,0 0,24 -24,0" fill="#09111c" stroke={stroke} strokeWidth={strokeWidth} />;
    case "workstation":
      return (
        <>
          <rect x={-22} y={-18} width={44} height={30} rx={3} fill="#09111c" stroke={stroke} strokeWidth={strokeWidth} />
          <rect x={-8}  y={14}  width={16} height={4}  rx={1} fill={stroke} opacity={0.45} />
        </>
      );
    case "server":
      return (
        <>
          <rect x={-22} y={-24} width={44} height={48} rx={3} fill="#09111c" stroke={stroke} strokeWidth={strokeWidth} />
          {[-10, 0, 10].map((offset) => (
            <line key={offset} x1={-14} y1={offset} x2={14} y2={offset} stroke={stroke} strokeWidth={1} opacity={0.4} />
          ))}
        </>
      );
    case "database":
      return (
        <>
          <rect x={-22} y={-24} width={44} height={48} rx={6} fill="#09111c" stroke={stroke} strokeWidth={strokeWidth} />
          <ellipse cx={0} cy={-16} rx={14} ry={5} fill="none" stroke={stroke} strokeWidth={1} opacity={0.6} />
          <ellipse cx={0} cy={-4}  rx={14} ry={5} fill="none" stroke={stroke} strokeWidth={1} opacity={0.35} />
        </>
      );
    default:
      return <circle r={24} fill="#09111c" stroke={stroke} strokeWidth={strokeWidth} />;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export function NetworkDefenseLevel({
  participantId,
  sessionId,
  onComplete,
  onBreach,
  onStatusChange,
  onUnlockCodex,
  onBurst,
  attempts,
  onAttempt,
  hintsUsed,
  startTime,
}: Props) {
  const [placements, setPlacements] = useState<Record<string, string>>({}); // nodeId → toolId
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [simPhase, setSimPhase] = useState<SimPhase>("idle");
  const [threatResults, setThreatResults] = useState<Record<string, "blocked" | "breached">>({});
  const [blockingNodes, setBlockingNodes] = useState<Record<string, string | null>>({});
  const [revealedCount, setRevealedCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Remaining supply for each tool
  const usedCounts = Object.values(placements).reduce<Record<string, number>>((acc, id) => {
    acc[id] = (acc[id] ?? 0) + 1;
    return acc;
  }, {});
  const toolRemaining = networkDefenseLevel.defenseTools.reduce<Record<string, number>>((acc, t) => {
    acc[t.id] = t.count - (usedCounts[t.id] ?? 0);
    return acc;
  }, {});

  function selectTool(toolId: string) {
    if (simPhase !== "idle") return;
    setSelectedTool((prev) => (prev === toolId ? null : toolId));
  }

  function handleNodeClick(node: NetworkNode) {
    if (simPhase !== "idle" || !node.acceptsDefense) return;

    if (placements[node.id]) {
      // Remove existing placement
      void sendStudyEvent({
        participantId, sessionId, eventName: "defense_placed",
        levelId: "network-defense", taskId: "defense-deployment",
        metadata: { action: "remove", nodeId: node.id, toolId: placements[node.id] },
      });
      setPlacements((prev) => {
        const next = { ...prev };
        delete next[node.id];
        return next;
      });
      return;
    }

    if (!selectedTool || toolRemaining[selectedTool] <= 0) return;

    setPlacements((prev) => ({ ...prev, [node.id]: selectedTool }));
    void sendStudyEvent({
      participantId, sessionId, eventName: "defense_placed",
      levelId: "network-defense", taskId: "defense-deployment",
      metadata: { action: "place", nodeId: node.id, toolId: selectedTool },
    });

    // Auto-deselect when supply runs out
    if (toolRemaining[selectedTool] <= 1) setSelectedTool(null);
  }

  function handleActivate() {
    if (simPhase !== "idle") return;
    const attemptNo = attempts + 1;
    onAttempt(attemptNo);

    // Compute results
    const results: Record<string, "blocked" | "breached"> = {};
    const blocking: Record<string, string | null> = {};
    networkDefenseLevel.threats.forEach((threat) => {
      const blocker = getBlockingNode(threat, placements);
      results[threat.id] = blocker ? "blocked" : "breached";
      blocking[threat.id] = blocker;
    });

    void sendStudyEvent({
      participantId, sessionId, eventName: "attempt_submitted",
      levelId: "network-defense", taskId: "defense-deployment",
      attemptNo,
      metadata: { placements, results },
    });

    setThreatResults(results);
    setBlockingNodes(blocking);
    setSimPhase("running");
    setRevealedCount(0);

    // Sequentially reveal threats
    const allThreats = networkDefenseLevel.threats;
    const reveal = (i: number) => {
      setRevealedCount(i + 1);
      if (i + 1 < allThreats.length) {
        window.setTimeout(() => reveal(i + 1), 700);
      } else {
        // All revealed — evaluate
        window.setTimeout(() => {
          setSimPhase("result");
          const allBlocked = Object.values(results).every((r) => r === "blocked");
          if (allBlocked) {
            const durationMs = Date.now() - startTime;
            const { score } = calculateLevelScore({ levelId: "network-defense", attempts: attemptNo, hintsUsed, durationMs, skipped: false });
            void sendStudyEvent({ participantId, sessionId, eventName: "level_completed", levelId: "network-defense", taskId: "defense-deployment", attemptNo, durationMs, result: "completed" });
            setTimeout(() => {
              setCompleted(true);
              onBurst();
              onUnlockCodex("network-defense");
              onStatusChange("// ALL THREATS NEUTRALISED -- ECHO FRAGMENT LOGGED", "success");
              onComplete({ levelId: "network-defense", flag: networkDefenseLevel.flag, score, attempts: attemptNo, hintsUsed, durationMs, skipped: false });
            }, 1000);
          } else {
            onBreach();
            onStatusChange("// NETWORK BREACHED -- RECONFIGURE DEFENSES", "error");
            void sendStudyEvent({ participantId, sessionId, eventName: "attempt_failed", levelId: "network-defense", taskId: "defense-deployment", attemptNo, result: "threats-broke-through" });
          }
        }, 400);
      }
    };
    window.setTimeout(() => reveal(0), 250);
  }

  function handleReset() {
    setSimPhase("idle");
    setThreatResults({});
    setBlockingNodes({});
    setRevealedCount(0);
  }

  function handleSkip() {
    setCompleted(true);
    onUnlockCodex("network-defense");
    onStatusChange("// TRANSMISSION BYPASSED -- SIGNAL LOG UPDATED", "info");
    void sendStudyEvent({ participantId, sessionId, eventName: "level_skipped", levelId: "network-defense", taskId: "defense-deployment", attemptNo: attempts, durationMs: Date.now() - startTime });
    const { score } = calculateLevelScore({ levelId: "network-defense", attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true });
    onComplete({ levelId: "network-defense", flag: networkDefenseLevel.flag, score, attempts, hintsUsed, durationMs: Date.now() - startTime, skipped: true });
  }

  // ── Completed screen ────────────────────────────────────────────────────────
  if (completed) {
    return (
      <div className="space-y-4">
        <div className="terminal-panel relative overflow-hidden">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#4ade80]">// NETWORK PERIMETER SECURED</p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.22em] text-[#5a6a7a]">// CONTENT: CLASSIFIED FRAGMENT 5/6</p>
          <div className="mt-5 space-y-2 font-mono text-sm leading-7 text-[#d4a843]">
            <p>// ALL {networkDefenseLevel.threats.length} THREATS NEUTRALISED</p>
            <p>// PERIMETER CONTROLS: ACTIVE</p>
            <p>// BREACH LOGS DETECTED -- FORENSIC TERMINAL READY</p>
            <p>// LOGGING TO SIGNAL LOG...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Active game ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="terminal-panel">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#5a6a7a]">// NETWORK TOPOLOGY -- DEFENSE DEPLOYMENT</p>
        <p className="mt-2 font-mono text-sm leading-7 text-[#c3a257]">
          // Select a defense from the inventory, then click a network node to place it. Click a placed defense to remove it.
        </p>
      </div>

      {/* Main grid: SVG + inventory */}
      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
        {/* Network SVG */}
        <div className="terminal-panel overflow-hidden p-0">
          <div className="border-b border-[#1a2840] px-4 py-2">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[#5a6a7a]">
              // NETWORK MAP — click nodes to place / remove defenses
            </p>
          </div>
          <div className="p-2">
            <svg
              viewBox="0 0 430 390"
              className="w-full"
              style={{ maxHeight: "390px" }}
              aria-label="Network topology diagram"
            >
              {/* Edges */}
              {networkDefenseLevel.edges.map((edge, i) => {
                const fromNode = networkDefenseLevel.nodes.find((n) => n.id === edge.from);
                const toNode   = networkDefenseLevel.nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;
                return (
                  <line
                    key={i}
                    x1={fromNode.x} y1={fromNode.y}
                    x2={toNode.x}   y2={toNode.y}
                    stroke="#1a2840"
                    strokeWidth={2}
                  />
                );
              })}

              {/* Nodes */}
              {networkDefenseLevel.nodes.map((node) => {
                const toolId = placements[node.id];
                const tool   = networkDefenseLevel.defenseTools.find((t) => t.id === toolId);
                const colors = toolId ? TOOL_COLOR[toolId] : null;

                const strokeColor = colors
                  ? colors.border
                  : node.critical
                  ? "#ef4444"
                  : "#2a3a4a";
                const strokeWidth = node.critical ? 2.5 : 1.5;

                const canClick = node.acceptsDefense && simPhase === "idle";

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => handleNodeClick(node)}
                    role={canClick ? "button" : undefined}
                    aria-label={canClick ? `Node: ${node.label}` : node.label}
                    className={canClick ? "cursor-pointer" : undefined}
                  >
                    <NodeShape type={node.type} stroke={strokeColor} strokeWidth={strokeWidth} />

                    {/* Node label */}
                    <text
                      y={40}
                      textAnchor="middle"
                      style={{
                        fill: "#5a6a7a",
                        fontSize: "7.5px",
                        fontFamily: "IBM Plex Mono, monospace",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {node.label}
                    </text>

                    {/* Critical badge */}
                    {node.critical && (
                      <text
                        y={52}
                        textAnchor="middle"
                        style={{
                          fill: "#ef4444",
                          fontSize: "7px",
                          fontFamily: "IBM Plex Mono, monospace",
                        }}
                      >
                        ★ CRITICAL
                      </text>
                    )}

                    {/* Defense badge */}
                    {tool && colors && (
                      <text
                        y={-30}
                        textAnchor="middle"
                        style={{
                          fill: colors.text,
                          fontSize: "7px",
                          fontFamily: "IBM Plex Mono, monospace",
                          fontWeight: "bold",
                        }}
                      >
                        [{tool.label}]
                      </text>
                    )}

                    {/* Hover target (invisible, expands click area) */}
                    {canClick && (
                      <circle r={32} fill="transparent" />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Defense inventory */}
        <div className="space-y-3">
          <div className="terminal-panel py-3">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[#5a6a7a]">// DEFENSE INVENTORY</p>
          </div>

          {networkDefenseLevel.defenseTools.map((tool) => {
            const remaining = toolRemaining[tool.id] ?? 0;
            const isSelected = selectedTool === tool.id;
            const colors = TOOL_COLOR[tool.id] ?? { border: "#d4a843", text: "#d4a843", bg: "#0a0a00" };

            return (
              <button
                key={tool.id}
                type="button"
                disabled={remaining <= 0 || simPhase !== "idle"}
                onClick={() => selectTool(tool.id)}
                className={[
                  "w-full rounded border p-3 text-left font-mono text-xs transition",
                  remaining <= 0 || simPhase !== "idle" ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
                ].join(" ")}
                style={
                  isSelected
                    ? { borderColor: colors.border, backgroundColor: colors.bg }
                    : { borderColor: "#1a2840", backgroundColor: "#09111c" }
                }
              >
                <div className="flex items-center justify-between">
                  <span style={{ color: isSelected ? colors.text : "#d4a843" }}>
                    {isSelected ? "▶ " : ""}{tool.label}
                  </span>
                  <span className="text-[#5a6a7a]">×{remaining}</span>
                </div>
                <p className="mt-1.5 text-[0.65rem] leading-relaxed text-[#5a6a7a]">
                  {tool.description}
                </p>
                <p className="mt-1 text-[0.6rem] text-[#3a4a5a]">
                  Blocks: {tool.effectiveAgainst.join(", ").toUpperCase()}
                </p>
              </button>
            );
          })}

          {/* Legend */}
          <div className="terminal-panel py-3 space-y-1">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[#5a6a7a]">// THREAT TYPES</p>
            {networkDefenseLevel.threats.map((t) => (
              <p key={t.id} className="font-mono text-[0.6rem] text-[#3a4a5a]">
                {t.label}: {t.blockedBy.join(", ").toUpperCase()}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Threat simulation results */}
      {simPhase !== "idle" && (
        <div className="terminal-panel space-y-3">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[#5a6a7a]">
            // THREAT SIMULATION {simPhase === "running" ? "-- ANALYSING..." : "-- COMPLETE"}
          </p>
          <div className="space-y-2">
            {networkDefenseLevel.threats.slice(0, revealedCount).map((threat) => {
              const result  = threatResults[threat.id];
              const blocker = blockingNodes[threat.id];
              const blocked = result === "blocked";

              const pathStr = threat.path.map((id) => nodeLabel(id)).join(" → ");

              return (
                <div
                  key={threat.id}
                  className={[
                    "rounded border px-3 py-3 font-mono text-xs",
                    blocked
                      ? "border-[#4ade80]/30 bg-[#081a10]"
                      : "border-[#ef4444]/30 bg-[#1a0808]",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between">
                    <span className={blocked ? "text-[#4ade80]" : "text-[#ef4444]"}>
                      {blocked ? "✓ " : "✗ "}
                      {threat.label}
                    </span>
                    <span className={blocked ? "text-[#4ade80]" : "text-[#ef4444]"}>
                      {blocked ? "BLOCKED" : "BREACHED"}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.65rem] text-[#5a6a7a]">PATH: {pathStr}</p>
                  {blocked && blocker && (
                    <p className="mt-0.5 text-[0.65rem] text-[#4ade80]/70">
                      Intercepted at: {nodeLabel(blocker)} [{placements[blocker]?.toUpperCase()}]
                    </p>
                  )}
                  {!blocked && (
                    <p className="mt-0.5 text-[0.65rem] text-[#ef4444]/70">
                      No defense blocked {threat.type.toUpperCase()} on this path
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap justify-end gap-3">
        {simPhase === "result" && !completed && (
          <Button
            variant="secondary"
            onClick={handleReset}
            className="rounded border border-[#1a2840] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#c3a257] hover:bg-[#10192a]"
          >
            // RECONFIGURE DEFENSES
          </Button>
        )}
        {attempts >= 3 && simPhase !== "running" && !completed && (
          <Button
            variant="secondary"
            onClick={handleSkip}
            className="rounded border border-[#624616] bg-transparent font-mono text-xs uppercase tracking-[0.16em] text-[#d4a843] hover:bg-[#2a1c08]"
          >
            // BYPASS ECHO
          </Button>
        )}
        {simPhase === "idle" && (
          <Button
            onClick={handleActivate}
            className="rounded border border-[#1a2840] bg-[#162134] font-mono text-xs uppercase tracking-[0.2em] text-[#d4a843] shadow-none hover:bg-[#1d2a43]"
          >
            // ACTIVATE DEFENSES
          </Button>
        )}
      </div>
    </div>
  );
}
