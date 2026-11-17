#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const profile = process.argv.includes("--profile") ? process.argv[process.argv.indexOf("--profile") + 1] : (process.env.DSH_E2E_PROFILE || "bench-memt-headless");
const dsh = process.env.DSH_CLI || "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh";
const home = os.homedir();
const key = fs.readFileSync(path.join(home, ".dsh", ".credentials.yaml"), "utf8").match(/DEEPSEEK_API_KEY:\s*(\S+)/)?.[1];
if (!key) throw new Error("DEEPSEEK_API_KEY missing");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const root = "/tmp/dsh-pure-extract-" + stamp;
const work = "/tmp/dsh-pure-extract-work";
fs.mkdirSync(root, { recursive: true });
fs.mkdirSync(work, { recursive: true });
const env = { ...process.env, HOME: home, DEEPSEEK_API_KEY: key, DSH_MEMORY_HOME: root };

function run(prompt) {
  const result = spawnSync(dsh, ["--profile", profile, "--json", prompt], { cwd: work, env, encoding: "utf8", timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  const events = String(result.stdout || "").split("\n").filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
  const final = events.find((event) => event.type === "final");
  const text = final?.text ?? events.filter((event) => event.type === "text").map((event) => event.text).join("\n");
  return { ok: result.status === 0, text, raw: String(result.stdout || "") + String(result.stderr || "") };
}
function notes(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...notes(full));
    else if (entry.name.endsWith(".md") && entry.name !== "MEMORY.md") out.push(full);
  }
  return out;
}

const first = run("顺便说一句，以后这个项目统一使用 pnpm。不要调用任何工具，只确认收到。");
const flush = run("请调用 memory_flush 工具，只报告 processed 和 pending 两个数字。");
const allNotes = notes(root);
const bodies = allNotes.map((file) => fs.readFileSync(file, "utf8"));
const llmNote = bodies.find((text) => /capture:\s*llm/.test(text) && /pnpm/i.test(text));
const toolNote = bodies.find((text) => /capture:\s*tool/.test(text));
const query = run("这个项目应该用哪个包管理器？只回答一个词。");
const checks = [
  ["first turn completed", first.ok],
  ["flush completed", flush.ok],
  ["model extraction wrote a note", Boolean(llmNote)],
  ["no explicit memory_save note", !toolNote],
  ["recall answered pnpm", query.ok && /\bpnpm\b/i.test(query.text)]
];
let failed = 0;
for (const [name, ok] of checks) { console.log((ok ? "PASS " : "FAIL ") + name); if (!ok) failed += 1; }
console.log("ROOT " + root);
console.log("RESULT " + (failed === 0 ? "PASS" : "FAIL"));
process.exit(failed === 0 ? 0 : 1);
