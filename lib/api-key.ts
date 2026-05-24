export function getServerApiKey(): string {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set it in your Vercel environment variables."
    );
  }
  return key;
}
