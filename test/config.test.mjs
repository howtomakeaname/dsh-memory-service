import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { normalizeConfig, DEFAULT_CONFIG } from "../src/config.mjs";

test("config: clamps invalid numbers and preserves valid values", () => {
  const { config, warnings } = normalizeConfig({ root: "/tmp/memory-config-test", capture: false, budgetTokens: 1, extractEveryTurns: 999, minConfidence: 9 });
  assert.equal(config.root, path.resolve("/tmp/memory-config-test"));
  assert.equal(config.capture, false);
  assert.equal(config.budgetTokens, 200);
  assert.equal(config.extractEveryTurns, 50);
  assert.equal(config.minConfidence, 1);
  assert.equal(warnings.length, 3);
});

test("config: defaults are stable", () => {
  const { config } = normalizeConfig({ root: "/tmp/memory-config-default" });
  assert.equal(config.capture, true);
  assert.equal(config.budgetTokens, DEFAULT_CONFIG.budgetTokens);
  assert.equal(config.extractEveryTurns, 1);
  assert.equal(config.minConfidence, 0.55);
});
