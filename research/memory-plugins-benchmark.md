# DSH 记忆插件 · 实测报告（2026-11-15）

## TL;DR

在 **deepseek-flash** 上，用同一套 9 个显式场景、7 个隐式场景、6 会话长程场景，实测了 3 个 DSH 记忆插件 + Claude Code 原生记忆 + 无插件基线：

| 套件 | layered | fooxe | engramory | Claude Code | 基线 |
|---|---|---|---|---|---|
| 显式 9 场景 | **9/9** | **9/9** | 8/9 | — | — |
| 隐式 7 场景 | 6/7* | 5.5/7 | 6/7 | — | — |
| 长程 15 分 | 10 | **14** | 10 | 13 | 7 |

\* layered 的 i7 是模型越界直接读了共享 SQLite 文件，插件本身的检索隔离对照实验通过。

结论一句话：**"能不能记住"大家都不差；真正拉开差距的是"该用的时候会不会自动出现"和"改完索引会不会同步"。**

## 一、测试方法

- 模型：DeepSeek **deepseek-flash**（DSH 默认；Claude Code 用 `--model deepseek-flash`，modelUsage 已确认）
- DSH：0.2.2-rc.3；Claude Code：2.1.284
- 每个系统使用**隔离的 DSH_HOME / CLAUDE_CONFIG_DIR**，不污染真实 `~/.dsh`、`~/.claude`
- 每个场景都是**新进程、新会话**；单轮 150s 超时；`danger-full-access` 避免沙箱干扰
- 插件版本：layered 0.7.0、fooxe 0.13.10、engramory 1.5.x、meow 0.32.x
- 显式场景：写入→新会话召回→跨工作区隔离→全局记忆→更正→召回→删除→再召回
- 隐式场景：不出现"记住"二字，只说"以后都…""别再…""其实是用…"，再看下一轮是否照做
- 长程场景：同一项目 6 个会话——约定 → 加依赖/写代码 → 改架构 → 新约定+README → 长程方案 → 另一个项目的隔离性

## 二、显式 9 场景

| 系统 | 结果 | 备注 |
|---|---|---|
| layered | **9/9** | 写入/召回/全局/更正/删除全部正确；更正用 forget+save |
| fooxe | **9/9** | 同上；删除是模型用 bash+edit 直接改文件，没走专门工具 |
| engramory | 8/9 | **跨工作区失败**：项目 A 的 pnpm 在空项目 B 仍被召回 |
| meow | 部分 | s1 明确说"记住"都没触发保存；s4 全局才触发 memory_remember；s2 召回失败 |

## 三、隐式 7 场景

基线（无插件）：装依赖答 `npm install`，跑测试答 `npm test`（不会主动 lint）。

| 场景 | layered | fooxe | engramory |
|---|---|---|---|
| i1 "以后都用 pnpm" | 写入 fact | 写入 project | 写 note+索引 |
| i2 新会话装 lodash | **pnpm add** | **pnpm add** | **pnpm add** |
| i3 "测试前必须先 lint" | 写入 | 写入 | 写入 |
| i4 新会话跑测试 | **pnpm lint && pnpm test** | **pnpm lint && pnpm test** | **pnpm lint && pnpm test** |
| i5 "其实是用 bun" | 删除旧+写新，**PASS** | 写正文但**索引没更新** | 重写 note+索引，**PASS** |
| i6 新会话装依赖 | **bun add** | **pnpm add（PARTIAL）** | **bun add** |
| i7 空项目 B 隔离 | FAIL*（模型直接读 SQLite；对照通过） | **npm install（PASS）** | **bun add（FAIL，泄漏）** |

关键差异：
- **三个插件都能从隐式表达里沉淀偏好**，不是只有"记住"才生效。
- **fooxe 的纠错闭环有缺口**：没有 `memory_update` 工具，模型只能直接 write 记忆文件，索引 `MEMORY.md` 仍指向旧 pnpm，于是 i6 继续答 pnpm。
- **engramory 的纠错最完整**（删旧 note、改 lint 顺序、更新索引），但默认只有全局库，项目事实会跨工作区泄漏。
- **layered 的纠错也完整**（forget+save），但单库文件本身可被 agent 越界读取；它的 L1 自动抽取 7 轮全部 `timeout`，实际全靠模型主动调工具。

## 四、长程 6 会话（满分 15）

| 项 | layered | fooxe | engramory | Claude Code | 基线 |
|---|---|---|---|---|---|
| S2 包管理器 | 0（npm） | 2（pnpm） | 2（pnpm） | 2（pnpm） | 0（npm） |
| S2 代码 | 1 | 1 | 1 | 1 | 1 |
| S3 架构变更 | 2 | 2 | 2 | 1（索引仍写 SQLite） | 1 |
| S5 状态 | 2 | 2 | 2 | 2 | 1（~/.tasklog） |
| S5 日志 | 2 | 2 | 2 | 2 | 0（debug） |
| S5 测试位置 | 1（test/） | 2（tests/） | 0（同目录） | 2（tests/） | 2 |
| S6 隔离 | 2 | 2 | 1（混入 data/state.json） | 2 | 1 |
| S4 README | 0（超时） | 1 | 0（超时） | 1 | 1 |
| **总分** | **10** | **14** | **10** | **13** | **7** |

