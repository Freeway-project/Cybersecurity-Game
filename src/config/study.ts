import type {
  LikertScore,
  PriorCryptoExperience,
  SurveyItemId,
  StudyStep,
} from "@/types/study";

// Increment this when the game changes in a way that affects data comparability.
// v1/v2 = earlier game iterations (not versioned, collected before this field existed)
// v3 = block-cipher + phishing-inspector + terminal-forensics, auto-hints, simplified UI labels
export const GAME_VERSION = "v3";

export interface SurveyItem {
  id: SurveyItemId;
  label: string;
}

export const studyCopy = {
  title: "Operation: Signal Ghost",
  subtitle:
    "A cybersecurity mission game — intercept transmissions, detect threats, defend networks, and investigate breaches.",
  consentHeading: "// ANALYST REGISTRATION",
  consentBullets: [
    "Participation is voluntary and not graded.",
    "You may stand down at any time without penalty.",
    "The station stores anonymous gameplay and survey data for research.",
  ],
};

export const studyStepLabels: Record<Exclude<StudyStep, "landing" | "complete">, string> = {
  consent: "Register",
  briefing: "Briefing",
  "game-placeholder": "Mission",
  debrief: "Debrief",
  survey: "Survey",
};

export const surveyItems: SurveyItem[] = [
  { id: "helpfulScore", label: "The game helped me understand the cybersecurity concepts." },
  { id: "hintsScore", label: "The intel hints were useful when I was stuck." },
  { id: "engagementScore", label: "The experience felt engaging, not like a quiz." },
  { id: "reuseScore", label: "I would use this format in a class or training again." },
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
