import type { VercelRequest, VercelResponse } from "@vercel/node";
import { solveScreenshot } from "../lib/captcha";
import { formatApiError } from "../lib/format-error";
import { sendJson } from "../lib/http-json";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
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
      return sendJson(res, 400, {
        success: false,
        error:
          "Missing image data. Please supply 'screenshot', 'image', or raw base64 in the request body.",
      });
    }

    const decoded = await solveScreenshot({
      image: base64Input,
      type: String(configType),
      caseSensitive,
      length: String(length),
    });

    return sendJson(res, 200, {
      success: true,
      text: decoded.text,
      mathResult: decoded.mathResult || null,
      confidence: decoded.confidence,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error("Simple Solve API Error:", error);
    const message = formatApiError(
      error,
      "An error occurred while deciphering the screenshot."
    );
    return sendJson(res, 500, { success: false, error: message });
  }
}
