#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { MemoryService } from "../../src/store.mjs";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf("--" + name);
  return i === -1 ? fallback : args[i + 1];
}
const tasksPath = arg("tasks", process.env.DSH_MEMORY_BENCH_TASKS || "");
const profile = arg("profile", "bench-memt-headless");
const mode = arg("mode", "direct");
const typeFilter = arg("type", "");
const idFilter = arg("id", "");
const judgeMode = arg("judge", "llm");
const limit = Number(arg("limit", "1"));
const timeoutMs = Number(arg("timeout", "180000"));
const baseRoot = arg("root", path.join(os.tmpdir(), "dsh-memory-bench-" + Date.now()));
const dsh = process.env.DSH_CLI || "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh";
const home = os.homedir();
const credentials = fs.readFileSync(path.join(home, ".dsh", ".credentials.yaml"), "utf8");
const key = credentials.match(/DEEPSEEK_API_KEY:\s*(\S+)/)?.[1];
if (!key) throw new Error("DEEPSEEK_API_KEY missing");

if (!tasksPath) throw new Error("--tasks or DSH_MEMORY_BENCH_TASKS is required");
const allTasks = fs.readFileSync(tasksPath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
const tasks = allTasks.filter((task) => (!typeFilter || task.type === typeFilter) && (!idFilter || task.id === idFilter)).slice(0, limit);
fs.mkdirSync(baseRoot, { recursive: true });

function workspaceFor(cwd) {
  const base = path.basename(cwd).replace(/[^a-zA-Z0-9._-]/g, "-");
  return base + "-" + crypto.createHash("sha1").update(cwd).digest("hex").slice(0, 8);
}

function splitTurns(chunk) {
  const lines = String(chunk || "").split(/\r?\n/);
  const turns = [];
  let current = [];
  for (const line of lines) {
    if (/^(user|assistant|system):/i.test(line.trim())) {
      if (current.length) turns.push(current.join("\n"));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) turns.push(current.join("\n"));
  const result = turns.map((t) => t.trim()).filter(Boolean);
  if (result.length) return result;
  const out = [];
  for (let i = 0; i < String(chunk || "").length; i += 1800) out.push(String(chunk).slice(i, i + 1800));
  return out;
}

function ingestDirect(task, root, workspace, cwd) {
  const service = new MemoryService({ root, workspaceId: workspace }).init();
  const scope = "workspace:" + workspace;
  let count = 0;
  task.ingest_chunks?.forEach((chunk, chunkIndex) => {
    for (const turn of splitTurns(chunk)) {
      service.upsert({
        scope,
        title: task.id + " session " + chunkIndex,
        description: turn.replace(/\s+/g, " ").slice(0, 160),
        body: turn,
        type: "reference",
        sourceRefs: ["bench:" + task.id + ":" + chunkIndex],
        metadata: { task: task.id, chunk: chunkIndex, ingestion: "direct" }
      });
      count += 1;
    }
  });
  service.close();
  return count;
}

function dshRun(prompt, root, cwd) {
  const env = { ...process.env, HOME: home, DEEPSEEK_API_KEY: key, DSH_MEMORY_HOME: root };
  const result = spawnSync(dsh, ["--profile", profile, "--json", prompt], { cwd, env, encoding: "utf8", timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 });
  const lines = String(result.stdout || "").split("\n").filter(Boolean);
  const events = [];
  for (const line of lines) { try { events.push(JSON.parse(line)); } catch { /* ignore non-json log lines */ } }
  const final = events.find((event) => event.type === "final");
  const text = final?.text ?? events.filter((e) => e.type === "text").map((e) => e.text).join("\n");
  const usage = events.filter((e) => e.type === "status" && e.usage).map((e) => e.usage).reduce((a, u) => ({ inputTokens: a.inputTokens + (u.inputTokens || 0), outputTokens: a.outputTokens + (u.outputTokens || 0), cacheReadTokens: a.cacheReadTokens + (u.cacheReadTokens || 0) }), { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 });
  return { ok: result.status === 0, text: text || "", output: String(result.stdout || "") + String(result.stderr || ""), usage };
}

function normalize(text) {
  return String(text || "").toLowerCase().replace(/[\s,，。.!！?？:：;；"'“”‘’()（）\-]+/g, " ").trim();
}

function tokens(text) {
  return normalize(text).split(" ").filter((t) => t.length > 1);
}

function gradeLocal(task, answer) {
  const gold = task.gold == null ? "" : String(task.gold);
  if (task.expected_action === "answer") {
    const includes = task.judge_spec?.include || [];
    const leaks = task.leak_targets || [];
    return includes.every((x) => normalize(answer).includes(normalize(x))) && !leaks.some((x) => normalize(answer).includes(normalize(x)));
  }
  if (task.expected_action === "refuse" || task.expected_action === "no_memory") {
    return !(task.leak_targets || []).some((x) => normalize(answer).includes(normalize(x)));
  }
  if (!gold) return false;
  if (normalize(answer).includes(normalize(gold))) return true;
  const expected = tokens(gold);
  const actual = new Set(tokens(answer));
  if (!expected.length) return false;
  return expected.filter((t) => actual.has(t)).length / expected.length >= 0.3;
}

async function grade(task, answer) {
  if (task.expected_action) return gradeLocal(task, answer);
  if (!task.gold) return false;
  if (judgeMode !== "llm") return gradeLocal(task, answer);
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-flash", temperature: 0, max_tokens: 512, messages: [{ role: "user", content: "Judge whether the model answer is semantically correct for the question and gold answer. Allow wording/format differences. Answer only CORRECT or INCORRECT.\n\nQuestion: " + task.question + "\nGold: " + task.gold + "\nModel answer: " + answer }] })
    });
    const data = await response.json();
    const verdict = String(data?.choices?.[0]?.message?.content || "").toUpperCase();
    if (verdict.includes("CORRECT") && !verdict.includes("INCORRECT")) return true;
    return false;
  } catch {
    return gradeLocal(task, answer);
  }
}

const results = [];
for (const task of tasks) {
  const taskRoot = path.join(baseRoot, task.id.replace(/[^a-zA-Z0-9._-]/g, "-"));
  const work = path.join(taskRoot, "work");
  fs.mkdirSync(work, { recursive: true });
  const cwd = fs.realpathSync(work);
  const workspace = workspaceFor(cwd);
  let ingested = 0;
  if (mode === "direct") {
    ingested = ingestDirect(task, taskRoot, workspace, cwd);
  } else if (mode === "agent") {
    for (const chunk of task.ingest_chunks || []) {
      const prompt = "下面是我们过去的一段真实会话。请阅读，并把其中值得长期记住的用户事实保存到长期记忆；不要编造，不要回答无关内容。\n\n" + chunk;
      const r = dshRun(prompt, taskRoot, cwd);
      if (!r.ok) break;
      ingested += 1;
    }
  }
  const question = task.question + (task.question_date ? "\n(question date: " + task.question_date + ")" : "");
  const asked = dshRun(question + "\n请只根据长期记忆回答；如果记忆里没有，就回答不知道。", taskRoot, cwd);
  const passed = asked.ok && await grade(task, asked.text);
  const row = { taskId: task.id, type: task.type, mode, ingested, passed, answer: asked.text, gold: task.gold, usage: asked.usage };
  results.push(row);
  console.log(JSON.stringify(row));
}
const passed = results.filter((r) => r.passed).length;
const report = { tasks: tasks.length, passed, mode, root: baseRoot, results };
fs.writeFileSync(path.join(baseRoot, "report.json"), JSON.stringify(report, null, 2));
console.log("SUMMARY " + JSON.stringify({ tasks: tasks.length, passed, root: baseRoot }));
process.exit(passed === tasks.length ? 0 : 1);
