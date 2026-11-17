#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const profile = args.includes("--profile") ? args[args.indexOf("--profile") + 1] : (process.env.DSH_E2E_PROFILE || "bench-memt-headless");
const dsh = process.env.DSH_CLI || "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh";
const home = os.homedir();
const credentials = fs.readFileSync(path.join(home, ".dsh", ".credentials.yaml"), "utf8");
const key = credentials.match(/DEEPSEEK_API_KEY:\s*(\S+)/)?.[1];
if (!key) throw new Error("DEEPSEEK_API_KEY missing");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const root = "/tmp/dsh-memory-e2e-" + stamp;
const work = "/tmp/dsh-memory-e2e-work";
fs.mkdirSync(root, { recursive: true });
fs.mkdirSync(work, { recursive: true });
const env = { ...process.env, HOME: home, DEEPSEEK_API_KEY: key, DSH_MEMORY_HOME: root };
const results = [];

function run(label, prompt) {
  const started = Date.now();
  const result = spawnSync(dsh, ["--profile", profile, prompt], { cwd: work, env, encoding: "utf8", timeout: 180000 });
  const output = (result.stdout || "") + (result.stderr || "");
  const ok = result.status === 0;
  results.push({ label, ok, ms: Date.now() - started, output });
  console.log("[" + label + "] exit=" + result.status + " " + (Date.now() - started) + "ms");
  console.log(output.slice(-1200));
  return { ok, output };
}

const save = run("save", "请调用 memory_save 工具保存一条长期约定：本项目统一使用 pnpm。只调用一次工具，保存后告诉我 memory id。");
const unrelated = run("unrelated", "用一句话解释 JavaScript 闭包。");
const recall = run("recall", "本项目应该用哪个包管理器？只回答一个词。");
const correct = run("correct", "请调用 memory_search 找到包管理器那条记忆，再调用 memory_update 把它改成：本项目统一使用 bun。必须带当前 revision。");
const recall2 = run("recall2", "本项目应该用哪个包管理器？只回答一个词。");

const checks = [
  ["save succeeded", save.ok && /memory|保存|saved|id/i.test(save.output)],
  ["unrelated succeeded", unrelated.ok],
  ["first recall pnpm", recall.ok && /pnpm/i.test(recall.output)],
  ["correction attempted", correct.ok && /bun|update|revision/i.test(correct.output)],
  ["second recall bun", recall2.ok && /bun/i.test(recall2.output)]
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log((ok ? "PASS " : "FAIL ") + name);
  if (!ok) failed += 1;
}
console.log("ROOT " + root);
console.log("RESULT " + (failed === 0 ? "PASS" : "FAIL"));
process.exit(failed === 0 ? 0 : 1);
