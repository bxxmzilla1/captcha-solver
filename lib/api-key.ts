export function resolveApiKey(options: {
  header?: string | string[] | undefined;
  body?: string | undefined;
}): string {
  const fromHeader = Array.isArray(options.header)
    ? options.header[0]
    : options.header;
  const key = (fromHeader || options.body || process.env.GEMINI_API_KEY || "").trim();

  if (!key) {
    throw new Error(
      "Gemini API key is required. Enter it in the app settings or set GEMINI_API_KEY on the server."
    );
  }

  return key;
}
