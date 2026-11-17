import test from "node:test";
import assert from "node:assert/strict";
import { renderMemoryIndex, INDEX_MAX_LINES, INDEX_MAX_BYTES } from "../src/core/index-file.mjs";

function notes(n) {
  return Array.from({ length: n }, (_, i) => ({ id: "n" + i, title: "Memory " + i, description: "short description " + i }));
}

test("index: caps lines and adds a warning", () => {
  const text = renderMemoryIndex(notes(300), { maxLines: 30, maxBytes: 100000 });
  const lines = text.trimEnd().split("\n");
  assert.ok(lines.length <= 30);
  assert.match(text, /WARNING: \d+ more memories omitted/);
});

test("index: caps bytes", () => {
  const text = renderMemoryIndex(notes(300), { maxLines: 200, maxBytes: 2500 });
  assert.ok(Buffer.byteLength(text) <= 2500 + 200);
  assert.match(text, /WARNING: \d+ more memories omitted/);
});

test("index: defaults are the Claude Code-compatible limits", () => {
  assert.equal(INDEX_MAX_LINES, 200);
  assert.equal(INDEX_MAX_BYTES, 25000);
});
