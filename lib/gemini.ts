import { GoogleGenAI } from "@google/genai";

const clients = new Map<string, GoogleGenAI>();

export function getGeminiClient(apiKey?: string): GoogleGenAI {
  const key = (apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!key) {
    throw new Error(
      "Gemini API key is required. Enter it in the app settings or set GEMINI_API_KEY on the server."
    );
  }

  let client = clients.get(key);
  if (!client) {
    client = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "clearcaptcha-decoder",
        },
      },
    });
    clients.set(key, client);
  }

  return client;
}
