import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MemoryService } from "../src/store.mjs";
import { previewClaudeSources, importClaudeEntries } from "../src/adapters/claude/preview.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "dsh-claude-preview-")); }
function fixture(root, project, file, title, body) {
  const dir = path.join(root, project, "memory");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "MEMORY.md"), "# Memory Index\n\n- [" + title + "](" + file + ") — fixture\n");
  fs.writeFileSync(path.join(dir, file), "---\nname: " + title + "\ndescription: fixture\nmetadata:\n  node_type: memory\n  type: preference\n---\n" + body + "\n");
  return { project, dir };
}

test("claude preview: combines multiple sources and imports selected edits", () => {
  const root = tmp();
  const a = fixture(root, "demo-a", "a.md", "Demo A", "A body");
  const b = fixture(root, "demo-b", "b.md", "Demo B", "B body");
  const service = new MemoryService({ root: tmp(), workspaceId: "demo" }).init();
  const entries = previewClaudeSources(service, [a, b], { scope: "workspace" });
  assert.equal(entries.length, 2);
  assert.equal(entries[0].scope, "workspace");
  const edited = entries.map((entry) => entry.project === "demo-a" ? { ...entry, title: "Edited A", included: true } : { ...entry, included: true });
  const summary = importClaudeEntries(service, edited);
  assert.deepEqual({ imported: summary.imported, updated: summary.updated, conflicts: summary.conflicts }, { imported: 2, updated: 0, conflicts: 0 });
  assert.equal(service.list("workspace:demo").length, 2);
  assert.equal(service.list("workspace:demo").find((note) => note.title === "Edited A").body, "A body");
  service.close();
});
