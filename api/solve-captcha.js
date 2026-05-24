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

// api-src/solve-captcha.ts
var solve_captcha_exports = {};
__export(solve_captcha_exports, {
  default: () => handler
});
module.exports = __toCommonJS(solve_captcha_exports);

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
async function solveCaptcha(options) {
  const { mimeType, base64Data } = parseBase64Image(options.image);
  const client = getGeminiClient();
  const userInstructionPrompt = `Analyze the provided CAPTCHA image with meticulous accuracy.
Rules specified by the user:
- Preferred CAPTCHA Style/Type: ${options.type} (can be alphanumeric, numeric-only, or mathematical math equations)
- Case-Sensitivity instruction: ${options.caseSensitive ? "Yes (preserve exact casing)" : "No (casing matches whatever looks natural)"}
- Expected Character Length: ${options.length || "Any"}

Task instructions:
1. Examine the warped, distorted, blurred, or noisy text in the foreground. Ignore any background lines, noise fields, dots, colorful static, or intersecting grids.
2. If this is a mathematical expression (e.g. "8 + 5", "12 - 4", "six + 3"), transcribe the equation as 'text' (e.g., "8+5"), and evaluate the computed mathematical solution as 'mathResult' (e.g., "13"). Otherwise, 'mathResult' can be null or empty.
3. Transcribe standard alphanumeric characters strictly as they appear, keeping the rules in mind.
4. Output your analysis in the required JSON structure.`;
  const response = await client.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Data
        }
      },
      { text: userInstructionPrompt }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: import_genai2.Type.OBJECT,
        properties: {
          text: {
            type: import_genai2.Type.STRING,
            description: "The direct textual transcription of the CAPTCHA characters or mathematical expression."
          },
          reasoning: {
            type: import_genai2.Type.STRING,
            description: "A brief, one-sentence description of the character identifying process and how visual noise was filtered out."
          },
          mathResult: {
            type: import_genai2.Type.STRING,
            description: "The evaluated numerical solution of the mathematical equation, if the CAPTCHA contains one. Otherwise, return null."
          },
          confidence: {
            type: import_genai2.Type.STRING,
            description: "Confidence output representing how sure the solver is. Allowed values: 'high', 'medium', 'low'."
          }
        },
        required: ["text", "reasoning", "confidence"]
      }
    }
  });
  const responseText = response.text;
  if (!responseText) {
    throw new Error("Empty response received from the Gemini solver model.");
  }
  return JSON.parse(responseText.trim());
}

// api-src/solve-captcha.ts
async function handler(req, res) {
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
      length: length ?? "Any"
    });
    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("CAPTCHA solving failed:", error);
    const message = error instanceof Error ? error.message : "An unexpected error occurred while solving the CAPTCHA.";
    return res.status(500).json({ success: false, error: message });
  }
}
if (typeof module.exports.default === "function") { module.exports = module.exports.default; }
//# sourceMappingURL=solve-captcha.js.map
