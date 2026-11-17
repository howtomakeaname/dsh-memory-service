import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MemoryService } from "../src/store.mjs";
import { parseMarkdown } from "../src/frontmatter.mjs";
import { importClaude, exportClaude } from "../src/adapters/claude.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "dsh-memory-test-")); }

test("store: upsert, get, list, search, artifact index", () => {
  const root = tmp();
  const service = new MemoryService({ root, workspaceId: "proj-a" }).init();
  const note = service.upsert({ scope: "workspace:proj-a", title: "Package manager", description: "Use pnpm", body: "The repo uses pnpm, not npm.", type: "convention" });
  assert.equal(note.revision, 1);
  assert.equal(service.get(note.id, { scope: "workspace:proj-a" }).title, "Package manager");
  assert.equal(service.search("pnpm", { scope: "workspace:proj-a" }).length, 1);
  assert.equal(service.search("pnpm", { scope: "global" }).length, 0);
  assert.equal(service.list("workspace:proj-a").length, 1);
  const context = service.context({ scope: "workspace:proj-a", query: "package manager" });
  assert.ok(context.text.includes("Package manager"));
  assert.ok(fs.existsSync(path.join(root, "workspaces", "proj-a", "MEMORY.md")));
  assert.ok(fs.existsSync(path.join(root, ".index", "memory.db")));
  service.close();
});

test("store: revision conflict and supersede", () => {
  const root = tmp();
  const service = new MemoryService({ root, workspaceId: "proj-b" }).init();
  const old = service.upsert({ scope: "workspace:proj-b", title: "Budget", description: "June budget", body: "June 23, 262000 USD", type: "fact" });
  assert.throws(() => service.upsert({ id: old.id, scope: "workspace:proj-b", title: "Budget", body: "changed", expectedRevision: 99 }), /revision conflict/);
  const next = service.upsert({ scope: "workspace:proj-b", title: "Budget", description: "July budget", body: "July 24, 221000 USD", type: "fact", supersedes: old.id });
  assert.equal(service.get(old.id, { scope: "workspace:proj-b" }).status, "superseded");
  assert.equal(service.get(next.id, { scope: "workspace:proj-b" }).status, "active");
  assert.equal(service.search("July", { scope: "workspace:proj-b" }).length, 1);
  service.close();
});

test("store: forget soft and hard", () => {
  const root = tmp();
  const service = new MemoryService({ root, workspaceId: "proj-c" }).init();
  const a = service.upsert({ scope: "workspace:proj-c", title: "Secret", description: "private", body: "secret-value", type: "fact" });
  service.forget(a.id, { scope: "workspace:proj-c" });
  assert.equal(service.get(a.id, { scope: "workspace:proj-c" }).status, "forgotten");
  assert.equal(service.search("secret", { scope: "workspace:proj-c" }).length, 0);
  const b = service.upsert({ scope: "workspace:proj-c", title: "Temp", description: "temp", body: "temp-value", type: "fact" });
  service.forget(b.id, { scope: "workspace:proj-c", hard: true });
  assert.equal(service.get(b.id, { scope: "workspace:proj-c" }), null);
  service.close();
});

test("claude adapter: import, skip unchanged, update changed, export", () => {
  const root = tmp();
  const source = tmp();
  fs.writeFileSync(path.join(source, "MEMORY.md"), "# Memory\n\n- [Build](build.md) — use pnpm\n- [User](user.md) — prefers Chinese\n");
  fs.writeFileSync(path.join(source, "build.md"), "---\nname: Build\ndescription: build command\nmetadata:\n  node_type: memory\n  type: project\n---\nRun pnpm build before commit.\n");
  fs.writeFileSync(path.join(source, "user.md"), "---\nname: User\ndescription: user preference\nmetadata:\n  node_type: memory\n  type: user\n---\nUser prefers Chinese replies.\n");
  const service = new MemoryService({ root, workspaceId: "proj-d" }).init();
  const first = importClaude(service, { source, project: "demo", scope: "workspace:proj-d" });
  assert.equal(first.imported, 2);
  assert.equal(first.errors.length, 0);
  assert.ok(service.search("pnpm build", { scope: "workspace:proj-d" }).length >= 1);
  const second = importClaude(service, { source, project: "demo", scope: "workspace:proj-d" });
  assert.equal(second.skipped, 2);
  fs.writeFileSync(path.join(source, "build.md"), "---\nname: Build\ndescription: build command\nmetadata:\n  node_type: memory\n  type: project\n---\nRun bun build before commit.\n");
  const third = importClaude(service, { source, project: "demo", scope: "workspace:proj-d" });
  assert.equal(third.updated, 1);
  assert.equal(third.skipped, 1);
  const target = tmp();
  exportClaude(service, { target, scope: "workspace:proj-d", force: true });
  assert.ok(fs.existsSync(path.join(target, "MEMORY.md")));
  const exported = fs.readdirSync(target).filter((f) => f.endsWith(".md") && f !== "MEMORY.md");
  assert.equal(exported.length, 2);
  const parsed = parseMarkdown(fs.readFileSync(path.join(target, exported[0]), "utf8"));
  assert.equal(parsed.data.metadata.node_type, "memory");
  service.close();
});

