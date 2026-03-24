import type {
  AssessmentItemId,
  LikertScore,
  PriorCryptoExperience,
  SurveyItemId,
  StudyStep,
} from "@/types/study";

export interface AssessmentItemOption {
  value: string;
  label: string;
}

export interface AssessmentItem {
  id: AssessmentItemId;
  prompt: string;
  options: AssessmentItemOption[];
  correctAnswer: string;
}

export interface SurveyItem {
  id: SurveyItemId;
  label: string;
}

export const studyCopy = {
  title: "Cryptography Mission Pilot",
  subtitle:
    "A short research pilot on how CS students learn introductory cryptography concepts.",
  consentHeading: "Consent and study conditions",
  consentBullets: [
    "Participation is voluntary and not graded.",
    "You may stop at any time without penalty.",
    "The pilot stores anonymous gameplay, assessment, and survey responses.",
  ],
  sessionOutline: [
    "Consent and setup",
    "Three-question pre-test",
    "Three cryptography micro-levels",
    "Three-question post-test",
    "Short perception survey",
  ],
};

export const studyStepLabels: Record<Exclude<StudyStep, "landing" | "complete">, string> = {
  consent: "Consent",
  pretest: "Pre-test",
  "game-placeholder": "Gameplay",
  posttest: "Post-test",
  survey: "Survey",
};

export const assessmentItems: AssessmentItem[] = [
  {
    id: "caesar-basics",
    prompt: "A Caesar cipher with shift 3 changes A into:",
    options: [
      { value: "D", label: "D" },
      { value: "B", label: "B" },
      { value: "X", label: "X" },
      { value: "Z", label: "Z" },
    ],
    correctAnswer: "D",
  },
  {
    id: "xor-alignment",
    prompt: "For XOR decryption, what must match before you can combine two hex strings safely?",
    options: [
      { value: "length", label: "They must be aligned and the same length." },
      { value: "case", label: "They must use uppercase hex only." },
      { value: "spacing", label: "They must include a space every two bytes." },
      { value: "padding", label: "They must always end with 00." },
    ],
    correctAnswer: "length",
  },
  {
    id: "block-key-iv",
    prompt: "In a block cipher workflow, the IV is used to:",
    options: [
      { value: "replace-key", label: "Replace the secret key entirely." },
      { value: "randomize", label: "Add fresh randomness without changing the secret key." },
      { value: "compress", label: "Compress the plaintext before encryption." },
      { value: "decode", label: "Decode the ciphertext directly." },
    ],
    correctAnswer: "randomize",
  },
];

export const surveyItems: SurveyItem[] = [
  { id: "helpfulScore", label: "The game helped me understand the topic." },
  { id: "hintsScore", label: "The hints were useful." },
  { id: "engagementScore", label: "The experience felt engaging." },
  { id: "reuseScore", label: "I would use this format in a class again." },
];

export const likertLabels: Record<LikertScore, string> = {
  1: "Strongly disagree",
  2: "Disagree",
  3: "Neutral",
  4: "Agree",
  5: "Strongly agree",
};

export const priorExperienceLabels: Record<PriorCryptoExperience, string> = {
  none: "None",
  some: "Some",
  moderate: "Moderate",
  strong: "Strong",
};
