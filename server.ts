import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { solveCaptcha, solveScreenshot } from "./lib/captcha";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", message: "Captcha Solver API is healthy" });
  });

  app.post("/api/solve-captcha", async (req, res) => {
    try {
      const { image, type, caseSensitive, length } = req.body;

      if (!image) {
        return res.status(400).json({ error: "Image data is required" });
      }

      const result = await solveCaptcha({
        image,
        type: type ?? "alphanumeric",
        caseSensitive: caseSensitive !== false,
        length: length ?? "Any",
      });

      res.json({ success: true, result });
    } catch (error: unknown) {
      console.error("CAPTCHA solving failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while solving the CAPTCHA.";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.post("/api/solve", async (req, res) => {
    try {
      let base64Input = "";
      const configType = req.query.type || req.body.type || "alphanumeric";
      const caseSensitive =
        req.query.caseSensitive !== "false" && req.body.caseSensitive !== false;
      const length = req.query.length || req.body.length || "Any";

      if (req.is("text/*") || typeof req.body === "string") {
        base64Input = typeof req.body === "string" ? req.body : String(req.body);
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

      const decoded = await solveScreenshot({
        image: base64Input,
        type: String(configType),
        caseSensitive,
        length: String(length),
      });

      res.json({
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
      res.status(500).json({ success: false, error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
