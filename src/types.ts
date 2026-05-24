export type CaptchaStyle = "all" | "alphanumeric" | "numeric" | "math";

export interface CaptchaConfig {
  type: CaptchaStyle;
  caseSensitive: boolean;
  length: string;
}

export interface CaptchaSolvedResult {
  text: string;
  reasoning: string;
  mathResult: string | null;
  confidence: "high" | "medium" | "low";
}

export interface CaptchaHistoryItem {
  id: string;
  image: string; // Base64 data URL
  config: CaptchaConfig;
  result: CaptchaSolvedResult;
  timestamp: number;
}
