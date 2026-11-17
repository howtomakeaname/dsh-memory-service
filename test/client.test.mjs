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

test("client: registers memory tool views", () => {
  let spec = null;
  const sandbox = { window: { __ModuleLoader__: { load(value) { spec = value; } } }, document: undefined };
  vm.runInNewContext(fs.readFileSync("client.js", "utf8"), sandbox);
  const react = { createElement() {}, useState() {}, useEffect() {}, useCallback(fn) { return fn; } };
  const plugin = spec.factory((name) => name === "react" ? react : {});
  const registered = [];
  const ctx = {
    effect() {}, locale: { register() {}, bind() { return (key) => key; } },
    slots: {
      inject(slot, fn) {
        const value = fn();
        if (value && typeof value[Symbol.iterator] === "function" && typeof value.next === "function") {
          for (const item of value) void item;
        }
      },
      register(meta) { registered.push(meta); return () => {}; }
    }
  };
  plugin.apply(ctx);
  const keys = registered.filter((item) => item.name === "tool.call.toolview").map((item) => item.key);
  assert.deepEqual(Array.from(keys), ["memory_search", "memory_save", "memory_get", "memory_update", "memory_forget", "memory_flush", "memory_conflicts", "memory_resolve", "memory_stats"]);
});
