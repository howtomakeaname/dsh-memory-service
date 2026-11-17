# 交叉 Benchmark 实测（补充）

## 这轮新增了什么

之前只跑了 LongMemEval oracle 12 题、LoCoMo 第 1 段 10 题、自建 6 会话长程。这轮补了：

- **MemoryAgentBench · Conflict Resolution**：12 题（3 个长上下文 × 4 题）。上下文是一大段互相冲突的事实，正确行为是“以给定上下文为准”，压过模型先验。
- **LoCoMo 第 2、3 段对话**：16 题（每段 8 题），验证换对话/换人物后是否还成立。

## 结果

| 系统 | 交叉总分 | MemoryAgentBench CR | LoCoMo conv1/2 |
|---|---|---|---|
| layered | 6/28 (21%) | **0/12** | 6/16 |
| mnemon | 6/28 (21%) | **0/12** | 6/16 |
| try-works | 1/28 (4%) | **0/12** | 1/16 |

Claude / engramory 仍在跑大 context（12 个 MAB + 部分 LoCoMo），未纳入本表；目前看 MAB 同样是 0。

## 最重要发现：冲突消解全军覆没

MAB CR 的 12 题，layered / mnemon / try-works 全部 0。典型例子：

- 上下文里的正确答案是 Belgium / Rodez / Italy，模型答 英国 / 基辅 / 美国；
- 正确答案是 Taipei / Oceania / Champa，模型答 亚美尼亚 / Europe / 伯利恒；
- 正确答案是 German / Muay Thai / South America / hip hop，模型答 English / American football / Europe / Pop。

这说明：**模型在用参数化先验回答，而不是用记忆里的事实。** 即使上下文完整地在记忆里，注入的文本也没有“权威性”，冲突时仍输给先验。

设计含义：
1. 记忆注入必须带 provenance（来源、时间、版本），并明确“这是用户/项目的事实，优先于你的先验”；
2. 冲突要显式建模：同 entity 的最新事实 supersede 旧事实，而不是把两段文本都塞给模型；
3. 对“与常识冲突”的事实，需要单独的冲突消解/验证步骤，不能只靠检索。

## LoCoMo 换对话后明显变难

第 1 段对话（conv0）时 layered 7/10、engramory 7/10；换到 conv1/2 后 layered 6/16、mnemon 6/16、try-works 1/16。

失败集中在：
- 日期：19 January 2023、February 2023、21 December 2022 等；
- 具体实体/事件：her mother、A doll and a film camera、Volunteering at a homeless shelter；
- 多跳：需要把“谁在什么时候说了什么”串起来。

设计含义：会话/人物一换，纯 top-k 文本块就不够；需要按 entity + 时间线组织，并对日期做确定性抽取。

## 覆盖矩阵（诚实版）

| Benchmark | 状态 |
|---|---|
| LongMemEval oracle（12 题） | 已跑 |
| LongMemEval-S 完整 115k haystack | 未跑（上下文接近 128k，需要专门适配） |
| LoCoMo conv0（10 题）+ conv1/2（16 题） | 已跑 |
| MemoryAgentBench CR（12 题） | 已跑 |
| MemoryAgentBench AR / TTL / LRU | 未跑（上下文 1MB / 5.6MB，需要分块/检索适配） |
| GateMem（91 episodes / 2218 checkpoints） | 未跑（需要 role/permission/deletion 适配） |
| MemoryArena | 未跑（代码/数据当时未公开） |
| MemBench / StructMemEval / MUMBench | 未跑 |
| 自建 6 会话长程 | 已跑 |

所以准确说法是：**已交叉 4 类（LongMemEval、LoCoMo、MemoryAgentBench、自建长程），但每个都只覆盖了子集，不是全量。**

## 下一步建议

1. **LongMemEval-S 全量 haystack**：先跑 5 题，验证 115k 上下文是否可用；不行就做分块检索。
2. **GateMem**：这是最贴近“全局/工作区/删除/权限”的 benchmark，值得单独适配；但需要 role/permission 包装，不是改个 prompt 就能跑。
3. **MemoryAgentBench AR/TTL/LRU**：上下文太大，需要 chunking + retrieval，不能一次性灌入。

## 局限

- 交叉套件每类只有 12–16 题，单次运行；分数波动大。
- MAB 的 0/12 很刺眼，但方向明确：冲突消解是系统性缺口，不是随机噪声。
- Claude/engramory 未跑完，交叉表只含 3 个系统。
