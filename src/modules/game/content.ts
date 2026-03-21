import type { CodexEntryId, LevelId } from "@/types/study";

export interface CodexEntry {
  id: CodexEntryId;
  title: string;
  summary: string;
  bullets: string[];
}

export interface CaesarLevelConfig {
  id: "caesar-cipher";
  title: string;
  mission: string;
  ciphertext: string;
  targetShift: number;
  plaintext: string;
  successMessage: string;
  hints: string[];
}

export interface XorLevelConfig {
  id: "xor-stream";
  title: string;
  mission: string;
  rulePairs: Array<{
    left: string;
    right: string;
    output: string;
  }>;
  recoveryCipherBits: string;
  recoveryKeyBits: string;
  recoveryPlaintextBits: string;
  successMessage: string;
  hints: string[];
}

export interface BlockChoice {
  id: string;
  label: string;
  helper: string;
}

export interface BlockCipherLevelConfig {
  id: "block-cipher";
  title: string;
  mission: string;
  slotLabels: string[];
  correctSequence: string[];
  choices: BlockChoice[];
  successMessage: string;
  hints: string[];
}

export type GameplayLevelConfig =
  | CaesarLevelConfig
  | XorLevelConfig
  | BlockCipherLevelConfig;

export const levelOrder: LevelId[] = [
  "caesar-cipher",
  "xor-stream",
  "block-cipher",
];

export const caesarLevel: CaesarLevelConfig = {
  id: "caesar-cipher",
  title: "Level 1: Caesar Cipher",
  mission:
    "The spy intercepts a short coded message from an enemy contact. Adjust the Caesar shift until the hidden meeting point becomes readable.",
  ciphertext: "PHHW DW WKH GRFN",
  targetShift: 3,
  plaintext: "MEET AT THE DOCK",
  successMessage: "Decoded. The message reveals the meeting point: the dock.",
  hints: [
    "This message may only be shifted by a small amount.",
    "Try moving the letters backward instead of forward.",
    "A common shift in Caesar examples is 3.",
  ],
};

export const xorLevel: XorLevelConfig = {
  id: "xor-stream",
  title: "Level 2: Repair the Scrambled Transmission",
  mission:
    "A stolen briefing is scrambled. Rebuild the XOR rule first, then use the same logic to recover the original signal.",
  rulePairs: [
    { left: "1", right: "1", output: "0" },
    { left: "0", right: "1", output: "1" },
    { left: "1", right: "0", output: "1" },
    { left: "0", right: "0", output: "0" },
  ],
  recoveryCipherBits: "0110",
  recoveryKeyBits: "1100",
  recoveryPlaintextBits: "1010",
  successMessage:
    "Recovered. XOR with the same key restored the original signal and the briefing channel is readable again.",
  hints: [
    "Start with the core rule: when two bits are the same, the output is 0.",
    "When the two bits are different, the output is 1.",
    "Use that same rule on every column. 0110 XOR 1100 gives 1010.",
  ],
};

export const blockCipherLevel: BlockCipherLevelConfig = {
  id: "block-cipher",
  title: "Level 3: Fix the Secure Encryption Setup",
  mission:
    "The secure channel failed. Rebuild the encryption flow by placing the cards in the right roles: input, starting helper, secret, encryption step, and output.",
  slotLabels: [
    "Slot 1: Data going in",
    "Slot 2: Starting helper value",
    "Slot 3: Secret used by encryption",
    "Slot 4: Encryption action",
    "Slot 5: Data coming out",
  ],
  correctSequence: [
    "plaintext",
    "iv",
    "key",
    "encrypt",
    "ciphertext",
  ],
  choices: [
    {
      id: "plaintext",
      label: "Plaintext",
      helper: "The original message chunk before encryption.",
    },
    {
      id: "iv",
      label: "IV",
      helper: "The starting helper value that makes repeated encryption less predictable.",
    },
    {
      id: "key",
      label: "Key",
      helper: "The secret value used by the cipher.",
    },
    {
      id: "encrypt",
      label: "Encrypt",
      helper: "The action that transforms the input into protected output.",
    },
    {
      id: "ciphertext",
      label: "Ciphertext",
      helper: "The scrambled block that comes out of the cipher.",
    },
  ],
  successMessage:
    "Flow restored. The channel is secure again, and the final Codex entry is now unlocked.",
  hints: [
    "Plaintext goes in first, and ciphertext comes out last.",
    "The key is the secret. The IV is only the starting helper value.",
    "One clean order is Plaintext -> IV -> Key -> Encrypt -> Ciphertext.",
  ],
};

export const gameplayLevels: GameplayLevelConfig[] = [
  caesarLevel,
  xorLevel,
  blockCipherLevel,
];

export const codexEntries: Record<CodexEntryId, CodexEntry> = {
  "caesar-cipher": {
    id: "caesar-cipher",
    title: "Codex: Caesar Cipher",
    summary: "A Caesar cipher rotates every letter by the same fixed amount.",
    bullets: [
      "A Caesar cipher shifts every letter by the same number.",
      "To decrypt, shift letters back by the same amount.",
      "It is a simple example of a substitution cipher.",
    ],
  },
  "xor-stream": {
    id: "xor-stream",
    title: "Codex: XOR / Stream Cipher",
    summary: "XOR outputs 1 for difference and 0 for a match, which is why the same key can scramble and then restore a signal.",
    bullets: [
      "XOR gives 0 when two bits are the same and 1 when they are different.",
      "Applying XOR with the same key a second time restores the original bits.",
      "The values still need to line up position by position for the result to make sense.",
    ],
  },
  "block-cipher": {
    id: "block-cipher",
    title: "Codex: Block Cipher and IV",
    summary: "A block cipher works on chunks of data, and the key and IV do different jobs in the process.",
    bullets: [
      "A block cipher encrypts fixed-size chunks of data instead of one letter at a time.",
      "The key is the secret value used for encryption.",
      "The IV is a starting helper value, not the secret key.",
    ],
  },
};
