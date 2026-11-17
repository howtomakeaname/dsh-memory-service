# LongMemEval-S 完整 haystack 实测

## 方法

- 数据：longmemeval_s_cleaned.json，取 4 题（single-session-user / multi-session / temporal / knowledge-update 各 1 题，取该类型中 haystack 最小的）。
- 每题约 46–47 万字符（≈115k tokens），按完整 session 切成 9–10 段、每段 ≤60k 字符，逐段 ingestion（同一记忆 home），最后 query。
- 这不是官方一键 harness，是分块适配；用于测“完整长历史里能不能找到证据”，而不是 oracle 证据集。
- 系统：layered、Claude Code、mnemon。Claude/mnemon 因单题耗时过长，只跑完部分题。

## 结果

| 系统 | 完成 | 正确 | 每题 ingestion tokens | 记忆体积 | 具体 |
|---|---|---|---|---|---|
| layered | 4/4 | **0/4** | ~150k | ~600KB | 单跳/时间/知识更新都答“不知道”；多跳答 3（gold 5） |
| Claude Code | 3/4 | **1/3** | ~250k | ~2.3MB | 单跳答“三倍”正确；多跳 3 件（gold 5）；时间“不知道” |
| mnemon | 1/4 | **1/1** | ~133k | ~430KB | 单跳答“3 times”正确；其余未跑完 |

## 最关键对比：oracle vs 完整 haystack

| 系统 | LongMemEval oracle（12 题） | LongMemEval-S 完整（4 题） |
|---|---|---|
| layered | 10/12 | **0/4** |
| Claude Code | 10/12 | 1/3（完成部分） |
| mnemon | 8/12 | 1/1（完成部分） |

oracle 只给证据 session，模型只要“记住并复述”；完整 haystack 要在 115k 历史里定位证据。差距说明：**现有插件的瓶颈不是“存不下”，而是“长历史里找不到、排不对”。**

## 失败模式

1. **单跳事实也会丢**：layered 连“画值多少钱”都答不知道，尽管 600KB 记忆里应该有。
2. **多跳计数错**：layered/Claude 都答 3，gold 5；说明只召回部分条目。
3. **时间推理错**：Claude 时间题直接“不知道”；layered 也是。
4. **记忆体积≠效果**：Claude 2.3MB 记忆仍只对 1/3；layered 600KB 0/4。

## 设计含义

1. **分层索引，不是平铺 chunk**：chunk → session summary → entity/event 索引；查询先定位实体/时间，再取 chunk。
2. **查询分解**：多跳/时间题要拆成子查询（谁、何时、做了什么），而不是一次 top-k。
3. **时间线**：每条事实带 event_time；相对时间用代码算。
4. **冲突/权威**：和 MAB CR 的 0/12 一样，注入要带 provenance 和“优先于先验”的指令。
5. **成本**：完整 haystack 每题 130–250k ingestion tokens；没有结构化的“全量灌入”不可持续，必须增量抽取 + 摘要。

## 局限

- 4 题、单次；Claude 只完成 3 题、mnemon 1 题。
- 分块 ingestion 与官方 harness 不同（官方是逐步交互/检索），分数只用于暴露失败模式。
- 没有跑 LongMemEval-M（1.5M）和官方 500 题全量。
