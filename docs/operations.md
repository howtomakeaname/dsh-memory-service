# 运维与诊断

## 数据位置

默认 `~/.dsh/memory-service`，可用 `DSH_MEMORY_HOME` 或插件配置 `root` 覆盖。

```text
root/
├── global/notes/*.md          # 全局记忆
├── workspaces/<id>/notes/*.md # 工作区记忆
├── global/MEMORY.md           # 生成索引
├── workspaces/<id>/MEMORY.md
├── .index/memory.db           # 可重建 FTS5 索引 + capture_jobs
└── journal/events.ndjson      # 写入审计
```

## 备份

停止写入后直接复制整个 root 即可；Markdown 是内容真源，索引可以重建。

```bash
cp -a ~/.dsh/memory-service /path/to/backup
```

SQLite 开了 WAL，热备时优先停进程；否则至少同时接受 WAL/SHM 文件。

## 恢复与重建

```bash
node src/cli.mjs rebuild
node src/cli.mjs doctor
```

`doctor` 会报告：

- Markdown 笔记数
- 索引行数
- 索引中存在但文件已丢的 id
- 文件 hash 与索引 hash 不一致的 id
- capture 队列状态

## 捕获队列

自动捕获先写 `capture_jobs`，再由 `drain` 提交。手动处理：

```bash
node src/cli.mjs flush
```

插件启动时会把中断的 `running` 恢复成 `pending` 并继续处理；失败任务重试 3 次后标记 `failed`。

## 常见问题

### 搜索不到刚手动改的 Markdown

插件会在索引无命中时回退扫描 Markdown，并同步索引；若仍异常，执行 `rebuild`。

### 旧值仍然出现

检查 note 的 `status` 和 `supersedes`；旧值应被标为 `superseded`，检索只返回 `active`。需要彻底移除时用 `memory_forget --hard`。

### 自动记忆没有出现

先 `flush` 看 pending；再看 `memory_stats` 是否 `extractor=on`。有 LLM 时由模型判断是否长期有效；无 LLM 或关闭抽取时退回确定性规则。可配置 `extractEveryTurns` 控制调用频率。

### 和 Claude Code 的边界

导入是复制到 DSH 记忆库，不修改 `~/.claude`；导出也写入独立目标目录。两边不会自动双向同步。

## 安全边界

- scope 由宿主 session cwd 派生，工具只能选 workspace/global，不能传任意项目 id。
- 该插件不是 OS 级沙箱：拥有 danger-full-access 的 agent 仍能直接读文件。
- 删除是插件层的遗忘；原始 DSH 会话日志仍由宿主保留。
