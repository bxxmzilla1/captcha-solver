import { build } from "esbuild";
import { mkdirSync, rmSync, writeFileSync } from "fs";

const handlers = ["health", "solve-captcha", "solve"];

rmSync("api", { recursive: true, force: true });
mkdirSync("api", { recursive: true });
writeFileSync("api/package.json", JSON.stringify({ type: "commonjs" }, null, 2));

for (const name of handlers) {
  await build({
    entryPoints: [`api-src/${name}.ts`],
    outfile: `api/${name}.js`,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node18",
    logLevel: "info",
    footer: {
      js: 'if (typeof module.exports.default === "function") { module.exports = module.exports.default; }',
    },
  });
}

console.log("API handlers bundled to api/*.js");
