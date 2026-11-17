import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), "dsh-concurrency-test-")); }
function cli(args, env) {
  return spawnSync(process.execPath, [path.join(process.cwd(), "src/cli.mjs"), ...args], { encoding: "utf8", timeout: 30000, env: { ...process.env, ...env } });
}
function asyncCli(args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), "src/cli.mjs"), ...args], { env: { ...process.env, ...env } });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { out += d; });
    child.on("close", (code) => resolve({ code, out }));
  });
}

test("concurrency: two real CLI processes cannot both win the same revision", async () => {
  const root = tmp();
  const env = { DSH_MEMORY_HOME: root };
  const created = cli(["upsert", "--scope", "workspace:race", "--title", "Mode", "--body", "initial", "--type", "fact"], env);
  assert.equal(created.status, 0);
  const id = JSON.parse(created.stdout).id;
  const base = ["upsert", "--scope", "workspace:race", "--id", id, "--revision", "1", "--title", "Mode", "--type", "fact", "--body"];
  const [a, b] = await Promise.all([
    asyncCli([...base, "writer-a"], env),
    asyncCli([...base, "writer-b"], env)
  ]);
  const codes = [a.code, b.code].sort();
  assert.deepEqual(codes, [0, 2], "exactly one writer should win and one should conflict; got " + JSON.stringify([a, b]));
  const final = cli(["get", id, "--scope", "workspace:race"], env);
  assert.equal(final.status, 0);
  assert.match(JSON.parse(final.stdout).body, /writer-[ab]/);
});
