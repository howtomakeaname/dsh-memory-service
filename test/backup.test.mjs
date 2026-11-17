import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MemoryService } from "../src/store.mjs";
import { backupMemory, restoreMemory } from "../src/core/backup.mjs";
import { SCHEMA_VERSION } from "../src/core/schema.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "dsh-backup-test-")); }

test("schema: init writes a version marker", () => {
  const root = tmp();
  const service = new MemoryService({ root }).init();
  service.close();
  const schema = JSON.parse(fs.readFileSync(path.join(root, ".index", "schema.json"), "utf8"));
  assert.equal(schema.version, SCHEMA_VERSION);
});

test("backup: copies content and restore rebuilds a fresh index", () => {
  const root = tmp();
  const backupDir = tmp();
  const target = tmp();
  const service = new MemoryService({ root, workspaceId: "backup-a" }).init();
  service.upsert({ scope: "workspace:backup-a", title: "Package manager", body: "Use pnpm", type: "convention" });
  service.close();

  const result = backupMemory(root, backupDir);
  assert.equal(result.notes, 1);
  assert.ok(fs.existsSync(path.join(backupDir, "backup.json")));
  assert.ok(!fs.existsSync(path.join(backupDir, ".index")), "backup must not copy the rebuildable index");

  const restored = new MemoryService({ root: target, workspaceId: "backup-a" }).init();
  restored.close();
  restoreMemory(backupDir, target);
  const check = new MemoryService({ root: target, workspaceId: "backup-a" }).init();
  assert.equal(check.list("workspace:backup-a").length, 1);
  assert.equal(check.search("pnpm", { scope: "workspace:backup-a" }).length, 1);
  check.close();
});

test("restore: refuses a non-empty target without force", () => {
  const source = tmp();
  const target = tmp();
  const service = new MemoryService({ root: source, workspaceId: "restore-a" }).init();
  service.upsert({ scope: "workspace:restore-a", title: "A", body: "value", type: "fact" });
  service.close();
  const backup = backupMemory(source, tmp());
  const occupied = new MemoryService({ root: target, workspaceId: "restore-b" }).init();
  occupied.upsert({ scope: "workspace:restore-b", title: "B", body: "other", type: "fact" });
  occupied.close();
  assert.throws(() => restoreMemory(backup.target, target), /already has memory data/);
  restoreMemory(backup.target, target, { force: true });
});
