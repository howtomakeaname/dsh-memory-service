import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { apply } from "../src/plugin.mjs";
import { MemoryService } from "../src/store.mjs";
import { CaptureQueue } from "../src/capture/queue.mjs";
import { importClaude } from "../src/adapters/claude.mjs";
import { createHash } from "node:crypto";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "dsh-scenario-")); }

function host() {
  const handlers = new Map();
  const tools = new Map();
  const disposers = [];
  return {
    handlers, tools,
    ctx: {
      on(event, handler) { handlers.set(event, handler); },
      tools: { register(tool) { tools.set(tool.name, tool); return () => tools.delete(tool.name); } },
      effect(fn) { const d = fn(); if (typeof d === "function") disposers.push(d); },
      logger: { info() {}, warn() {}, debug() {} }
    },
    dispose() { for (const d of disposers) d(); }
  };
}

function session(id, cwd) { return { id, header: { cwd } }; }

async function pre(host, sessionObj, query) {
  return host.handlers.get("agent/pre-step")(
    { agent: { session: sessionObj }, messages: [{ source: { kind: "user" }, content: [{ type: "text", text: query }] }], turn: 1, step: 1, signal: {} },
    async () => ({ kind: "enter", messages: [] })
  );
}

test("scenario: cross-session recall survives plugin restart", async () => {
  const root = tmp();
  const cwd = "/tmp/scenario-project-a";
  const h1 = host();
  apply(h1.ctx, { root, capture: true });
  const saved = await h1.tools.get("memory_save").execute({ text: "The project uses pnpm", title: "Package manager", type: "convention" }, { agent: { session: session("a1", cwd) } });
  assert.match(saved.text, /saved/);
  h1.dispose();

  const h2 = host();
  apply(h2.ctx, { root, capture: true });
  const decision = await pre(h2, session("a2", cwd), "which package manager?");
  assert.equal(decision.messages.length, 1);
  assert.match(decision.messages[0].content[0].text, /Package manager/);
  h2.dispose();
});

test("scenario: correction supersedes old value across sessions", async () => {
  const root = tmp();
  const cwd = "/tmp/scenario-project-b";
  const h1 = host();
  apply(h1.ctx, { root, capture: true });
  const saved = await h1.tools.get("memory_save").execute({ text: "The project uses pnpm", title: "Package manager", type: "convention" }, { agent: { session: session("b1", cwd) } });
  const id = saved.text.match(/#([^ ]+)/)[1];
  const updated = await h1.tools.get("memory_update").execute({ id, expectedRevision: 1, text: "The project uses bun" }, { agent: { session: session("b1", cwd) } });
  assert.match(updated.text, /revision 2/);
  h1.dispose();

  const h2 = host();
  apply(h2.ctx, { root, capture: true });
  const decision = await pre(h2, session("b2", cwd), "which package manager?");
  assert.match(decision.messages[0].content[0].text, /bun/);
  assert.doesNotMatch(decision.messages[0].content[0].text, /pnpm/);
  h2.dispose();
});

test("scenario: queued extraction survives restart and drains later", async () => {
  const root = tmp();
  let service = new MemoryService({ root, workspaceId: "queue-restart" }).init();
  let queue = new CaptureQueue(service.index.db);
  queue.enqueue({ scope: "workspace:queue-restart", sessionId: "q1", turn: 2, kind: "turn", text: "以后都用 pnpm", payload: JSON.stringify({ scope: "workspace:queue-restart", messages: [{ role: "user", text: "以后都用 pnpm" }] }) });
  service.close();

  service = new MemoryService({ root, workspaceId: "queue-restart" }).init();
  queue = new CaptureQueue(service.index.db);
  const extractor = { async extract() { return { ok: true, candidates: [{ text: "Use pnpm", title: "Package manager", type: "convention", confidence: 0.9, evidence: "以后都用 pnpm" }] }; } };
  const result = await queue.drainAsync(service, { extractor });
  assert.equal(result.processed, 1);
  assert.equal(service.search("pnpm", { scope: "workspace:queue-restart" }).length, 1);
  service.close();
});

test("scenario: claude import is searchable from a fresh session", async () => {
  const root = tmp();
  const source = tmp();
  fs.writeFileSync(path.join(source, "MEMORY.md"), "# Memory\n\n- [Build](build.md) — use pnpm build\n");
  fs.writeFileSync(path.join(source, "build.md"), "---\nname: Build\ndescription: build command\nmetadata:\n  node_type: memory\n  type: project\n---\nRun pnpm build before commit.\n");
  const cwd = "/tmp/import-a";
  const workspace = "import-a-" + createHash("sha1").update(cwd).digest("hex").slice(0, 8);
  const service = new MemoryService({ root, workspaceId: workspace }).init();
  const imported = importClaude(service, { source, project: "demo", scope: "workspace:" + workspace });
  assert.equal(imported.imported, 1);
  service.close();

  const h = host();
  apply(h.ctx, { root, capture: true });
  const decision = await pre(h, session("i1", cwd), "what build command?");
  assert.match(decision.messages[0].content[0].text, /pnpm build/);
  h.dispose();
});

test("scenario: hard forget is not recalled by a new session", async () => {
  const root = tmp();
  const cwd = "/tmp/scenario-project-c";
  const h1 = host();
  apply(h1.ctx, { root, capture: true });
  const saved = await h1.tools.get("memory_save").execute({ text: "Secret deployment target is prod-x", title: "Deploy target", type: "fact" }, { agent: { session: session("c1", cwd) } });
  const id = saved.text.match(/#([^ ]+)/)[1];
  await h1.tools.get("memory_forget").execute({ id, hard: true }, { agent: { session: session("c1", cwd) } });
  h1.dispose();

  const h2 = host();
  apply(h2.ctx, { root, capture: true });
  const decision = await pre(h2, session("c2", cwd), "what is the deploy target?");
  assert.equal(decision.messages.length, 0);
  h2.dispose();
});
