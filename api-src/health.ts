import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sendJson } from "../lib/http-json";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  sendJson(res, 200, {
    status: "ok",
    message: "Captcha Solver API is healthy",
  });
}
