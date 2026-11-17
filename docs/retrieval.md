# 检索策略：正则不是语义解法

## 结论

正则只适合做：

- 显式指令触发：用户说“记住/以后/不要再”时立即入队；
- 没有 LLM 时的兜底；
- 安全/格式校验。

不适合做：

- 判断一句话是不是偏好；
- 判断问题是不是“推荐意图”；
- 判断两条记忆是否同一事实；
- 从长历史里决定注入哪条。

## 为什么 preference benchmark 会失败

LongMemEval 的 preference 题不是“关键词匹配”：

- 偏好散落在多轮里；
- 用户不会说“我的偏好是 X”；
- 问题问“推荐什么”，和偏好原文几乎没有词面重叠；
- 否定/例外/时间变化会改变结论。

之前试过在 context 里加“推荐/喜欢”正则再召回，能救回个别题，但第二条仍然失败。这说明瓶颈在**写入侧没有结构化偏好**，不是查询侧少一个关键词。

## 现在采用的结构

### 写入侧

模型抽取输出类型化记忆：

- `preference`：用户喜欢/不喜欢/偏好；
- `user`：稳定用户属性；
- `convention`：项目约定；
- `fact`：当前事实；
- `feedback`：纠正。

每条必须带 evidence，且 evidence 必须能在用户原话中找到。

### 读取侧

- `user` / `preference` / `convention` / `feedback` 属于稳定层，不依赖 query 关键词；
- 其余事实走 FTS5 检索；
- 预算内拼接；
- 冲突单独提示。

这样“推荐”类问题即使不问“我的偏好是什么”，也能看到稳定偏好 profile。

### 正则的保留位置

- `DURABLE` 只作为 capture 的触发/节流；
- 无 LLM 时的 `META` 防误存；
- 不再用正则做 preference 召回。

## 仍缺的

- 偏好还没有 `subject/predicate/value` 结构化字段；
- 没有 embedding/混合召回；
- 没有 LLM query expansion/rerank；
- benchmark direct 模式把所有 turn 存成 reference，不会产生 `preference` 类型，所以 preference 1/4 不能直接归因于真实抽取链路。

下一步应做：

1. 抽取 prompt 输出 `subject/predicate/value`；
2. 稳定 profile 生成（把多条 preference 合成短摘要）；
3. FTS + embedding 混合召回；
4. benchmark 用 agent 模式或预抽取 preference 记录，而不是 flat reference。
