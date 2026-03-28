import type { ComponentType } from "react";

import type { LevelId } from "@/types/study";
import type { LevelComponentProps } from "@/modules/game/types";

// Each level component extends LevelComponentProps with additional level-specific props.
// The registry maps level IDs to their component types.
// Cast to the base type so the orchestrator can render any level generically.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyLevelComponent = ComponentType<LevelComponentProps & Record<string, any>>;

export const levelComponentMap: Record<LevelId, () => Promise<{ default: AnyLevelComponent }>> = {
  "caesar-cipher":      () => import("@/modules/game/components/levels/caesar-cipher-level").then((m) => ({ default: m.CaesarCipherLevel as AnyLevelComponent })),
  "xor-stream":         () => import("@/modules/game/components/levels/xor-stream-level").then((m) => ({ default: m.XorStreamLevel as AnyLevelComponent })),
  "block-cipher":       () => import("@/modules/game/components/levels/block-cipher-level").then((m) => ({ default: m.BlockCipherLevel as AnyLevelComponent })),
  "phishing-inspector": () => import("@/modules/game/components/levels/phishing-inspector-level").then((m) => ({ default: m.PhishingInspectorLevel as AnyLevelComponent })),
  "network-defense":    () => import("@/modules/game/components/levels/network-defense-level").then((m) => ({ default: m.NetworkDefenseLevel as AnyLevelComponent })),
  "terminal-forensics": () => import("@/modules/game/components/levels/terminal-forensics-level").then((m) => ({ default: m.TerminalForensicsLevel as AnyLevelComponent })),
};
