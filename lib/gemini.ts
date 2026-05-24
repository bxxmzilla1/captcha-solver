import { GoogleGenAI } from "@google/genai";
import { getServerApiKey } from "./api-key";

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: getServerApiKey(),
      httpOptions: {
        headers: {
          "User-Agent": "clearcaptcha-decoder",
        },
      },
    });
  }
  return aiClient;
}
