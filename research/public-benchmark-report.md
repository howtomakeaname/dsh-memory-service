# 公开记忆 Benchmark 实测（隔离版）

## 方法

- 模型：deepseek-flash；DSH 0.2.2-rc.3；Claude Code 2.1.284
- **隔离**：ingestion 与 query 使用不同 DSH_HOME/CLAUDE_CONFIG_DIR，只把插件记忆库复制到 query home；query prompt 禁止读会话日志；每题记录 cheat 标记（全部 false）
- 数据：LongMemEval oracle 抽 12 题（6 类各 2 题，带 question_date）+ LoCoMo 第 1 段对话抽 10 题（5 类各 2 题，含 2 道 abstention）
- 判分：同一个 LLM judge；允许翻译/附加细节/开头说"不知道"但随后给出正确事实
- 每题独立 workspace；单题 ingestion 300s、query 150s 超时

## 总分

| 系统 | 总分 | LongMemEval | LoCoMo | 记忆写入率 |
|---|---|---|---|---|
| **layered** | **17/22 (77%)** | 10/12 | 7/10 | 22/22 |
| **claude-code** | **17/22 (77%)** | 10/12 | 7/10 | 22/22 |
| **engramory** | 16/22 (73%) | 8/12 | 8/10 | 18/22 |
| fooxe | 2/22 (9%) | 0/12 | 2/10 | **0/22** |
| base（无插件） | 2/22 (9%) | 0/12 | 2/10 | 0/22 |

fooxe 和 base 的 2 分都来自 abstention（2/2），不是记住了任何事实。

## 分能力

| 能力 | layered | engramory | claude | 说明 |
|---|---|---|---|---|
| temporal | 2/2 | 2/2 | 1/2 | 带 question_date 后，layered/engramory 能算对；claude 一道"26 天前"答"不知道" |
| multi-session | 2/2 | 2/2 | 2/2 | 都能答对 $0.75、30 分钟 |
| knowledge-update | 2/2 | 2/2 | 2/2 | 120 stars、Wednesday 都正确 |
| single-session-preference | 2/2 | 1/2 | 2/2 | claude 最稳；engramory 一次没写入 |
| single-session-assistant | 1/2 | **0/2** | 1/2 | 都栽在"列表第 7 项 = Transcriptionist" |
| single-session-user | 1/2 | 1/2 | 2/2 | "5 小时"等细节有丢失 |
| LoCoMo cat1（多跳） | 1/2 | **2/2** | 2/2 | |
| LoCoMo cat2（时间） | 1/2 | 1/2 | **0/2** | 日期题普遍弱 |
| LoCoMo cat3（推断） | **2/2** | 1/2 | 1/2 | |
| LoCoMo cat4（单跳） | 1/2 | **2/2** | 2/2 | |
| LoCoMo cat5（abstain） | 2/2 | 2/2 | 2/2 | 弃权策略都合格 |

## 效率

| 系统 | 中位 query | 中位 ingest | query tokens | 写入率 | 超时/空答 |
|---|---|---|---|---|---|
| layered | 4.9s | 10.4s | 5.4k | 22/22 | 0/0 |
| engramory | 5.5s | **35.6s** | 5.4k | 18/22 | 1/0 |
| claude | 5.4s | 23.4s | **15.5k** | 22/22 | 0/0 |
| fooxe | 2.7s | 3.1s | 4.4k | 0/22 | 0/0 |
| base | 2.6s | 3.0s | 4.4k | 0/22 | 0/0 |

## 缺陷清单（按对设计的启发排序）

### 1. 批量写入触发（最致命）
fooxe 22 题 **0 个记忆文件**：模型看到"阅读并记住，只回复 OK"就真的只回 OK，没有调用 memory_save。base 同样。layered 22/22 写入（自动 episode），claude 22/22（auto memory），engramory 18/22（有选择性写入）。
**设计含义**：不能依赖模型自觉调工具；ingestion 要由插件在会话事件上自动触发，分块抽取，并记录"本轮写入了什么"。

### 2. 细节粒度不足
所有系统都栽在 lme-single-session-assistant-0（列表第 7 项 = Transcriptionist）：
- layered 1/2、claude 1/2、engramory **0/2**。
类似地 "5 hours"、LoCoMo 的 "Adoption agencies"/"2022" 也丢。
**设计含义**：只存会话摘要/段落不够；要拆成原子事实 + 实体/列表项索引，列表类内容要保留序号。

### 3. 时间推理依赖日期上下文
第一轮漏了 question_date，claude 把"26 天前"算成"1712 天前"；补上日期后 layered/engramory 2/2，claude 仍有一题答"不知道"。
**设计含义**：每条记忆带 event_time/valid_from/valid_to；查询时注入 question_date；相对时间用确定性计算，不交给模型心算。

### 4. 偏好类要单独建模
claude 2/2，layered 2/2（判分放宽后），engramory 1/2。偏好题不是"事实召回"，需要用户画像/偏好层常驻注入，而不是靠检索碰运气。

### 5. LoCoMo 的日期/推断仍是短板
cat2（时间）claude 0/2、layered 1/2、engramory 1/2；cat3（推断）只有 layered 2/2。
**设计含义**：多跳/时间题需要"实体链接 + 时间线"结构，而不是纯 top-k 文本块。

### 6. 成本与延迟
claude 每次 query 15.5k tokens（layered 5.4k），ingestion 23s；engramory ingestion 35.6s，还有 1 次超时。
**设计含义**：常驻注入要有硬预算（索引 ≤1.5k tokens），正文 top-k；ingestion 要异步/分块，不能让一次 60k 字符的对话阻塞 35 秒。

### 7. 弃权不是问题
三个有记忆的系统 cat5 都 2/2；fooxe/base 也 2/2（因为什么都不知道）。**设计含义**：保留"无证据就不知道"的策略即可，重点不在这里。

## 对我们插件的落地建议

1. **写入**：会话事件驱动的 ingestion pipeline（分块 → LLM 抽取原子事实 → hash/向量去重 → 冲突消解 → 事务更新索引）。不要依赖模型主动调 remember。
2. **结构**：Tier0 规则/偏好常驻（≤500 tokens）+ Tier1 索引常驻（≤1.5k）+ Tier2 正文 top-k；列表/实体单独索引。
3. **时间**：event_time / valid_from / valid_to；查询注入 question_date；相对时间用代码算。
4. **更新**：supersede 一等公民；正文、摘要、索引同一事务；旧版本进 history。
5. **效率**：FTS5 + 向量混合检索，写时算好 embedding/摘要；目标 p95 <800ms、注入 ≤1.5k tokens。
6. **评测**：继续用隔离版 runner（ingest/query 不同 home，禁止读会话日志），固定这套 22 题 + 长程 6 会话做回归。

## 局限

- 22 题、单次运行；LoCoMo 只用了第 1 段对话；LongMemEval 用的是 oracle 证据集而不是完整 115k haystack。
- 判分是 LLM judge，已放宽但仍可能有误判；分数看趋势，不看绝对值。
- 本轮不测跨工作区隔离（前面长程场景已测：engramory 默认全局会泄漏，layered 单库可被越界读，fooxe/claude 物理隔离干净）。

## 原始产物

- 答案：/tmp/dshmem/benchdata/answers2/*.jsonl
- 判分：/tmp/dshmem/benchdata/judged2.jsonl
- 运行日志：/tmp/dshmem/benchdata/answers2/*.log
