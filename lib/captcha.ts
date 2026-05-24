import { Type } from "@google/genai";
import { getGeminiClient } from "./gemini";

export const GEMINI_VISION_MODEL = "gemini-2.5-flash";

export interface ParsedImage {
  mimeType: string;
  base64Data: string;
}

export function parseBase64Image(image: string): ParsedImage {
  const match = image.match(/^data:(image\/[a-zA-Z0-9.-]+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], base64Data: match[2] };
  }
  return { mimeType: "image/png", base64Data: image };
}

export async function solveCaptcha(options: {
  image: string;
  type: string;
  caseSensitive: boolean;
  length: string;
}) {
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
    model: GEMINI_VISION_MODEL,
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      { text: userInstructionPrompt },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description:
              "The direct textual transcription of the CAPTCHA characters or mathematical expression.",
          },
          reasoning: {
            type: Type.STRING,
            description:
              "A brief, one-sentence description of the character identifying process and how visual noise was filtered out.",
          },
          mathResult: {
            type: Type.STRING,
            description:
              "The evaluated numerical solution of the mathematical equation, if the CAPTCHA contains one. Otherwise, return null.",
          },
          confidence: {
            type: Type.STRING,
            description:
              "Confidence output representing how sure the solver is. Allowed values: 'high', 'medium', 'low'.",
          },
        },
        required: ["text", "reasoning", "confidence"],
      },
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("Empty response received from the Gemini solver model.");
  }

  return JSON.parse(responseText.trim());
}

export async function solveScreenshot(options: {
  image: string;
  type: string;
  caseSensitive: boolean;
  length: string;
}) {
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
    model: GEMINI_VISION_MODEL,
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      { text: genericPrompt },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: {
            type: Type.STRING,
            description: "The decoded letters, digits, or characters.",
          },
          mathResult: {
            type: Type.STRING,
            description:
              "If the captured text displays a math challenge, compute the numeric result. Else return null.",
          },
          confidence: {
            type: Type.STRING,
            description:
              "Estimation of decode accuracy: 'high', 'medium', or 'low'.",
          },
        },
        required: ["text", "confidence"],
      },
    },
  });

  const responseText = response.text;
  if (!responseText) {
    throw new Error("Gemini models could not resolve the text from this screenshot.");
  }

  return JSON.parse(responseText.trim());
}
