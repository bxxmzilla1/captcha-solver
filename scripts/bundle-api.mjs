import { build } from "esbuild";
import { rmSync } from "fs";

const handlers = ["health", "solve-captcha", "solve"];

rmSync("api", { recursive: true, force: true });

for (const name of handlers) {
  await build({
    entryPoints: [`api-src/${name}.ts`],
    outfile: `api/${name}.cjs`,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node18",
    sourcemap: true,
    logLevel: "info",
    external: ["@google/genai"],
    footer: {
      js: 'if (typeof module.exports.default === "function") { module.exports = module.exports.default; }',
    },
  });
}

console.log("API handlers bundled to api/*.cjs");
