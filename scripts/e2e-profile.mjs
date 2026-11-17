#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { MemoryService } from "../src/store.mjs";

const profile = process.argv.includes("--profile") ? process.argv[process.argv.indexOf("--profile") + 1] : (process.env.DSH_E2E_PROFILE || "bench-memt-headless");
const dsh = process.env.DSH_CLI || "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh";
const home = os.homedir();
const key = fs.readFileSync(path.join(home, ".dsh", ".credentials.yaml"), "utf8").match(/DEEPSEEK_API_KEY:\s*(\S+)/)?.[1];
if (!key) throw new Error("DEEPSEEK_API_KEY missing");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const root = "/tmp/dsh-profile-e2e-" + stamp;
const work = "/tmp/dsh-profile-e2e-work";
fs.mkdirSync(work, { recursive: true });
const service = new MemoryService({ root, workspaceId: "profile-e2e" }).init();
const scope = "workspace:profile-e2e";
for (const [title, body] of [
  ["Comedy taste", "我喜欢有故事性的单口喜剧专场，尤其是讲个人经历的。"],
  ["Platform", "我平时主要在 Netflix 上看喜剧。"],
  ["Evening mood", "周末晚上我喜欢轻松、不用动脑的内容。"],
  ["Dislike", "我不喜欢恐怖片和血腥内容。"]
]) service.upsert({ scope, title, description: title, body, type: "preference" });
service.close();

const result = spawnSync(dsh, ["--profile", profile, "--json", "根据你对我的了解，推荐一个今晚的观看方向，只回答方向。"], {
  cwd: work,
  env: { ...process.env, HOME: home, DEEPSEEK_API_KEY: key, DSH_MEMORY_HOME: root },
  encoding: "utf8",
  timeout: 120000,
  maxBuffer: 16 * 1024 * 1024
});
const events = String(result.stdout || "").split("\n").filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
const final = events.find((event) => event.type === "final");
const text = final?.text ?? events.filter((event) => event.type === "text").map((event) => event.text).join("\n");
const checks = [
  ["session completed", result.status === 0],
  ["profile answer references comedy", /单口|喜剧|stand-?up|comedy/i.test(text)],
  ["profile answer avoids horror", !/恐怖片推荐|horror recommendation/i.test(text)]
];
let failed = 0;
for (const [name, ok] of checks) { console.log((ok ? "PASS " : "FAIL ") + name); if (!ok) failed += 1; }
console.log("ROOT " + root);
console.log("ANSWER " + text.replace(/\s+/g, " ").slice(0, 300));
console.log("RESULT " + (failed === 0 ? "PASS" : "FAIL"));
process.exit(failed === 0 ? 0 : 1);
