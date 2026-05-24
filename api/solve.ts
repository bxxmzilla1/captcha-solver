import type { VercelRequest, VercelResponse } from "@vercel/node";
import { resolveApiKey } from "../lib/api-key";
import { solveScreenshot } from "../lib/captcha";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    let base64Input = "";
    const configType = req.query.type || req.body?.type || "alphanumeric";
    const caseSensitive =
      req.query.caseSensitive !== "false" && req.body?.caseSensitive !== false;
    const length = req.query.length || req.body?.length || "Any";

    if (typeof req.body === "string") {
      base64Input = req.body;
    } else if (req.body?.screenshot || req.body?.image || req.body?.base64) {
      base64Input = req.body.screenshot || req.body.image || req.body.base64;
    }

    if (!base64Input) {
      return res.status(400).json({
        success: false,
        error:
          "Missing image data. Please supply 'screenshot', 'image', or raw base64 in the request body.",
      });
    }

    const resolvedKey = resolveApiKey({
      header: req.headers["x-gemini-api-key"],
      body: req.body?.apiKey,
    });

    const decoded = await solveScreenshot({
      image: base64Input,
      type: String(configType),
      caseSensitive,
      length: String(length),
      apiKey: resolvedKey,
    });

    return res.status(200).json({
      success: true,
      text: decoded.text,
      mathResult: decoded.mathResult || null,
      confidence: decoded.confidence,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error("Simple Solve API Error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "An error occurred while deciphering the screenshot.";
    return res.status(500).json({ success: false, error: message });
  }
}
