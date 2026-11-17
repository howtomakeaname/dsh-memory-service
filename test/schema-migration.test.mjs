import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MemoryService } from "../src/store.mjs";
import { SCHEMA_VERSION, ensureSchema, schemaPath } from "../src/core/schema.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "dsh-schema-test-")); }

test("schema: v1 notes migrate to v2 and gain description_auto", () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, "global", "notes"), { recursive: true });
  fs.mkdirSync(path.join(root, ".index"), { recursive: true });
  fs.writeFileSync(path.join(root, ".index", "schema.json"), JSON.stringify({ version: 1 }));
  fs.writeFileSync(path.join(root, "global", "notes", "legacy.md"), "---\nname: Legacy\nid: legacy\nscope: global\n---\nlegacy body\n");
  const service = new MemoryService({ root }).init();
  const note = service.get("legacy", { scope: "global" });
  assert.equal(note.description, "legacy body");
  assert.equal(note.metadata.description_auto, "true");
  assert.equal(JSON.parse(fs.readFileSync(schemaPath(root), "utf8")).version, SCHEMA_VERSION);
  service.close();
});

test("schema: future versions are rejected", () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, ".index"), { recursive: true });
  fs.writeFileSync(path.join(root, ".index", "schema.json"), JSON.stringify({ version: 99 }));
  assert.throws(() => ensureSchema(root), /newer than supported/);
});

test("schema: fresh root starts at the current version", () => {
  const root = tmp();
  const result = ensureSchema(root);
  assert.equal(result.version, SCHEMA_VERSION);
  assert.equal(result.created, true);
});
