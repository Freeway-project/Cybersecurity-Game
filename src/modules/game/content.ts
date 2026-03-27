import type { CodexEntryId, LevelId } from "@/types/study";

export interface CodexEntry {
  id: CodexEntryId;
  title: string;
  method: string;
  analysis: string[];
  note: string[];
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
  title: "Transmission Alpha",
  mission:
    "Alpha channel arrived encoded. Sweep the frequency dial until the intercept resolves and the source traffic aligns into readable text.",
  ciphertext: "PHHW DW WKH GRFN -- PLGQLJKW\nEORRG PRRQ ULVHV WRPRUURZ",
  targetShift: 3,
  plaintext: "MEET AT THE DOCK -- MIDNIGHT\nBLOOD MOON RISES TOMORROW",
  successMessage:
    "Transmission Alpha decrypted. Embedded coordinates and the word RENDEZVOUS have been recovered.",
  hints: [
    "The shift value is likely small. Start in the single digits.",
    "All visible intercepts come from the same source, so one key should clean up every message.",
    "A fixed alphabetic shift of 3 resolves the Alpha channel.",
  ],
};

export const xorLevel: XorLevelConfig = {
  id: "xor-stream",
  title: "Transmission Bravo",
  mission:
    "Bravo channel is scrambled. Calibrate the bitwise decode rule first, then apply the same transform to recover the intercepted signal.",
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
    "Transmission Bravo decrypted. The transfer window and confirmation phrase are now readable.",
  hints: [
    "Start with the core XOR rule: matching bits produce 0.",
    "Different bits produce 1. Apply the same rule to every recovery column.",
    "Use the calibrated rule straight across the row: 0110 XOR 1100 resolves to 1010.",
  ],
};

export const blockCipherLevel: BlockCipherLevelConfig = {
  id: "block-cipher",
  title: "Transmission Charlie",
  mission:
    "Charlie channel is live. Configure the outbound encryption pipeline in the correct order before the response window closes.",
  slotLabels: [
    "SLOT 1",
    "SLOT 2",
    "SLOT 3",
    "SLOT 4",
    "SLOT 5",
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
      helper: "Original response data before any encryption is applied.",
    },
    {
      id: "iv",
      label: "IV",
      helper: "Starting value used before encryption so repeated messages do not match.",
    },
    {
      id: "key",
      label: "Key",
      helper: "Secret value used by the cipher. This must stay distinct from the IV.",
    },
    {
      id: "encrypt",
      label: "Encrypt",
      helper: "Processing stage that transforms protected input into encrypted output.",
    },
    {
      id: "ciphertext",
      label: "Ciphertext",
      helper: "Protected output that leaves the channel after encryption.",
    },
  ],
  successMessage:
    "Channel configured. Encryption is active and the full Signal Log dossier is available.",
  hints: [
    "Plaintext enters first. Ciphertext is the final output node.",
    "The IV helps start the process. The key is the secret and is not interchangeable with it.",
    "A correct pipeline is Plaintext -> IV -> Key -> Encrypt -> Ciphertext.",
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
    title: "Signal Log -- Entry 1",
    method: "ALPHABETIC SHIFT CIPHER",
    analysis: [
      "The Alpha channel used a fixed-offset letter substitution.",
      "Every letter in the plaintext was shifted the same number of positions forward in the alphabet. The shift value was the key.",
    ],
    note: [
      "This method is trivially broken by frequency analysis or brute force.",
      "All 26 possible shifts can be tested in seconds. Modern use: none. Historical use: common pre-19th century.",
    ],
  },
  "xor-stream": {
    id: "xor-stream",
    title: "Signal Log -- Entry 2",
    method: "BITWISE XOR WITH KEY STREAM",
    analysis: [
      "The Bravo channel applied an XOR operation between the plaintext bits and a repeating key stream.",
      "XOR is invertible. Applying the same key to the ciphertext recovers the plaintext.",
    ],
    note: [
      "XOR is the foundation of stream ciphers and block cipher modes.",
      "The weakness here was key reuse. If the key stream repeats or is known, the cipher provides no security.",
    ],
  },
  "block-cipher": {
    id: "block-cipher",
    title: "Signal Log -- Entry 3",
    method: "BLOCK CIPHER, CBC MODE",
    analysis: [
      "The Charlie channel used a block cipher in CBC mode.",
      "The plaintext is split into fixed-size blocks. Each block is XORed with the previous ciphertext block, or the IV for the first block, before encryption with the key.",
    ],
    note: [
      "The IV ensures identical plaintexts produce different ciphertexts.",
      "The key is secret; the IV is not. Confusing the two breaks the scheme.",
    ],
  },
};
