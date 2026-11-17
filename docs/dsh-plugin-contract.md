# DSH 插件接口：工具注册与动态注入

本文记录 `dsh-memory-service` 实际使用的宿主接口，以及为什么这样接。参考实现来自已安装的 `dsh-memory-layered`，并在本地 `bench-memt-headless` profile 做过真实 headless 冒烟。

## 1. 插件入口

`package.json`：

```json
{
  "main": "src/plugin.mjs",
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } }
}
```

`src/plugin.mjs`：

```js
export const name = "memory-service";
export const inject = ["tools", "agents", "sessions"];
export function apply(ctx, config) { ... }
```

- `name` 是 loader 行 id 之外的插件名。
- `inject` 声明依赖的宿主服务；没有 `tools` 就不能注册工具，没有 `agents/sessions` 就不能挂 step/session 事件。
- `apply` 是唯一入口，所有注册和副作用都在这里完成。

## 2. 工具注册

真实宿主用的是 `ctx.tools.register`，不是直接改 agent 配置：

```js
ctx.tools.register({
  name: "memory_save",
  description: "Save a durable preference...",
  parameters: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
  output: {
    schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    render: (_args, value) => [{ type: "text", text: String(value?.text || "") }]
  },
  execute: async (args, exec) => {
    const session = exec?.agent?.session;
    return { text: "saved ..." };
  }
});
```

要点：

- `parameters` 是 JSON Schema，模型据此生成参数。
- `output.schema` 和 `render` 决定工具结果如何回到上下文；这里统一返回纯文本，避免结构化结果被宿主再次序列化。
- `execute` 第二参数 `exec` 携带调用方 agent/session，用它取当前工作区，而不是让模型传 project id。
- 返回 disposer，配合 `ctx.effect` 在卸载时清理。

本插件注册：`memory_search`、`memory_save`、`memory_get`、`memory_update`、`memory_forget`、`memory_flush`、`memory_stats`。

## 3. 动态注入

注入点不是 system prompt 拼接，而是 `agent/pre-step`：

```js
ctx.on("agent/pre-step", async (payload, next) => {
  const decision = await next();
  if (decision?.kind !== "enter") return decision;
  // 只在每轮第一次、且有真人消息时注入
  return {
    kind: "enter",
    messages: [...decision.messages, contextMessage(text)]
  };
});
```

关键约束：

- 先 `await next()`，尊重宿主已做出的 enter/skip 决策。
- 每个 turn 只注入一次（按 `turn` 记录），避免每个 step 重复烧 token。
- 只对真人消息注入；工具结果、子 agent、压缩轮不注入。
- 注入消息必须是 **producer-owned source kind**：

```js
{
  role: "user",
  content: [{ type: "text", text }],
  source: { kind: "plugin:dsh-memory-service", form: "recall" }
}
```

不能用旧的 `{ kind: "plugin", plugin: "..." }` 包装，v4 session 格式会拒绝。
- 注入内容分两段：稳定约定（type=convention/user/feedback，每会话至少一次）和按 query 检索到的事实；总量按 `budgetTokens` 截断。
- 任何异常都返回原 decision，记忆坏了不能影响对话。

## 4. 自动捕获与持久队列

`session/event` 提供 `turn/start`、`user/message`、`assistant/message`、`tool/call`、`turn/end`。

本插件只在：

- `turn/end.reason.kind` 是 `completed` 或 `max-tokens`；
- 用户文本命中长期约定模式；
- 本轮没有调用过 `memory_save`；
- 不是“请保存/记住/调用工具”这类元指令；

才把任务写入 `capture_jobs`，随后立即 drain。有 LLM 时，turn 任务交给 `capture/extract.mjs`：模型判断是否长期有效、类型、作用域，并用 evidence 校验；无 LLM 时退回文本任务。如果进程在 drain 前退出，下次插件启动会把超过 10 分钟未更新的 `running` 恢复为 `pending` 并继续处理。

不能直接写 `feedback`：首版曾把“请调用 memory_save 保存…”这条指令本身记成记忆，已用“本轮调用过 memory_save 就跳过”和元指令正则修掉。

## 5. 作用域

工作区 id 来自 `session.header.cwd`：

```js
basename(cwd) + "-" + sha1(cwd).slice(0, 8)
```

scope 为 `workspace:<id>` 或 `global`。模型只能在工具参数里选 `workspace/global`，不能传任意路径或 project id。

## 6. Bundle patch

`cordis.patch.yml`：

```yaml
- insert:
    - id: memory-service
      name: 'dsh-memory-service'
```

`dsh plugin --profile <name> add <path>` 会把包加入 profile 的 bundle 列表，启动时 loader 读取 patch 并挂载。

## 7. 已验证

- 本地安装到 `bench-memt-headless` 后，`--dump-config` 能看到 `id: memory-service`。
- 第一会话调用 `memory_save` 保存 `本项目统一使用 pnpm`。
- 第二会话只问“这个项目应该用哪个包管理器？”，模型回答 `pnpm`，证明注入链路生效。
- 修复后同一轮显式保存不再产生重复自动记忆。

## 8. 后续

- 用持久队列替换当前启发式捕获，做“轮次水位 → 候选 → 去重/冲突 → 提交”。
- 注入层加入上下文预算和缓存友好的稳定前缀。
- 为 web/desktop 增加管理页；当前先保证 headless 与工具链可用。
