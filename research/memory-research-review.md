# 记忆插件设计：研究与评测复核

## 证据修正

四个独立 subagent 完成只读审计与联网研究。旧跑分不是可靠架构排名：隔离主要依赖提示词而非 OS；HOME 策略不同；部分 mem_bytes 包含 transcript；token 未统一缓存口径；GateMem 机械评分可把空输出算安全通过，日期匹配有假阴性；oracle 与完整历史题目不同，不构成成对消融。回答错误不能直接归因为写入、检索或先验压制。

具体审计入口：/tmp/dshmem/benchdata/run_bench2.py、run_bench4.py、judge_gatemem_mech.py、judge2.py。旧报告保留为过程记录，不据此断言某插件没有 ACL 或具有可靠删除。

## 最值得采用的参考

- Claude Code 文件记忆与按需正文：https://code.claude.com/docs/en/memory
- LongMemEval 论文与实现：https://arxiv.org/abs/2410.10813v2 ，https://github.com/xiaowu0162/LongMemEval 。采用 turn/session 粒度、事实扩展检索 key、时间感知 query；保留原始 value，时间过滤保留无过滤兜底。
- LangMem 防抖后台整理：https://github.com/langchain-ai/langmem/blob/main/src/langmem/reflection.py 。本地是内存队列，不保证崩溃恢复；DSH 应额外实现持久任务、水位、flush、幂等。
- Letta MemFS：https://docs.letta.com/concepts/memfs/index.md 。文件真源、Git 版本、后台 worktree；文本合并不是语义冲突检测，Git 提交也不保证检索索引刷新。
- Graphiti 时间与失效：https://github.com/getzep/graphiti/blob/main/graphiti_core/utils/maintenance/edge_operations.py 。有效时间与记录时间分开，provenance、失效区间与乱序事件。可借数据模型，不必引图数据库。
- Mem0 版本差异：https://arxiv.org/html/2504.19413v1 ，https://docs.mem0.ai/migration/oss-v2-to-v3.md 。旧论文提取后 ADD/UPDATE/DELETE；新自动提取 ADD-only，不等于显式更新删除消失。排序不是确定性更新保证。
- HippoRAG2：https://arxiv.org/abs/2502.14802 ，https://github.com/OSU-NLP-Group/HippoRAG 。实体/段落关联和 PPR 扩散作多跳候选扩展；不保证集合完整或时间正确。
- RAPTOR：https://arxiv.org/abs/2401.18059 ，https://github.com/parthsarthi03/raptor 。递归摘要导航，保留叶子证据；官方 add_documents 有重建限制，不应当成成熟增量整理器。
- A-MEM：https://arxiv.org/abs/2502.12110 ，https://github.com/agiresearch/A-mem 。标签和关联演化适合派生层，不直接无审计改写真源。

## DSH 推荐组合

Markdown 为内容真源。SQLite 管理可重建全文/向量索引，也可承载持久任务队列、处理水位和撤回状态；后三者不是可丢弃缓存，应备份或可从 journal 重放。

显式纠正即时提交；隐式捕获防抖后台处理。worker 带 base_revision，提交前 CAS/hash 验证，旧任务不得覆盖用户新纠正。文件与 SQLite 无天然跨介质事务：使用 journal/outbox、幂等补偿，检索回读源文件检查 revision/status，派生索引 generation 可重建。

记忆目录由插件生成；稳定约定有预算地注入，事实动态检索。先做 scope/time 过滤、全文+可选向量、来源回读，再尝试图扩展。列表保留顺序与原文；计数使用穷举去重和覆盖报告，不能把 top-k 当全量。

记录 source_refs、event_time、recorded_at、valid_from/to、supersedes。失效不等于删除。撤回同步 tombstone，随后清理摘要/向量/关系，阻止后台从旧来源重新抽取复活。

## 治理与评测

GateMem 官方按 episode reset、顺序 ingest、到 checkpoint 立即问：https://github.com/rzhub/GateMem/blob/main/docs/evaluation_protocol.md 。本地按 checkpoint 前缀批量导入虽避免未来输入，却未完整验证增量删除生命周期。官方测行为层不可恢复，不证明物理擦除。

namespace 只是数据组织，不自动构成 ACL：https://langchain-ai.github.io/langmem/guides/dynamically_configure_namespaces/ 。scope 必须由可信宿主固定，并在所有读取、更新和注入入口执行；全权限 shell 下插件不能独自保证 OS 文件隔离。

每题记录 source → extracted → committed → retrieved → injected → answered。固定题ID与评分规则，保存 judge 原文/异常，空输出和超时不得算安全成功；后台 flush 后再查；纯检索、端到端、缓存与未缓存 token 分开统计。

上述机制是受控消融候选，不代表论文收益可直接迁移到 DSH。优先上线可靠写入/更新闭环和 LongMemEval 的轻量检索改进，再验证图谱和递归摘要是否有额外收益。
