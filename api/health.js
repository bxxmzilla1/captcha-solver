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

// api-src/health.ts
var health_exports = {};
__export(health_exports, {
  default: () => handler
});
module.exports = __toCommonJS(health_exports);
function handler(_req, res) {
  res.status(200).json({
    status: "ok",
    message: "Captcha Solver API is healthy"
  });
}
if (typeof module.exports.default === "function") { module.exports = module.exports.default; }
//# sourceMappingURL=health.js.map
