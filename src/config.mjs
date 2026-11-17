import os from "node:os";
import path from "node:path";

export const DEFAULT_CONFIG = Object.freeze({
  root: path.join(os.homedir(), ".dsh", "memory-service"),
  capture: true,
  budgetTokens: 1200,
  extractEveryTurns: 1,
  minConfidence: 0.55,
  queryExpansion: true
});

function integer(value, fallback, min, max, warnings, name) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    if (value !== undefined) warnings.push(name + " is not a number; using " + fallback);
    return fallback;
  }
  if (n < min || n > max) {
    warnings.push(name + " out of range; clamped to " + Math.min(max, Math.max(min, Math.round(n))));
    return Math.min(max, Math.max(min, Math.round(n)));
  }
  return Math.round(n);
}

export function normalizeConfig(raw = {}) {
  const warnings = [];
  const input = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  let root = typeof input.root === "string" && input.root.trim() !== "" ? input.root.trim() : (process.env.DSH_MEMORY_HOME || DEFAULT_CONFIG.root);
  root = path.resolve(root);
  const capture = input.capture !== false;
  const budgetTokens = integer(input.budgetTokens, DEFAULT_CONFIG.budgetTokens, 200, 8000, warnings, "budgetTokens");
  const extractEveryTurns = integer(input.extractEveryTurns, DEFAULT_CONFIG.extractEveryTurns, 1, 50, warnings, "extractEveryTurns");
  let minConfidence = Number(input.minConfidence);
  if (!Number.isFinite(minConfidence)) minConfidence = DEFAULT_CONFIG.minConfidence;
  if (minConfidence < 0 || minConfidence > 1) {
    warnings.push("minConfidence out of range; clamped to [0,1]");
    minConfidence = Math.min(1, Math.max(0, minConfidence));
  }
  const llm = input.llm && typeof input.llm === "object" && !Array.isArray(input.llm) ? input.llm : {};
  const queryExpansion = input.queryExpansion !== false;
  return { config: { root, capture, budgetTokens, extractEveryTurns, minConfidence, queryExpansion, llm }, warnings };
}
