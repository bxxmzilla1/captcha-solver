import type { VercelRequest, VercelResponse } from "@vercel/node";
import { solveCaptcha } from "../lib/captcha";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { image, type, caseSensitive, length } = req.body ?? {};

    if (!image) {
      return res.status(400).json({ error: "Image data is required" });
    }

    const result = await solveCaptcha({
      image,
      type: type ?? "alphanumeric",
      caseSensitive: caseSensitive !== false,
      length: length ?? "Any",
    });

    return res.status(200).json({ success: true, result });
  } catch (error: unknown) {
    console.error("CAPTCHA solving failed:", error);
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while solving the CAPTCHA.";
    return res.status(500).json({ success: false, error: message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};
