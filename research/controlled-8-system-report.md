# 控制变量对比：8 系统 × 273 GateMem + 24 LongMemEval

## 口径

- GateMem：91 个 episode 全覆盖，每 episode 抽 utility / privacy / safety 各 1 个 checkpoint，共 273 个/系统。
- LongMemEval：6 类能力各 4 题，共 24 题/系统；完整 115k haystack，按 session 分块 ingestion。
- 8 个系统：layered、Claude、mnemon、engramory、try-works、fooxe、meow、base。
- GateMem 用确定性规则判分：utility 必须命中全部 include（日期/金额/百分比归一化）；privacy/safety 只看是否泄漏。LME 用 LLM judge。
- 同一任务文件、同一 judge、同一隔离方式。

## GateMem（273/系统）

| 系统 | 总分 | utility | privacy | safety |
|---|---|---|---|---|
| Claude | 186/273 (68%) | **18/91 (20%)** | 79/91 (87%) | 89/91 (98%) |
| base | 182/273 (67%) | 0/91 (0%) | 91/91 (100%) | 91/91 (100%) |
| engramory | 180/273 (66%) | 9/91 (10%) | 81/91 (89%) | 90/91 (99%) |
| meow | 179/273 (66%) | 0/91 (0%) | 89/91 (98%) | 90/91 (99%) |
| fooxe | 178/273 (65%) | 4/91 (4%) | 83/91 (91%) | 91/91 (100%) |
| try-works | 172/273 (63%) | 4/91 (4%) | 78/91 (86%) | 90/91 (99%) |
| mnemon | 170/273 (62%) | 10/91 (11%) | 71/91 (78%) | 89/91 (98%) |
| layered | 153/273 (56%) | 7/91 (8%) | 68/91 (75%) | 78/91 (86%) |

## LongMemEval 24 题

| 系统 | 正确 |
|---|---|
| Claude | **10/24 (42%)** |
| meow | 9/24 (38%) |
| mnemon | 7/24 (29%) |
| engramory | 6/24 (25%) |
| try-works | 3/24 |
| fooxe | 3/24 |
| layered | 2/24 |
| base | 1/24 |

## 关键结论

### 1. GateMem 总分不能直接排名
base（无记忆）182/273，排第 2，因为 privacy/safety 靠“什么都不知道”天然满分。真正有区分度的是 **utility**：
- Claude 18/91（20%）最好；
- mnemon 10、engramory 9、layered 7、try-works 4、fooxe 4、meow 0、base 0。

**utility 是“当前真相”测试，所有系统都极弱。** 这不是格式问题，是旧值/空值/缺字段。

### 2. privacy 也是“无记忆就安全”
base privacy 100%，meow 98%，fooxe 91%，Claude 87%，layered 75%，mnemon 78%。没有 ACL 层时，拒绝靠模型自觉；layered/mnemon 更容易泄漏。

### 3. safety（删除后不可恢复）
base 100%，fooxe 100%，Claude 98%，engramory 99%，try-works 99%，meow 99%，mnemon 98%，**layered 86%**。layered 有约 14% 的删除题失败，会召回旧值。

### 4. LME 完整 haystack
Claude 42% 领先；meow 38% 意外靠前（部分题靠通用知识/偏好）；layered 8% 垫底。oracle 10/12 的 layered 在完整历史里几乎归零。

### 5. 综合“记忆有效性”
按 utility + LME 两个真正需要记忆的指标：
- Claude：20% + 42%
- mnemon：11% + 29%
- engramory：10% + 25%
- layered：8% + 8%
- try-works：4% + 12.5%
- fooxe：4% + 12.5%
- meow：0% + 38%（LME 有分，但 GateMem utility 为 0）
- base：0% + 4%

## 设计含义

1. **当前真相层是第一位**：同 entity 最新值 supersede 旧值；查询默认 current；要能回答“现在是多少”。
2. **utility 差不是检索问题**：很多回答是空/旧值，说明写入时没把字段结构化，读时也没做值级校验。
3. **ACL 和删除要做在索引层**：靠模型拒绝，base 也能 100%，但没有可用性；layered 则会泄漏/恢复。
4. **LME 完整历史需要分层索引**：session → entity → event → chunk；平铺 top-k 不够。
5. **评测要同时看 utility 和 safety**：只看总分会被“无记忆 = 安全”骗。

## 局限

- GateMem 273/2218（12%，但覆盖全部 91 episodes）；LME 24/500（4.8%，每类 4 题）。
- LME 是分块适配，不是官方 harness；GateMem 用确定性 include/leak 规则，翻译可能漏判。
- 单次运行；judge 规则对格式敏感。
