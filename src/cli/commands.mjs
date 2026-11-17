import path from "node:path";
import os from "node:os";
import { MemoryService, MemoryConflictError } from "../store.mjs";
import { discoverClaudeMemories, importClaude, exportClaude } from "../adapters/claude.mjs";
import { parseArgs } from "./args.mjs";
import { CaptureQueue } from "../capture/queue.mjs";
import { print } from "./output.mjs";

export function run(argv) {
  const args = parseArgs(argv);
  const command = args._[0];
  const root = args.root || process.env.DSH_MEMORY_HOME || path.join(os.homedir(), ".dsh", "memory-service");
  const workspace = args.workspace || process.env.DSH_WORKSPACE_ID || "default";
  const service = new MemoryService({ root, workspaceId: workspace }).init();
  try {
    if (command === "init") { print({ root, workspace, initialized: true }); return; }
    if (command === "status" || command === "stats") {
      const notes = service.list("global", { allScopes: true, includeForgotten: true });
      const queue = new CaptureQueue(service.index.db);
      print({ root, workspace, notes: notes.length, active: notes.filter((n) => n.status === "active").length, workspaces: service.listWorkspaces(), capture: queue.stats() });
      return;
    }
    if (command === "list") { print(service.list(args.scope || service.defaultScope(), { allScopes: !!args["all-scopes"] })); return; }
    if (command === "get") {
      const note = service.get(args._[1], { scope: args.scope });
      if (!note) throw new Error("Not found: " + args._[1]);
      print(note);
      return;
    }
    if (command === "search") { print(service.search(args._.slice(1).join(" "), { scope: args.scope, limit: Number(args.limit || 10) })); return; }
    if (command === "context") { print(service.context({ scope: args.scope, query: args.query || "", budgetTokens: Number(args.budget || 1200) })); return; }
    if (command === "upsert") {
      const note = service.upsert({ id: args.id, scope: args.scope, title: args.title, description: args.description || "", body: args.body || "", type: args.type || "project", expectedRevision: args.revision != null ? Number(args.revision) : undefined, supersedes: args.supersedes, sourceRefs: args.source ? [args.source] : [] });
      print(note);
      return;
    }
    if (command === "forget") { print(service.forget(args._[1], { scope: args.scope, hard: !!args.hard })); return; }
    if (command === "rebuild") { print({ rebuilt: service.rebuild() }); return; }
    if (command === "flush") { const queue = new CaptureQueue(service.index.db); print(queue.drain(service)); return; }
    if (command === "doctor") {
      const notes = service.list("global", { allScopes: true, includeForgotten: true });
      const rows = service.index.db.prepare("SELECT id, hash FROM notes").all();
      const byId = new Map(notes.map((n) => [n.id, n]));
      const missingFiles = rows.filter((row) => !byId.has(row.id)).map((row) => row.id);
      const stale = notes.filter((note) => { const row = rows.find((r) => r.id === note.id); return row && note.hash && row.hash !== note.hash; }).map((n) => n.id);
      const queue = new CaptureQueue(service.index.db);
      print({ root, workspace, notes: notes.length, index: rows.length, missingFiles, stale, capture: queue.stats() });
      return;
    }
    if (command === "discover-claude") { print(discoverClaudeMemories(args.home)); return; }
    if (command === "import-claude") {
      print(importClaude(service, { source: args.source, project: args.project || "claude", scope: args.scope || "global", dryRun: !!args["dry-run"], force: !!args.force }));
      return;
    }
    if (command === "export-claude") {
      print(exportClaude(service, { target: args.target, scope: args.scope || service.defaultScope(), force: !!args.force }));
      return;
    }
    throw new Error("Unknown command: " + (command || "(none)"));
  } catch (error) {
    if (error instanceof MemoryConflictError) {
      print({ error: error.message, latest: error.latest });
      process.exitCode = 2;
      return;
    }
    throw error;
  } finally {
    service.close();
  }
}
