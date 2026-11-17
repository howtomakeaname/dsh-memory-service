import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { apply } from "../src/plugin.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "dsh-plugin-test-")); }

function fakeCtx() {
  const handlers = new Map();
  const tools = new Map();
  const disposers = [];
  return {
    handlers,
    tools,
    ctx: {
      on(event, handler) { handlers.set(event, handler); },
      tools: { register(tool) { tools.set(tool.name, tool); return () => tools.delete(tool.name); } },
      effect(fn) { const d = fn(); if (typeof d === "function") disposers.push(d); },
      logger: { info() {}, warn() {}, debug() {} }
    },
    dispose() { for (const d of disposers) d(); }
  };
}

test("plugin: registers tools and injects recalled memory", async () => {
  const root = tmp();
  const f = fakeCtx();
  apply(f.ctx, { root, capture: true });
  assert.deepEqual([...f.tools.keys()].sort(), ["memory_conflicts", "memory_flush", "memory_forget", "memory_get", "memory_resolve", "memory_save", "memory_search", "memory_stats", "memory_update"]);

  const save = f.tools.get("memory_save");
  const saved = await save.execute({ text: "The project uses pnpm for dependency management.", title: "Package manager", type: "convention" }, { agent: { session: { id: "s1", header: { cwd: "/tmp/proj-a" } } } });
  assert.match(saved.text, /saved #/);

  const pre = f.handlers.get("agent/pre-step");
  const decision = await pre({ agent: { session: { id: "s1", header: { cwd: "/tmp/proj-a" } } }, messages: [{ source: { kind: "user" }, content: [{ type: "text", text: "which package manager should I use?" }] }], turn: 1, step: 1, signal: {} }, async () => ({ kind: "enter", messages: [] }));
  assert.equal(decision.kind, "enter");
  assert.equal(decision.messages.length, 1);
  assert.equal(decision.messages[0].source.kind, "plugin:dsh-memory-service");
  assert.match(decision.messages[0].content[0].text, /Package manager/);
  f.dispose();
});

test("plugin: captures durable statements on completed turns", () => {
  const root = tmp();
  const f = fakeCtx();
  apply(f.ctx, { root, capture: true });
  const event = f.handlers.get("session/event");
  const session = { id: "s2", header: { cwd: "/tmp/proj-b" } };
  event(session, { type: "turn/start", data: { turn: 1 } });
  event(session, { type: "user/message", data: { source: { kind: "user" }, content: [{ type: "text", text: "以后都用 pnpm，不要再给我 npm 命令" }] } });
  event(session, { type: "turn/end", data: { reason: { kind: "completed" } } });
  const stats = f.tools.get("memory_stats");
  return stats.execute({}, { agent: { session } }).then((result) => {
    assert.match(result.text, /active=1/);
    f.dispose();
  });
});

test("plugin: does not auto-capture meta instructions or explicit tool turns", async () => {
  const root = tmp();
  const f = fakeCtx();
  apply(f.ctx, { root, capture: true });
  const event = f.handlers.get("session/event");
  const session = { id: "s3", header: { cwd: "/tmp/proj-c" } };
  event(session, { type: "turn/start", data: { turn: 1 } });
  event(session, { type: "user/message", data: { source: { kind: "user" }, content: [{ type: "text", text: "请调用 memory_save 保存：本项目统一使用 pnpm" }] } });
  event(session, { type: "tool/call", data: { name: "memory_save" } });
  event(session, { type: "turn/end", data: { reason: { kind: "completed" } } });
  event(session, { type: "turn/start", data: { turn: 2 } });
  event(session, { type: "user/message", data: { source: { kind: "user" }, content: [{ type: "text", text: "请保存：统一使用 pnpm" }] } });
  event(session, { type: "turn/end", data: { reason: { kind: "completed" } } });
  const stats = await f.tools.get("memory_stats").execute({}, { agent: { session } });
  assert.match(stats.text, /active=0/);
  f.dispose();
});

test("plugin: memory_get and CAS memory_update", async () => {
  const root = tmp();
  const f = fakeCtx();
  apply(f.ctx, { root, capture: true });
  const exec = { agent: { session: { id: "s4", header: { cwd: "/tmp/proj-d" } } } };
  const saved = await f.tools.get("memory_save").execute({ text: "Use pnpm", title: "Package manager", type: "convention" }, exec);
  const id = saved.text.match(/#([^ ]+)/)[1];
  const got = await f.tools.get("memory_get").execute({ id }, exec);
  assert.match(got.text, /Use pnpm/);
  const updated = await f.tools.get("memory_update").execute({ id, expectedRevision: 1, text: "Use bun" }, exec);
  assert.match(updated.text, /revision 2/);
  const stale = await f.tools.get("memory_update").execute({ id, expectedRevision: 1, text: "Use npm" }, exec);
  assert.match(stale.text, /update conflict/);
  f.dispose();
});

test("plugin: global scope get/update works from a workspace session", async () => {
  const root = tmp();
  const f = fakeCtx();
  apply(f.ctx, { root, capture: true });
  const exec = { agent: { session: { id: "s5", header: { cwd: "/tmp/proj-e" } } } };
  const saved = await f.tools.get("memory_save").execute({ text: "Always answer in Chinese", scope: "global", title: "Language", type: "user" }, exec);
  const id = saved.text.match(/#([^ ]+)/)[1];
  const got = await f.tools.get("memory_get").execute({ id, scope: "global" }, exec);
  assert.match(got.text, /Chinese/);
  const updated = await f.tools.get("memory_update").execute({ id, expectedRevision: 1, scope: "global", text: "Always answer in Chinese, concise" }, exec);
  assert.match(updated.text, /revision 2/);
  f.dispose();
});

test("plugin: exposes conflicts and resolves them", async () => {
  const root = tmp();
  const f = fakeCtx();
  apply(f.ctx, { root, capture: true });
  const exec = { agent: { session: { id: "s6", header: { cwd: "/tmp/proj-conflict" } } } };
  const a = await f.tools.get("memory_save").execute({ text: "Use pnpm", title: "Package manager", type: "convention", key: "project.package_manager" }, exec);
  const b = await f.tools.get("memory_save").execute({ text: "Use bun", title: "Package manager", type: "convention", key: "project.package_manager" }, exec);
  assert.match(b.text, /conflict:/);
  const conflicts = await f.tools.get("memory_conflicts").execute({}, exec);
  assert.match(conflicts.text, /pnpm/);
  const ids = conflicts.text.match(/#[a-zA-Z0-9-]+/g) || [];
  assert.ok(ids.length >= 2);
  const winner = ids[0].slice(1);
  const loser = ids[1].slice(1);
  const resolved = await f.tools.get("memory_resolve").execute({ winnerId: winner, loserId: loser }, exec);
  assert.match(resolved.text, /resolved:/);
  const after = await f.tools.get("memory_conflicts").execute({}, exec);
  assert.match(after.text, /no memory found/);
  f.dispose();
});
