import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createQueryExpander } from "../src/retrieval/query-expander.mjs";
import { MemoryService } from "../src/store.mjs";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "dsh-query-test-")); }

test("query expander: keeps original and adds model queries", async () => {
  const llm = { available: true, async complete() { return { ok: true, text: '["theme parks", "thrill rides", "nighttime shows"]' }; } };
  const expander = createQueryExpander({ llm });
  const queries = await expander.expand("what should I do this weekend?");
  assert.equal(queries[0], "what should I do this weekend?");
  assert.deepEqual(queries.slice(1), ["theme parks", "thrill rides", "nighttime shows"]);
});

test("query expander: bad model output falls back to original", async () => {
  const llm = { available: true, async complete() { return { ok: true, text: "not json" }; } };
  const expander = createQueryExpander({ llm });
  assert.deepEqual(await expander.expand("hello"), ["hello"]);
});

test("context: extra queries expand retrieval without regex", () => {
  const root = tmp();
  const service = new MemoryService({ root, workspaceId: "query-ctx" }).init();
  service.upsert({ scope: "workspace:query-ctx", title: "Comedy taste", body: "I love stand-up comedy specials with storytelling.", type: "preference" });
  const context = service.context({ scope: "workspace:query-ctx", query: "what should I watch tonight?", extraQueries: ["stand-up comedy"] });
  assert.match(context.text, /Comedy taste/);
  service.close();
});
