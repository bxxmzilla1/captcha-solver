import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveApiKey } from "../lib/api-key";
import { solveCaptcha } from "../lib/captcha";
import { sendJson } from "../lib/http-json";
import { formatApiError } from "../lib/format-error";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { image, type, caseSensitive, length, apiKey } = req.body ?? {};

    if (!image) {
      return sendJson(res, 400, { error: "Image data is required" });
    }

    const resolvedKey = resolveApiKey({
      header: req.headers["x-gemini-api-key"],
      body: apiKey,
    });

    const result = await solveCaptcha({
      image,
      type: type ?? "alphanumeric",
      caseSensitive: caseSensitive !== false,
      length: length ?? "Any",
      apiKey: resolvedKey,
    });

    return sendJson(res, 200, { success: true, result });
  } catch (error: unknown) {
    console.error("CAPTCHA solving failed:", error);
    const message = formatApiError(
      error,
      "An unexpected error occurred while solving the CAPTCHA."
    );
    return sendJson(res, 500, { success: false, error: message });
  }
}
