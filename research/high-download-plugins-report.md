# 高下载记忆插件实测（补充）

## 下载量排名（npm 周下载，2026-11-15）

| 插件 | 周下载 | 本次状态 |
|---|---|---|
| dsh-mnemon | 34,077 | 可测，14/22 |
| dsh-plugin-memory | 10,650 | 0.18.4 不兼容；0.19.5 可测，部分 12/22 |
| meow-memory | 5,273 | 可测，4/22 |
| dsh-memory-nebula | 4,546 | web-only，pending |
| dsh-memory-hub | 2,239 | 可激活，但人工审批门控 |
| @max-null/dsh-memory | 2,030 | web-only，pending |
| dsh-memory-palace | 1,522 | web-only，pending |
| @try-works/dsh-memory | 1,160 | 可测，15/22 |

## 总分（22 题，同一 judge）

| 系统 | 总分 | LME | LoCoMo | 备注 |
|---|---|---|---|---|
| Claude Code | 17/22 (77%) | 10/12 | 7/10 | 原生 auto memory |
| layered | 16/22 (73%) | 10/12 | 6/10 | 自动 episode |
| engramory | 15/22 (68%) | 8/12 | 7/10 | 全局库默认泄漏 |
| **try-works** | 15/22 (68%) | 7/12 | 8/10 | 存储不在 DSH_HOME |
| **dsh-mnemon** | 14/22 (64%) | 8/12 | 6/10 | 最省 token |
| meow-memory | 4/22 (18%) | 1/12 | 3/10 | 批量灌入几乎不生效 |
| fooxe | 3/22 (14%) | 1/12 | 2/10 | 0 写入 |
| base | 3/22 (14%) | 1/12 | 2/10 | 只有 abstention |

plugin-memory 0.19.5 因每次查询慢，只跑完 12/22，未计入上表。

## 效率

| 系统 | 中位 query | 中位 ingest | query tokens | 写入率 |
|---|---|---|---|---|
| mnemon | 3.7s | 12.4s | **641** | 22/22 |
| try-works | 17.5s | 13.1s | 6.7k | 22/22（store 未计入） |
| meow | **20.7s** | 20.7s | 5.2k | 22/22 |
| plugin-memory 0.19.5 | 很慢（12 题未跑完） | — | — | 写入字面量 ~/.memory |

mnemon 的 641 query tokens 是这批里最省的：注入非常紧凑，准确率还有 64%，值得借鉴。

## 高下载插件暴露的缺陷

### 1. Host peer / 版本兼容性极差
fresh profile 里：
- mnemon 缺 @deepseek-ai/cordis、dsh-typert-protocol；
- plugin-memory 缺 schemastery，且 0.18.4 调用已移除的 ctx.agents.roots()；
- max-null 缺 dsh-tools、dsh-scope；
- meow 缺 dsh-llm。

共享 ~/.dsh/profiles/node_modules 的 symlink 指向一个已被清理的 npx 缓存，导致这些包全部 import 失败。手动重建 npx 缓存（0.2.2-rc.3 的 host 包）后才可激活。
**设计含义**：我们的插件要么 bundle 依赖，要么把 peer 范围写宽并给出清晰的安装期报错；不要依赖 profile 里隐式存在的宿主包。

### 2. 存储路径不认 DSH_HOME
- plugin-memory 写到字面量 ~/.memory；
- mnemon 写到 ~/.mnemon；
- try-works 的 store 不在 $DSH_HOME 下（22 题都 mem=37B）。

结果：不同任务/工作区共享同一份记忆；我们用 HOME 隔离才把 plugin-memory 拉到 12/22。try-works 的 68% 也可能受全局 store 影响。
**设计含义**：我们的插件必须显式使用 $DSH_HOME + workspace registry，禁止 os.homedir() 硬编码；评测时必须同时隔离 DSH_HOME 和 HOME。

### 3. 批量写入仍是大分水岭
meow 22/22 有 store，但 22 题只对 4 题——它按关键词/首轮快照注入，长 transcript 没沉淀成可检索事实；fooxe 0 写入；layered/Claude/mnemon/try-works 能自动或半自动写入。
**设计含义**：写入要独立于模型自觉调工具；批量 ingestion 必须分块抽取 + 去重。

### 4. 下载量 ≠ 质量
- mnemon 34k：64%，但最省 token；
- meow 5.2k：18%；
- try-works 1.2k：68%；
- plugin-memory 10.6k：安装即踩坑。
选型不能看下载量。

### 5. Web-only 插件无法自动评测
nebula、max-null、palace 依赖 webServer/webStartup，headless 里 pending；hub 激活但要求人工审批候选，自动 QA 拿不到 accepted knowledge。要测它们必须起独立 web 实例 + 浏览器自动化。

## 对我们插件的直接建议

1. **依赖策略**：bundle 关键依赖，peer 范围写宽；启动时自检缺包并给可执行修复命令。
2. **存储策略**：只用 $DSH_HOME 与 DSH workspace registry；global / workspace / session 物理隔离；禁止 ~ 字面量。
3. **写入策略**：会话事件驱动 ingestion（分块、抽取、去重、冲突消解），不依赖模型主动 remember。
4. **注入策略**：mnemon 的 641 tokens 证明“紧凑索引 + 按需正文”可行；不要像 Claude 那样每轮 15k tokens。
5. **评测策略**：同时隔离 DSH_HOME 和 HOME；否则会测到跨任务/跨工作区的全局 store。

## 局限

- 22 题、单次运行；judge 是 LLM，分数有 ±1-2 题波动（本轮 layered 从 17 变 16）。
- plugin-memory 只跑完 12/22；nebula/max-null/palace/hub 未进入自动评分。
- try-works / mnemon 的存储路径不在隔离 home 内，隔离性存疑，分数仅作参考。


## 补充：裸 DSH（无任何记忆插件）

隔离版 22 题：**3/22**。
- 其中 2 题是 LoCoMo abstention（回答“不知道”本来就对）；
- 1 题是 preference（丹佛旅行建议）被放宽后的 judge 判对，但模型并没有历史记忆，只是通用建议碰巧覆盖偏好；
- 其余 19 题事实题全部“不知道”；
- 22 题里 20 题回答“不知道”，记忆写入 0，query 中位 2.6s / 4.4k tokens。

结论：裸 DSH 每个会话都是白纸开局，没有跨会话记忆；它不会自动写 AGENTS.md/CLAUDE.md，也不会记住上一轮。宿主只把会话 transcript 落盘用于审计/恢复，这不是记忆能力。

如果不隔离 query home，裸 DSH 的 agent 可以用 bash 去解压 $DSH_HOME/sessions 下的会话日志读回上一轮对话——我们第一轮就观测到 base 答对 26 天、$0.75，代价是 9–13 次 bash、16–23k tokens、26–33 秒/题，属于“翻日志”，不是记忆。

## 本轮跑批状态

- mnemon：22/22 完成，14/22。
- meow：22/22 完成，4/22。
- try-works：22/22 完成，15/22。
- plugin-memory 0.19.5：只跑到 14/22，单题过慢，已停止；不纳入总分。
- nebula / max-null / palace：web-only pending；hub：人工审批门控。
