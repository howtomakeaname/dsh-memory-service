# 并发修改与冲突处理

## 两类冲突

### 1. 机械竞争：同一 revision 的并发更新

两个会话都读到 revision 1，然后都提交更新。

当前实现：

- 所有 MemoryService.upsert / forget 都经过 root 下的 .memory.lock 文件锁；
- 锁内重新读取当前 note，再检查 expectedRevision；
- 第一个写入者成功，revision 变成 2；
- 第二个写入者拿到 MemoryConflictError，不会覆盖；
- 工具返回当前 revision 和正文，调用方可以重读后重试。

这不是“最后写入赢”。锁是跨进程的，CLI、插件、队列 worker 共用。

### 2. 语义冲突：两个会话对同一事实给出不同结论

例如：

~~~text
会话 A：项目以后用 pnpm
会话 B：项目以后用 bun
~~~

两个 memory_save 会生成两条不同 id 的 active note，文件锁和 revision 都不会报错，因为它们是不同记录。检索/注入可能同时看到两条。

**这类冲突不能只靠锁解决。** 需要事实键、来源权威和冲突状态。

## 建议的冲突策略

### 优先级

1. 用户明确纠正 > 用户普通陈述 > 工具/导入 > 自动捕获。
2. 有明确 recorded_at 且来源权威相同的，较新者优先，但旧值保留为历史。
3. 两个用户陈述同等权威、同等新鲜且互斥时，不自动选一个。

### 自动可解

- 不同字段：合并。例如 A 改预算，B 改日期。
- 明确 supersedes：新值替换旧值，旧值保留历史。
- 自动捕获和显式保存命中同一事实：显式保存优先，自动候选丢弃或转为历史。

### 需要问用户

同一 key、同一 predicate、互斥 value，且：

- 两个来源权威相同；
- 无法从时间/会话上下文判断哪个是用户最终意图；
- 错误注入的代价高（包管理器、审批预算、权限、部署目标等）。

### 不打断，先标记

低风险或暂时无法判断的冲突：

- 两条都保留，status 标为 conflicted；
- 注入时给出一条冲突提示，而不是任选一条；
- 下次用户明确选择后，用 memory_resolve 标记 winner，loser 转 superseded。

## 能不能直接问用户

可以。DSH 提供 ctx.userQuestions 服务：

~~~js
await ctx.userQuestions.ask({
  agent,
  questions: [{ id: "memory-conflict", question: "两条记忆冲突，以哪个为准？", options: [...] }],
  signal
});
~~~

但有两个限制：

1. 需要 live root agent 和已连接的 answerer；headless/后台任务可能得到 no user-questions answerer accepted the request。
2. 阻塞式提问不适合后台 capture/queue worker；会卡住非交互流程。

更稳的做法：

- **插件工具返回冲突**，让模型调用宿主内置的 ask_user_question 工具；UI 有时限/继续机制，headless 可以自行决定重试或放弃。
- 或者提供 memory_conflicts / memory_resolve 工具，由 agent 在下一轮处理。

## 当前实现边界

已做：

- 跨进程写锁；
- CAS revision；
- 同 key 互斥值进入 `conflicted`；
- `memory_conflicts` 列出冲突；
- `memory_resolve` 选择 winner，loser 转 superseded；
- 注入时给出冲突提示，不静默选一个。

未做：

- subject/predicate/value 结构化事实键；
- 字段级 merge；
- 自动询问用户；
- 冲突 UI 的专门筛选页。

这些在 [roadmap.md](roadmap.md) 的下一阶段。
