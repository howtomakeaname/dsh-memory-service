import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

test("client: registers a settings.section for the memory page", () => {
  let spec = null;
  const sandbox = { window: { __ModuleLoader__: { load(value) { spec = value; } } }, document: undefined };
  vm.runInNewContext(fs.readFileSync("client.js", "utf8"), sandbox);
  assert.equal(spec.id, "dsh-memory-service");
  const react = { createElement() {}, useState() {}, useEffect() {}, useCallback(fn) { return fn; } };
  const plugin = spec.factory((name) => name === "react" ? react : {});
  assert.deepEqual(Array.from(plugin.inject), ["slots", "locale"]);
  let registered = null;
  const ctx = {
    effect() {},
    locale: { register() {}, bind() { return (key) => key; } },
    slots: { inject(_slot, fn) { fn(); }, register(meta) { registered = meta; } }
  };
  plugin.apply(ctx);
  assert.equal(registered.id, "memory-service");
});
