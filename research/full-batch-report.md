# 全量批次结果：GateMem 91 episodes + LongMemEval 24 题

## 规模

- **GateMem**：91 个 episode 全量覆盖，每 episode utility / privacy / safety 各 1 个 checkpoint，共 273 个/系统；3 系统 = 819 次会话。
- **LongMemEval**：6 类能力各 4 题，共 24 题/系统；完整 115k haystack，按 session 切 9–10 段逐段 ingestion；3 系统 = 72 题。
- 判分：GateMem 用 LLM 按 include / stale / leak 规则；LME 用同一套 LLM judge。

## GateMem（273/系统）

| 系统 | 总分 | utility | privacy | safety |
|---|---|---|---|---|
| **Claude Code** | **190/273（70%）** | 44/91（48%） | 57/91（63%） | 89/91（98%） |
| **mnemon** | **185/273（68%）** | 54/91（59%） | 44/91（48%） | 87/91（96%） |
| **layered** | **149/273（55%）** | 29/91（32%） | 47/91（52%） | 73/91（80%） |

分域：

| 域 | Claude | mnemon | layered |
|---|---|---|---|
| education | 58/90 (64%) | 56/90 (62%) | 37/90 (41%) |
| household | 51/69 (74%) | 51/69 (74%) | 43/69 (62%) |
| office | 31/51 (61%) | 29/51 (57%) | 30/51 (59%) |
| other | 50/63 (79%) | 49/63 (78%) | 39/63 (62%) |

## LongMemEval 24 题（完整 haystack）

| 系统 | 总分 | user | multi | preference | temporal | knowledge | assistant |
|---|---|---|---|---|---|---|---|
| **Claude** | **11/24（46%）** | 4/4 | 4/4 | 1/4 | 0/4 | 2/4 | 0/4 |
| **mnemon** | **7/24（29%）** | 2/4 | 1/4 | 1/4 | 1/4 | 2/4 | 0/4 |
| **layered** | **2/24（8%）** | 0/4 | 0/4 | 2/4 | 0/4 | 0/4 | 0/4 |

对比 oracle（12 题）：layered 10/12 → 2/24；Claude 10/12 → 11/24；mnemon 8/12 → 7/24。layered 掉得最狠，Claude 相对稳。

## 关键结论

### 1. Claude 是长历史场景的明显赢家
GateMem 70%、LME 46%，单跳和多跳都能到 4/4。它的 auto memory 会写大量笔记（2.3MB），但更重要的是能按 query 找到证据。
mnemon GateMem 68% 接近 Claude，但 LME 只有 29%，说明它的记忆更偏“会话内事实”，长历史检索弱。
layered 两项都最低（55% / 8%），oracle 的高分在完整历史里完全消失。

### 2. utility（当前值）是全场最弱
GateMem utility：Claude 48%、mnemon 59%、layered 32%。典型失败是召回旧版本（layered 把 July 24 答成 June 23），或者只答对一部分字段。
**版本化/当前真相仍然是所有插件的第一缺口。**

### 3. privacy（ACL）第二弱
GateMem privacy：Claude 63%、layered 52%、mnemon 48%。三个插件都没有 ACL 层，是否拒绝取决于模型是否遵守 asker 角色；mnemon 在单 episode 里泄漏过 “revoked”。

### 4. safety（删除后不可恢复）差距最大
Claude 98%、mnemon 96%、layered 80%。layered 有约 20% 的删除题失败，说明历史版本/旧值仍可能被召回。
**删除不能只靠“模型没想起来”，要有索引层排除。**

### 5. 时间推理和列表项是普遍黑洞
LME 里 temporal：Claude 0/4、mnemon 1/4、layered 0/4；assistant（列表第 N 项）：三家全 0/4。
这两类不是“多存点”能解决的，需要时间线索引和列表/序号结构。

## 设计含义

1. **当前真相层**：同 entity 最新值 supersede 旧值；默认查 current，问“以前”才查 history。
2. **ACL 进检索**：条目带 principal/role/scope，检索时过滤，而不是全量注入后靠模型拒绝。
3. **删除可证明**：软删 + 版本链，但检索/注入必须排除已删除内容。
4. **时间线 + 列表结构**：event_time 索引；列表项保留序号/位置。
5. **分层索引**：chunk → session summary → entity/event → chunk；不要平铺 top-k。

## 局限

- GateMem 抽了 273/2218 checkpoints（12%），但覆盖全部 91 episodes；LongMemEval 抽了 24/500（4.8%），每类 4 题。
- 都是单次运行；LLM judge 有波动。
- LME 是分块 ingestion 适配，不是官方 harness。
