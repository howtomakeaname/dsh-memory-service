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
const root = "/tmp/dsh-pref-extract-e2e-" + stamp;
const work = "/tmp/dsh-pref-extract-e2e-work";
fs.mkdirSync(work, { recursive: true });
const env = { ...process.env, HOME: home, DEEPSEEK_API_KEY: key, DSH_MEMORY_HOME: root };
function run(prompt) {
  const result = spawnSync(dsh, ["--profile", profile, "--json", prompt], { cwd: work, env, encoding: "utf8", timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  const events = String(result.stdout || "").split("\n").filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
  const final = events.find((event) => event.type === "final");
  return { ok: result.status === 0, text: final?.text ?? events.filter((event) => event.type === "text").map((event) => event.text).join("\n") };
}
const first = run("顺便说几件我的偏好：我喜欢有故事性、讲个人经历的单口喜剧；我主要在 Netflix 上看；周末晚上喜欢轻松不用动脑的内容；我不喜欢恐怖片。不要调用任何工具，只确认收到。");
const flush = run("请调用 memory_flush 工具，只报告 processed 和 pending。");
const ask = run("根据你对我的了解，推荐一个今晚的观看方向，只回答方向。");
const checks = [
  ["preference turn completed", first.ok],
  ["flush completed", flush.ok],
  ["recommendation uses extracted preference", ask.ok && /单口|喜剧|stand-?up|comedy/i.test(ask.text)],
  ["recommendation avoids horror", !/恐怖片推荐|horror recommendation/i.test(ask.text)]
];
let failed = 0;
for (const [name, ok] of checks) { console.log((ok ? "PASS " : "FAIL ") + name); if (!ok) failed += 1; }
console.log("ROOT " + root);
console.log("ANSWER " + ask.text.replace(/\s+/g, " ").slice(0, 300));
console.log("RESULT " + (failed === 0 ? "PASS" : "FAIL"));
process.exit(failed === 0 ? 0 : 1);
