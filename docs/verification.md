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

当前 49 个用例，GitHub Actions 跑测试/语法检查/打包 dry-run。

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

当前结果：完整 24 条 LongMemEval（6 类各 4 条，`--min-chars 200000`），21/24 通过；每条 direct 摄取 466–509 个 turn note、约 46–49 万字符，真实 DSH 新会话查询，LLM judge。失败集中在 single-session-preference（1/4），其余 5 类全过。

direct 模式验证检索/注入，不验证自动抽取；agent 模式才走完整抽取链路。示例 fixture 的 agent 模式 1/1 通过，但该次模型选择调用 memory_save。

另外单独跑过一次纯模型抽取：会话明确说“不要调用任何工具”，模型没有调用 memory_save，插件仍写入一条 `capture: llm`、`confidence: 0.95`、evidence 为“以后这个项目统一使用 pnpm”的 convention note。说明正则不是唯一入口，模型抽取链路可用。详见 [../bench/e2e/README.md](../bench/e2e/README.md)。

## 局限

- 真实 e2e 依赖模型行为，提示词变化可能导致某次失败；它是发布前 gate，不是单元测试替代。
- 场景测试使用 fake host，覆盖数据/生命周期，不覆盖 DSH UI 和真实网络。
- 还没做多进程同时更新同一 note 的真实 e2e（单元测试已覆盖 CAS；跨进程锁需要再补压力测试）。
- 模型抽取路径目前由单测覆盖；真实 e2e 主要验证显式工具和注入链路。

## 5. 打包与真实并发

- `npm pack` 产物安装到空项目，`dsh-memory-service/core` 写入/检索通过；
- 两个真实 CLI 进程用同一 revision 更新同一 note，结果一个成功、一个 exit 2 conflict。

## 6. 纯模型抽取 e2e

~~~bash
node scripts/e2e-pure-extraction.mjs --profile bench-memt-headless
~~~

结果 5/5 PASS：第一会话禁止工具调用，第二会话 flush 队列，检查到 `capture: llm` note，第三会话回答 pnpm，且没有 `capture: tool` 的显式保存笔记。

## 7. synthesize profile e2e

~~~bash
node scripts/e2e-profile.mjs --profile bench-memt-headless
~~~

结果 3/3 PASS：4 条 typed preference 记忆经 profile 合成后，回答“Netflix 上有个人经历叙事的轻松单口喜剧专场”，没有推荐恐怖片。

## 8. 抽取到偏好推荐 e2e

~~~bash
node scripts/e2e-preference-extraction.mjs --profile bench-memt-headless
~~~

结果 4/4 PASS：第一会话只陈述偏好、禁止工具调用；第二会话 flush；第三会话回答“叙事型单口喜剧专场”，且没有推荐恐怖片。这条链路验证的是抽取 → typed preference → synthesize profile → 回答。

## 9. agent-mode preference

LongMemEval `single-session-preference-0`，agent 模式 10 chunks / 480,675 chars：**1/1 pass**。

这条路径验证的是：真实会话 chunk 抽取 → typed preference → synthesize profile → 回答；不是 direct 模式的人工平铺。

## 10. schema 迁移

v1 root 初始化时自动迁移到 v2：legacy note 补 `description_auto`，索引重建；未来版本会被拒绝。测试 3/3。

## 11. 真实 DSH Web UI

在 `bench-memt-web` profile、DSH web app 0.2.2-rc.3 中验证：

- Settings → 记忆真实可见；
- 列表、scope、详情 drill-down、复制 ID、编辑/遗忘；
- 新建会话调用 `memory_save`，工具卡片和展开的 Arguments/Result 可见；
- 冲突数据可筛选、打开详情并通过“保留此版本”解决；
- Settings 表单新增记忆成功落盘；
- 类型/scope 使用 DSH `Menu` 下拉，工具栏筛选组/操作组分开，不再堆叠。

截图见 [docs/ui.md](ui.md)。
