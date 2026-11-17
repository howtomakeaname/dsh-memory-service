# Roadmap（不含 UI）

## 已完成

- Markdown 真源、SQLite FTS5 派生索引、global/workspace scope。
- `revision` + `expectedRevision` CAS、跨进程 `.memory.lock` 写锁、`supersedes`、软/硬遗忘。
- 七个工具：search/save/get/update/forget/flush/stats。
- `agent/pre-step` 动态注入，`session/event` 自动捕获。
- 持久 capture queue，启动/手动 drain，失败重试，running 超时恢复。
- 检索回读 Markdown 校验/修复索引；索引无命中时回退扫描文件。
- Claude Code memory 导入/导出（可选适配器）。
- CLI：init/list/search/get/upsert/forget/rebuild/flush/doctor/status/import-claude/export-claude。
- 23 个 `node:test` 用例；真实 DSH 多会话 e2e 通过。

## 下一阶段

- **语义冲突**：结构化 `subject/predicate/value`、`conflicted` 状态、`memory_resolve`、按需询问用户；详见 [conflict-resolution.md](conflict-resolution.md)。

1. **LLM 抽取**：当前自动捕获是确定性启发式，只识别“以后/记住/不要再”等；下一步加可选 LLM extractor，输入轮次水位，输出候选事实，再进入队列。
2. **Schema 版本与迁移**：给 SQLite 和 note frontmatter 加 schema version，提供迁移/回滚。
3. **配置校验**：root、budgetTokens、capture、flush 并发策略做 schema 校验和文档化。
4. **发布**：`npm pack` 已可打包；补 CHANGELOG、版本号、发布到 npm，并用 tarball 安装冒烟。
5. **备份/恢复命令**：`doctor` 目前只诊断；补 `backup`/`restore` 或文档化热备流程。
6. **自动化 e2e**：把真实 DSH headless 冒烟脚本化，作为发布前 gate。
7. **工具拆分**：`plugin/tools.mjs` 已接近 200 行，工具继续增加时拆成 `plugin/tools/` 每工具一文件。

## 暂不做

- Web/desktop 管理界面。
- 多用户 ACL / 认证。
- 图数据库、向量库（先把 FTS、版本、队列闭环做稳）。
