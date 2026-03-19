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
  hints: string[];
}

export interface XorLevelConfig {
  id: "xor-stream";
  title: string;
  mission: string;
  ciphertextHex: string;
  maskTextClue: string;
  targetMaskHex: string;
  plaintext: string;
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
    "An intercepted route instruction was shifted by a single Caesar offset. Dial the shift until the message reads clearly.",
  ciphertext: "TLLA HA AOL IYPKNL",
  targetShift: 7,
  plaintext: "MEET AT THE BRIDGE",
  hints: [
    "A Caesar shift moves each letter by the same amount. Try common small shifts first, then watch the preview.",
    "If the slider is correct, the preview will become ordinary English. The target shift for this message is 7.",
  ],
};

export const xorLevel: XorLevelConfig = {
  id: "xor-stream",
  title: "Level 2: XOR Stream Cipher",
  mission:
    "The captured ciphertext is hex, but the stream mask clue is plain text. Convert the clue to hex first, then align it with the ciphertext.",
  ciphertextHex: "191306186013",
  maskTextClue: "MASK42",
  targetMaskHex: "4d41534b3432",
  plaintext: "TRUST!",
  hints: [
    "If you type the clue directly as letters, the input is malformed for this level. Convert each text character into hex bytes first.",
    "The mask text is six characters long, so the hex input must be 12 hex digits: 4d41534b3432.",
  ],
};

export const blockCipherLevel: BlockCipherLevelConfig = {
  id: "block-cipher",
  title: "Level 3: Block Cipher Roles",
  mission:
    "Rebuild the block-cipher pipeline. The IV randomizes the block before encryption, while the key is used by the encryption step itself.",
  slotLabels: [
    "Slot 1: Starting input",
    "Slot 2: Pre-encryption mixing",
    "Slot 3: Encryption step",
    "Slot 4: Output",
  ],
  correctSequence: [
    "plaintext-block",
    "mix-with-iv",
    "encrypt-with-key",
    "ciphertext-block",
  ],
  choices: [
    {
      id: "plaintext-block",
      label: "Plaintext block",
      helper: "The original block that enters the pipeline.",
    },
    {
      id: "mix-with-iv",
      label: "Combine with IV",
      helper: "Use the initialization vector to randomize the first block.",
    },
    {
      id: "encrypt-with-key",
      label: "Encrypt with key",
      helper: "The secret key drives the encryption transformation.",
    },
    {
      id: "ciphertext-block",
      label: "Ciphertext block",
      helper: "The encrypted block that leaves the pipeline.",
    },
    {
      id: "reuse-iv-as-key",
      label: "Use IV as the key",
      helper: "Decoy: the IV never replaces the secret key.",
    },
  ],
  hints: [
    "Think in stages: the plaintext enters first, the IV influences the block before encryption, and the key is used during encryption.",
    "Correct order: Plaintext block -> Combine with IV -> Encrypt with key -> Ciphertext block.",
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
    summary: "A Caesar cipher rotates each alphabetic character by the same fixed shift.",
    bullets: [
      "Encryption and decryption use one constant offset across the whole message.",
      "Trying candidate shifts and checking for readable output is often enough to break it.",
      "It is a substitution cipher, not modern secure encryption.",
    ],
  },
  "xor-stream": {
    id: "xor-stream",
    title: "Codex: XOR / Stream Cipher",
    summary: "XOR combines aligned bytes bit by bit; correct representation matters as much as the math.",
    bullets: [
      "Ciphertext, plaintext, and keystream must line up byte for byte.",
      "Hex is just a representation; the XOR happens on the underlying byte values.",
      "Malformed or misaligned inputs produce nonsense, even if the idea is right.",
    ],
  },
  "block-cipher": {
    id: "block-cipher",
    title: "Codex: Block Cipher and IV",
    summary: "The IV and the key play different roles in a block cipher workflow.",
    bullets: [
      "The key is the secret value used by the encryption algorithm.",
      "The IV adds freshness so repeated messages do not begin the same way.",
      "The IV is not a replacement for the key and does not need to remain secret in the same way.",
    ],
  },
};
