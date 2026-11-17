# 代码结构

目标是让“存储、索引、宿主适配、格式适配、CLI”分开，后续加后台队列或 web UI 时不需要继续往 `store.mjs` / `plugin.mjs` 里堆。

```text
src/
├── store.mjs                     # 兼容门面：re-export MemoryService
├── index-db.mjs                  # 兼容门面：re-export MemoryIndex
├── core/
│   ├── constants.mjs             # 记忆类型、稳定类型
│   ├── errors.mjs                # MemoryConflictError
│   ├── identity.mjs              # slug / hash / workspace id
│   ├── paths.mjs                 # root、scope、notes、journal 路径
│   ├── note.mjs                  # Markdown frontmatter ↔ note
│   ├── index-file.mjs            # MEMORY.md 生成
│   ├── journal.mjs               # 追加审计事件
│   └── memory-service.mjs        # 领域服务：upsert/list/get/search/forget/context
├── index/
│   ├── fts-query.mjs             # 查询分词
│   ├── scope.mjs                 # scope SQL
│   └── memory-index.mjs          # SQLite + FTS5 派生索引
├── capture/
│   ├── queue.mjs                 # 持久捕获队列（enqueue/drain/恢复）
│   ├── llm.mjs                   # 可选 DSH llm 客户端
│   └── extract.mjs               # 模型抽取 + evidence/置信度校验
├── plugin/
│   ├── index.mjs                 # apply 组合根
│   ├── state.mjs                 # 每会话 turn 状态
│   ├── message.mjs               # 文本提取、scope、注入消息
│   ├── capture.mjs               # session/event 自动捕获
│   ├── inject.mjs                # agent/pre-step 动态注入
│   └── tools.mjs                 # 四个 memory_* 工具
├── adapters/claude/
│   ├── discover.mjs              # 发现 Claude memory 目录
│   ├── import.mjs                # 导入
│   ├── export.mjs                # 导出
│   └── utils.mjs                 # hash / slug
└── cli/
    ├── args.mjs                  # 参数解析
    ├── output.mjs                # JSON 输出
    └── commands.mjs              # 命令分发
```

## 数据流

### 写入

```text
tool / CLI
  → MemoryService.upsert
  → note.mjs 序列化
  → 原子写 Markdown
  → MemoryIndex.sync
  → MEMORY.md 重新生成
  → journal 追加
```

自动捕获先走 `capture/queue.mjs`：

```text
turn/end 命中长期约定
  → capture_jobs（SQLite，状态 pending）
  → drain：turn 任务交给 extractor；text 任务直接 commitJob
  → extractor 输出候选，校验 evidence/confidence → commitCandidate
  → MemoryService.upsert
  → 进程重启时把超过 10 分钟未更新的 running 恢复为 pending，再继续 drain
```

Markdown 是唯一内容真源；SQLite 索引、MEMORY.md 和 capture_jobs 都是可恢复的派生/运行状态。

### 读取与注入

```text
agent/pre-step
  → humanText(messages)
  → MemoryService.context(scope, query)
      → list 稳定约定
      → MemoryIndex.search 动态召回
      → 回读 Markdown，按预算截断
  → 生成 plugin:dsh-memory-service 消息
```

## 维护约束

- 单个实现文件尽量保持在 200–300 行以内；超过就按职责拆。
- `store.mjs`、`index-db.mjs`、`plugin.mjs`、`adapters/claude.mjs` 只做门面，不放实现。
- 新增存储字段：先改 `core/note.mjs` 的序列化/反序列化，再改索引 schema。
- 新增工具：只改 `plugin/tools.mjs`；新增注入逻辑：只改 `plugin/inject.mjs`。
- 队列语义变化只改 `capture/queue.mjs`，不要让工具/注入直接操作 `capture_jobs`。
- 抽取提示词/schema 只改 `capture/extract.mjs`；正则只做触发/兜底，不要继续堆语义规则。
- 新增格式适配器：放 `adapters/<name>/`，不要污染 core。
- 每个公共行为至少有一个 `node:test` 用例。
