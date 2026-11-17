# 验证策略

单次冒烟不够。记忆是跨会话、跨进程、带并发和持久状态的功能，验证分三层。

## 1. 单元测试

~~~bash
node --test
~~~

覆盖：

- Markdown 序列化/反序列化；
- upsert、revision CAS、supersede、软/硬遗忘；
- FTS + 文件回退、外部 Markdown 编辑后的索引修复；
- 两个 MemoryService 并发更新只允许一个成功；
- 捕获队列 enqueue/drain/去重/stale running 恢复；
- 模型抽取的 evidence 校验、低置信度拒绝；
- Claude 导入幂等/更新/导出；
- 插件工具、注入、自动捕获、全局 scope。

当前 27 个用例。

## 2. 场景化集成测试

~~~bash
node --test test/scenarios.test.mjs
~~~

模拟真实使用，而不是单个函数：

1. 会话 A 保存偏好 → 插件重启 → 会话 B 自动召回。
2. 会话 A 保存 pnpm → 更新为 bun → 新会话只看到 bun。
3. 捕获任务未 drain → 服务关闭 → 重开 → 异步抽取落盘。
4. Claude memory 导入 → 新会话能检索到。
5. 硬删除 → 新会话不再召回。

这些测试不调用真实模型，结果确定，适合 CI。

## 3. 真实 DSH 多会话 e2e

~~~bash
node scripts/e2e-real.mjs --profile bench-memt-headless
~~~

使用真实 profile、真实模型、真实宿主，每个会话是独立进程：

1. 保存“本项目统一使用 pnpm”；
2. 一个无关会话（闭包解释）；
3. 新会话问包管理器 → pnpm；
4. 纠正为 bun；
5. 再开新会话问 → bun。

实际运行结果：5 个会话全部 exit 0，检查项 5/5 PASS，root 为临时目录，不污染真实记忆。

## 4. 长程记忆 benchmark e2e

~~~bash
node bench/e2e/run.mjs --tasks /tmp/dshmem/benchdata/tasks-lme20.jsonl --limit 3 --mode direct
~~~

当前结果：6 条 LongMemEval（single-session-user 3、multi-session 1、temporal-reasoning 1、knowledge-update 1），6/6 通过；每条 direct 摄取 466–509 个 turn note，真实 DSH 新会话查询，LLM judge。

direct 模式验证检索/注入，不验证自动抽取；agent 模式才走完整抽取链路。示例 fixture 的 agent 模式 1/1 通过，但该次模型选择调用 memory_save。

另外单独跑过一次纯模型抽取：会话明确说“不要调用任何工具”，模型没有调用 memory_save，插件仍写入一条 `capture: llm`、`confidence: 0.95`、evidence 为“以后这个项目统一使用 pnpm”的 convention note。说明正则不是唯一入口，模型抽取链路可用。详见 [../bench/e2e/README.md](../bench/e2e/README.md)。

## 局限

- 真实 e2e 依赖模型行为，提示词变化可能导致某次失败；它是发布前 gate，不是单元测试替代。
- 场景测试使用 fake host，覆盖数据/生命周期，不覆盖 DSH UI 和真实网络。
- 还没做多进程同时更新同一 note 的真实 e2e（单元测试已覆盖 CAS；跨进程锁需要再补压力测试）。
- 模型抽取路径目前由单测覆盖；真实 e2e 主要验证显式工具和注入链路。
