import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createExtractor } from "../src/capture/extract.mjs";
import { CaptureQueue } from "../src/capture/queue.mjs";
import { MemoryService } from "../src/store.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "dsh-extract-test-")); }

function mockLlm(payload) {
  return { available: true, async complete() { return { ok: true, text: JSON.stringify(payload) }; } };
}

test("extractor: accepts grounded durable candidate", async () => {
  const llm = mockLlm({ items: [{ text: "Use pnpm for this project", title: "Package manager", type: "convention", scope: "workspace", confidence: 0.9, evidence: "以后都用 pnpm" }] });
  const extractor = createExtractor({ llm });
  const result = await extractor.extract({ messages: [{ role: "user", text: "以后都用 pnpm" }], scope: "workspace:x" });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].type, "convention");
});

test("extractor: rejects ungrounded evidence and low confidence", async () => {
  const llm = mockLlm({ items: [
    { text: "Use bun", title: "x", type: "convention", confidence: 0.9, evidence: "not in transcript" },
    { text: "Use npm", title: "y", type: "fact", confidence: 0.1, evidence: "以后都用 pnpm" }
  ] });
  const extractor = createExtractor({ llm });
  const result = await extractor.extract({ messages: [{ role: "user", text: "以后都用 pnpm" }] });
  assert.equal(result.candidates.length, 0);
});

test("queue: async drain commits extracted candidates", async () => {
  const root = tmp();
  const service = new MemoryService({ root, workspaceId: "extract-a" }).init();
  const queue = new CaptureQueue(service.index.db);
  queue.enqueue({ scope: "workspace:extract-a", sessionId: "s1", turn: 2, kind: "turn", text: "以后都用 pnpm", payload: JSON.stringify({ scope: "workspace:extract-a", messages: [{ role: "user", text: "以后都用 pnpm" }] }) });
  const extractor = { async extract() { return { ok: true, candidates: [{ text: "Use pnpm for this project", title: "Package manager", type: "convention", confidence: 0.9, evidence: "以后都用 pnpm" }] }; } };
  const result = await queue.drainAsync(service, { extractor });
  assert.equal(result.processed, 1);
  assert.equal(result.pending, 0);
  assert.equal(service.search("pnpm", { scope: "workspace:extract-a" }).length, 1);
  service.close();
});

test("queue: turn jobs stay pending without an extractor", async () => {
  const root = tmp();
  const service = new MemoryService({ root, workspaceId: "extract-b" }).init();
  const queue = new CaptureQueue(service.index.db);
  queue.enqueue({ scope: "workspace:extract-b", sessionId: "s2", kind: "turn", text: "remember this", payload: "{}" });
  const result = await queue.drainAsync(service, {});
  assert.equal(result.pending, 1);
  assert.equal(service.search("remember", { scope: "workspace:extract-b" }).length, 0);
  service.close();
});
