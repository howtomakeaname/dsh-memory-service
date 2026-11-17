# Claude Code memory 现状（2026-11）

## 来源

- 旧源码快照：[777genius/claude-code-source-code-full](https://github.com/777genius/claude-code-source-code-full) 是 **2026-03-31 的 2.1.88 快照**，`package.json` 为 `0.0.0-leaked`；后续提交只改 README。
- 当前官方文档：[How Claude remembers your project](https://code.claude.com/docs/en/memory.md)，页面更新于 2026-11-12。
- 本机实际版本：Claude Code **2.1.284**；本机 `~/.claude/projects/*/memory/` 已按 storage v5 结构写入。

> 泄露源码是未授权公开的专有代码，仅用于架构观察，不复制实现。

## 当前确认的行为

- 项目级自动记忆目录：`~/.claude/projects/<project>/memory/`
- `MEMORY.md` 是索引，每次会话加载前 **200 行或 25KB**；一条记忆一行；topic 文件启动时不加载。
- 四类：`user / feedback / project / reference`；记录在 frontmatter 的 `metadata.type`，并带 `metadata.node_type: memory`、`originSessionId`、`modified`。
- 当前二进制有 `memory_prompt_index` / `prewarmMemoryIndex` / `searchMemoryFilesWithIndex`，说明索引和检索有独立预热层。
- recall supervisor 支持两种模式：`select` 返回选择器挑中的完整文件；`synthesize` 用 Sonnet 把大量小记忆合成一段 profile 后注入。
- 二进制里已出现 team / org / shared memory 的 mount、同步、secret scan、服务端大小限制；公开文档仍把 auto memory 描述为 machine-local。
- 安全限制：单文件 102400 bytes、路径 1024 bytes / 20 段、NFC、拒绝 credential、索引超限拒绝。
- auto memory 对本机是默认开启；可用 `/memory` 或 `autoMemoryEnabled` 关闭。

## 我们采纳了什么

- 类型化 `preference` 与稳定层注入；
- `profile.mjs`：把 preference/user 记忆合成短 profile，缓存按 note revision hash；
- `MEMORY.md` 200 行 / 25KB 限制；
- 自动 description + 抽取 prompt 的 description 字段；
- 注入时附带 updated 日期，提示可变事实可能过期。

## 我们暂不采纳

- team/org 同步（没有服务端和身份体系）；
- 纯目录扫描替代 SQLite FTS；
- 放弃 revision / CAS / conflict；
- 复制泄露源码。
