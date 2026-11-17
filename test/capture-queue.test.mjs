import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MemoryService } from "../src/store.mjs";
import { CaptureQueue } from "../src/capture/queue.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "dsh-queue-test-")); }

test("capture queue: enqueue, drain, dedupe, persist", () => {
  const root = tmp();
  let service = new MemoryService({ root, workspaceId: "queue-a" }).init();
  let queue = new CaptureQueue(service.index.db);
  const id = queue.enqueue({ scope: "workspace:queue-a", sessionId: "s1", turn: 3, text: "以后都用 pnpm", title: "pnpm" });
  assert.ok(id);
  assert.equal(queue.stats().pending, 1);
  const first = queue.drain(service);
  assert.equal(first.processed, 1);
  assert.equal(first.pending, 0);
  assert.equal(service.search("pnpm", { scope: "workspace:queue-a" }).length, 1);

  queue.enqueue({ scope: "workspace:queue-a", sessionId: "s2", turn: 4, text: "以后都用 pnpm" });
  assert.equal(queue.stats().pending, 0);
  const duplicate = queue.drain(service);
  assert.equal(duplicate.processed, 0);
  assert.equal(service.list("workspace:queue-a").length, 1);

  service.close();
  service = new MemoryService({ root, workspaceId: "queue-a" }).init();
  queue = new CaptureQueue(service.index.db);
  assert.equal(queue.stats().pending, 0);
  service.close();
});

test("capture queue: interrupted running job is recovered", () => {
  const root = tmp();
  const service = new MemoryService({ root, workspaceId: "queue-b" }).init();
  let queue = new CaptureQueue(service.index.db);
  queue.enqueue({ scope: "workspace:queue-b", sessionId: "s1", turn: 1, text: "记住：统一使用 bun" });
  const job = queue.pending(1)[0];
  service.index.db.prepare("UPDATE capture_jobs SET status = 'running', updated_at = ? WHERE id = ?").run("2000-01-01T00:00:00.000Z", job.id);
  queue = new CaptureQueue(service.index.db);
  assert.equal(queue.stats().pending, 1);
  const result = queue.drain(service);
  assert.equal(result.processed, 1);
  service.close();
});
