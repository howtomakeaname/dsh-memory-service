# 长程记忆 benchmark e2e

把 LongMemEval / LoCoMo / GateMem 风格的 task 跑成真实 DSH 端到端流程，而不是把资料塞进一个 prompt。

## 两种摄取模式

### direct（默认，适合 CI）

把历史会话按 turn 切分，直接写入 DSH 记忆库；然后用真实 DSH 新会话提问。

验证的是：

- 记忆写入格式；
- FTS/作用域检索；
- 动态注入；
- 真实模型能否使用注入内容回答。

不验证模型自动抽取。

### agent（完整链路，慢）

每一段历史 chunk 启动一个真实 DSH 会话，让插件自己判断/保存；然后再新会话提问。

验证完整“会话 → 抽取 → 存储 → 检索 → 注入 → 回答”链路，但成本高、模型行为有波动。

## 任务格式

JSONL，每条：

~~~json
{
  "id": "lme-...",
  "type": "multi-session",
  "ingest_chunks": ["...历史会话..."],
  "question": "...",
  "gold": "...",
  "question_date": "2023-05-30",
  "judge_type": "answer"
}
~~~

GateMem 风格支持：

~~~json
{
  "id": "gatemem-...",
  "expected_action": "answer|refuse|no_memory",
  "judge_spec": { "include": ["..."] },
  "leak_targets": ["..."]
}
~~~

## 运行

~~~bash
node bench/e2e/run.mjs \
  --tasks /tmp/dshmem/benchdata/tasks-lme20.jsonl \
  --limit 3 \
  --mode direct \
  --profile bench-memt-headless \
  --root /tmp/dsh-bench-e2e
~~~

参数：

- tasks：任务 JSONL，或环境变量 DSH_MEMORY_BENCH_TASKS
- limit：只跑前 N 条，默认 1
- type：按 task.type 过滤
- id：只跑指定 task id
- mode：direct 或 agent
- judge：llm 或 none，开放题默认 LLM 语义 judge
- timeout：单会话超时，默认 180s
- root：隔离记忆根目录

输出每个 task 的 JSON 行，最后写 report.json，并返回 task 全通过才 exit 0。

## 已验证

在 6 条 LongMemEval 任务上（single-session-user 3、multi-session 1、temporal-reasoning 1、knowledge-update 1）：

~~~text
tasks 6, passed 6
~~~

每条 direct 摄取 466–509 个 turn note，真实 DSH 新会话查询，LLM judge 判定通过。

## 边界

- 这不是官方 benchmark 分数；样本、摄取方式、judge 都和官方不同。
- direct 模式绕过自动抽取，不测“模型会不会记”。
- agent 模式慢且受模型波动影响，适合发布前小样本。
- 全量 LongMemEval 500 / GateMem 2218 是过夜级，不进 CI。
- 不要把 query session 的原始日志当记忆；harness 使用独立 root 和真实新会话。
