var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// api-src/solve.ts
var solve_exports = {};
__export(solve_exports, {
  default: () => handler
});
module.exports = __toCommonJS(solve_exports);

// lib/captcha.ts
var import_genai2 = require("@google/genai");

// lib/gemini.ts
var import_genai = require("@google/genai");
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is missing. Set it in your environment variables."
      );
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "clearcaptcha-decoder"
        }
      }
    });
  }
  return aiClient;
}

// lib/captcha.ts
function parseBase64Image(image) {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.-]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], base64Data: match[2] };
  }
  return { mimeType: "image/png", base64Data: image };
}
async function solveScreenshot(options) {
  const { mimeType, base64Data } = parseBase64Image(options.image);
  const client = getGeminiClient();
  const genericPrompt = `Thoroughly inspect this screenshot containing a CAPTCHA challenge or textual verification puzzle. Your principal instruction is to decode the character symbols precisely.
Parameters:
- Mode hint: ${options.type}
- Casing sensitivity: ${options.caseSensitive ? "Strict (Honor upper & lower capitals)" : "Loose"}
- Characters length limit: ${options.length}

Instructions:
1. Isolate the target text characters from any intersecting lines, overlay backgrounds, salt-and-pepper noise, or wave distortions.
2. If this text is a clear math problem, find the written text (e.g., "7 + 2") and calculate the math result (e.g., "9").
3. Return a clean JSON output containing both the transcribed text and the final answer.`;
  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      },
      { text: genericPrompt }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: import_genai2.Type.OBJECT,
        properties: {
          text: {
            type: import_genai2.Type.STRING,
            description: "The decoded letters, digits, or characters."
          },
          mathResult: {
            type: import_genai2.Type.STRING,
            description: "If the captured text displays a math challenge, compute the numeric result. Else return null."
          },
          confidence: {
            type: import_genai2.Type.STRING,
            description: "Estimation of decode accuracy: 'high', 'medium', or 'low'."
          }
        },
        required: ["text", "confidence"]
      }
    }
  });
  const responseText = response.text;
  if (!responseText) {
    throw new Error("Gemini models could not resolve the text from this screenshot.");
  }
  return JSON.parse(responseText.trim());
}

// api-src/solve.ts
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    let base64Input = "";
    const configType = req.query.type || req.body?.type || "alphanumeric";
    const caseSensitive = req.query.caseSensitive !== "false" && req.body?.caseSensitive !== false;
    const length = req.query.length || req.body?.length || "Any";
    if (typeof req.body === "string") {
      base64Input = req.body;
    } else if (req.body?.screenshot || req.body?.image || req.body?.base64) {
      base64Input = req.body.screenshot || req.body.image || req.body.base64;
    }
    if (!base64Input) {
      return res.status(400).json({
        success: false,
        error: "Missing image data. Please supply 'screenshot', 'image', or raw base64 in the request body."
      });
    }
    const decoded = await solveScreenshot({
      image: base64Input,
      type: String(configType),
      caseSensitive,
      length: String(length)
    });
    return res.status(200).json({
      success: true,
      text: decoded.text,
      mathResult: decoded.mathResult || null,
      confidence: decoded.confidence,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error("Simple Solve API Error:", error);
    const message = error instanceof Error ? error.message : "An error occurred while deciphering the screenshot.";
    return res.status(500).json({ success: false, error: message });
  }
}
if (typeof module.exports.default === "function") { module.exports = module.exports.default; }
//# sourceMappingURL=solve.js.map