test("store: chinese substring search falls back when fts token differs", () => {
  const root = tmp();
  const service = new MemoryService({ root, workspaceId: "proj-zh" }).init();
  service.upsert({ scope: "workspace:proj-zh", title: "包管理器", description: "项目约定", body: "本项目统一使用 pnpm。", type: "convention" });
  const hits = service.search("统一", { scope: "workspace:proj-zh" });
  assert.ok(hits.length >= 1);
  service.close();
});

test("store: search hydrates and finds external markdown edits", () => {
  const root = tmp();
  const service = new MemoryService({ root, workspaceId: "proj-edit" }).init();
  const note = service.upsert({ scope: "workspace:proj-edit", title: "Token", description: "old", body: "old-token", type: "fact" });
  const file = note.path;
  const raw = fs.readFileSync(file, "utf8").replace("old-token", "new-token");
  fs.writeFileSync(file, raw);
  const hits = service.search("new-token", { scope: "workspace:proj-edit" });
  assert.equal(hits.length, 1);
  assert.equal(hits[0].body, "new-token");
  fs.rmSync(file);
  assert.equal(service.search("new-token", { scope: "workspace:proj-edit" }).length, 0);
  service.close();
});

test("store: concurrent services serialize CAS updates", () => {
  const root = tmp();
  const s1 = new MemoryService({ root, workspaceId: "proj-lock" }).init();
  const s2 = new MemoryService({ root, workspaceId: "proj-lock" }).init();
  const note = s1.upsert({ scope: "workspace:proj-lock", title: "Mode", body: "initial", type: "fact" });
  const first = s1.get(note.id, { scope: "workspace:proj-lock" });
  const second = s2.get(note.id, { scope: "workspace:proj-lock" });
  assert.equal(first.revision, 1);
  assert.equal(second.revision, 1);
  s1.upsert({ id: note.id, scope: "workspace:proj-lock", expectedRevision: first.revision, title: "Mode", body: "first writer", type: "fact" });
  assert.throws(() => s2.upsert({ id: note.id, scope: "workspace:proj-lock", expectedRevision: second.revision, title: "Mode", body: "second writer", type: "fact" }), /revision conflict/);
  assert.equal(s2.get(note.id, { scope: "workspace:proj-lock" }).body, "first writer");
  s1.close(); s2.close();
});

test("store: same key with different values becomes a resolvable conflict", () => {
  const root = tmp();
  const service = new MemoryService({ root, workspaceId: "proj-conflict" }).init();
  const first = service.upsert({ scope: "workspace:proj-conflict", key: "project.package_manager", title: "Package manager", body: "Use pnpm", type: "convention" });
  const second = service.upsert({ scope: "workspace:proj-conflict", key: "project.package_manager", title: "Package manager", body: "Use bun", type: "convention" });
  assert.equal(second.status, "conflicted");
  assert.equal(service.get(first.id, { scope: "workspace:proj-conflict" }).status, "conflicted");
  assert.equal(service.listConflicts("workspace:proj-conflict").length, 2);
  assert.match(service.context({ scope: "workspace:proj-conflict", query: "package manager" }).text, /未解决的记忆冲突/);
  service.resolveConflict(second.id, first.id, { scope: "workspace:proj-conflict" });
  assert.equal(service.get(second.id, { scope: "workspace:proj-conflict" }).status, "active");
  assert.equal(service.get(first.id, { scope: "workspace:proj-conflict" }).status, "superseded");
  assert.equal(service.listConflicts("workspace:proj-conflict").length, 0);
  service.close();
});