### 最重要的两个发现

**1）layered "记得住但不会用"——注入是检索门控的**

S1 明确存了"项目用 pnpm"，S2 仍然执行 `npm install dayjs`，思考里完全没出现 pnpm；到 S5 问"状态/日志/测试放哪"时，它才召回同一条记忆并准确答出 pnpm + pino + data/state.json。

原因不是没存，而是 layered 的动态段按当前查询做 FTS/向量检索：S2 的"加依赖 dayjs"与长文本约定词面不匹配，事实没进上下文；S5 的问题命中"状态/日志/测试"，才被召回。**对"永远要遵守的约定"，检索门控是错误策略。**

**2）索引与正文不一致是系统性问题**

- fooxe：i5 改正文不改索引 → 下一轮仍按旧索引答。
- Claude Code：S3 正文已改 JSON，`MEMORY.md` 摘要仍写 "SQLite not Redis" → 下一轮 S5 主动指出冲突并按正文作答。
- 两者都暴露同一个设计问题：**索引是注入面，正文是事实源，变更时必须原子更新两者**。

## 五、分系统评价

### @fooxe/dsh-memory（长程 14/15，综合最佳）
- 用户级 `~/.dsh/memory` + 项目级 `<repo>/.dsh/memory`，物理隔离干净。
- 隐式约定能自动保存，S2/S5 都直接照做；S6 空项目答 npm，不串味。
- 缺点：没有 `memory_update`；直接编辑正文会让索引滞后；删除靠 bash/edit，绕过工具约束。
- 适合：想要 Claude Code 式双 scope、又不想用 SQLite 的人。

### dsh-memory-layered（长程 10/15）
- 显式/隐式写入与更正都强；SQLite + FTS/向量；global fact 可跨项目。
- 致命点：**约定类事实靠检索注入，查询不匹配就不出现**；L1 自动抽取在本轮 7 次全部 timeout。
- 单库文件可被 agent 直接读取，隔离是"逻辑字段"不是"物理边界"。
- 适合：愿意把关键约定 pin 成 core/高优先级、并接受手动维护的人。

### dsh-engramory（长程 10/15）
- 隐式沉淀 + 纠错最完整（删旧 note、改索引）；S2/S5 都准确。
- 默认只有**全局库**，项目事实跨工作区泄漏（i7、S6 都中出现）；项目库要手动 init。
- S4 超时导致 tests 约定没落盘，S5 退化为同目录测试。
- 适合：单项目、或愿意为每个项目初始化独立库的人。

### Claude Code 原生记忆（长程 13/15）
- 自动记忆质量最高：frontmatter、Why/How、wiki 链接、按 git 项目隔离；S2 直接 pnpm。
- 6 轮约 8 万 input tokens、总成本约 $0.5；每轮 15-17k input，明显高于插件。
- 同样有索引滞后问题；S4 因 vitest 安装超时。
- 适合：已经在用 Claude Code、且能接受成本的人；它是产品基线，不是 DSH 插件。

### 基线（7/15）
- npm / console.log / 无状态约定，证明上面的分数确实来自记忆而不是模型常识。

### 未完成/受限
- **dsh-memory-palace**：host 半边依赖 `webServer/webStartup`，在 headless profile 里 `pending`，无法纳入自动测试；它的双层 + 章节级更新 + 删除确认设计仍然值得看，但需要在 GUI/web profile 里另测。
- **meow-memory**：显式"记住"都不一定触发保存，偏保守；全局记忆正常，项目记忆需要更明确的工具引导。

## 六、给 dsh-memt 的设计建议

1. **常驻约定用"全量索引注入"，不要用检索门控**；检索只用于细节和证据。
2. **索引与正文分离，但变更必须原子**：update 时同时改正文、重算摘要、更新索引；提供 `memory_update`/`supersede`，不要让模型直接 write 文件。
3. **作用域物理隔离**：global 与 workspace 用不同目录/库，不要只靠 project 字段过滤；单库至少加写入/读取边界。
4. **自动抽取要可观测、可降级**：记录 last-run/reason，超时不要静默；失败时回退到"模型主动保存"。
5. **纠错是一等公民**：保留旧版本/时间线，删除要软删+可审计；更正要能覆盖旧结论。
6. **成本**：全量索引注入约 5-9k input/轮，检索门控更省但会漏规则；对 coding agent，稳定性优先。

## 七、局限

- 每个场景只跑 1 次，模型有随机性；分数应看趋势不是绝对值。
- S4 的 150s 超时来自"没人要求却安装 vitest"的 registry 慢，不是记忆能力；README/tests 两项受此影响。
- Claude Code 是原生记忆，不是插件；它的对比价值在"产品级基线"。
- 长程场景只有 6 轮、单项目，不等于真实数周项目；但足以暴露注入策略和索引一致性问题。

## 附：原始产物

- 显式：`/tmp/dshmem/results/{layered,fooxe,engramory,meow}/`
- 隐式：`/tmp/dshmem/results/<plugin>/implicit-*`
- 长程：`/tmp/dshmem/results-lh/{layered,fooxe,engramory,claude,base}/`
- 规范：`/tmp/dshmem/long-horizon-spec.md`
