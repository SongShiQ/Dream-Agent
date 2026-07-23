# DeepTutor / LLM Wiki Skills / OpenKB / LLM Wiki 源码级调研

**日期**：2026-07-17  
**范围**：老师给出的四个准确仓库，按当前默认分支源码、发布物、许可证和本机可运行性复核。  
**目的**：回答“各自是干什么的、有没有直接能用的、怎样与 OS 实验生成框架组合、哪些坑不必再踩”。

## 0. 结论先行

这四个项目不是四套同类 AI Tutor，而是四个不同层级的东西：

| 项目 | 本质 | 最强能力 | 对 OS 自学系统的角色 |
|---|---|---|---|
| DeepTutor | 完整 AI 导师应用与 Agent 运行时 | 教、练、测、记忆、掌握度路径 | 教学编排参考或独立 POC |
| llm-wiki-skills | 一份 Agent Skill 操作规程 | 让 Agent 按固定目录维护 Markdown Wiki | 知识维护规则种子 |
| OpenKB | Python CLI 知识编译器 | 文档解析、长文索引、Wiki 编译、查询、lint、Skill 生成 | 教师侧离线课程知识生产线 |
| nashsu/llm_wiki | Tauri 跨平台桌面知识库产品 | 文档摄入、图谱、搜索、审核、研究、HTTP API、MCP | 教师工作台/产品标杆/快速演示 |

**有没有直接能用的？有，但用途不同。**

1. **今天就能给老师演示**：下载 `nashsu/llm_wiki` 的 Windows portable 或安装包，导入一组 OS 文档即可体验完整知识库产品。
2. **今天就能做课程知识生产**：在 Python 3.10-3.13 环境安装 OpenKB，用 `openkb init/add/lint/query` 离线生成可审核 Wiki。
3. **今天就能体验完整 AI 导师**：按官方支持环境安装 DeepTutor，配置模型后运行 Web 应用；但它不是 OpenCamp 的现成替代品。
4. **今天就能采用规则**：`llm-wiki-skills/SKILL.md` 可作为知识维护提示词，但它没有程序、测试、解析器或服务，不能单独“运行”。

**面向 OpenCamp 生产系统的建议不是整仓合并**：保留 Dream Agent 的 Next.js、学生数据、课程 Gate、Judge 和运营壳；OpenKB 作为教师侧离线 sidecar；移植 DeepTutor 的 mastery 确定性策略；LLM Wiki 桌面版只做教师工具或通过 API/MCP 松耦合使用。不要同时引入 OpenKB 与 nashsu/llm_wiki 作为两套生产知识引擎。

## 1. 复核基线

以下数据取自 2026-07-17 的 GitHub API 和本地浅克隆，星标只是社区热度，不等于生产成熟度。

| 仓库 | 当前提交/版本 | 首次公开 | Stars / Forks | 测试与规模 | 许可证 |
|---|---|---:|---:|---|---|
| [HKUDS/DeepTutor](https://github.com/HKUDS/DeepTutor) | `3e3b9a6` / v1.5.1 | 2025-12-28 | 26,887 / 3,614 | 1,667 文件，903 Python，254 个 Python test 文件 | Apache-2.0 |
| [ishicm/llm-wiki-skills](https://github.com/ishicm/llm-wiki-skills) | `2047d5e` / 无 release | 2026-04-13 | 22 / 2 | 16 文件，核心是 278 行 `SKILL.md`，无测试 | MIT |
| [VectifyAI/OpenKB](https://github.com/VectifyAI/OpenKB) | `e6f3285` / v0.4.4 | 2026-04-04 | 3,043 / 329 | 150 文件，97 Python，55 个 test 文件；项目自标 Alpha | Apache-2.0 |
| [nashsu/llm_wiki](https://github.com/nashsu/llm_wiki) | `969e7e8` / v0.6.4 | 2026-04-08 | 14,739 / 1,753 | 429 文件，264 TS、60 TSX、39 Rust，约 127 个前端 test 文件 | GPL-3.0 |

四个项目都很新。DeepTutor 不到一年，其余三个约三个月；即使 Stars 很高，也应按快速演进项目管理版本锁定、数据迁移和回滚。

源码已下载到：

```text
D:/THU/BeiJing/训练营/refs/
├── DeepTutor/
├── llm-wiki-skills/
├── OpenKB/
└── llm_wiki/
```

## 2. 先理解 Karpathy 的 LLM Wiki 理念

四个仓库中后三个都围绕同一个区别：

- 传统 RAG 在每次提问时从原始分块重新检索和拼答案；
- LLM Wiki 在资料进入时就把知识“编译”为可持续更新的 Markdown 页面、交叉链接、摘要、矛盾和索引；
- 后续问题优先读取已经积累的 Wiki，值得保留的查询结果还能写回 Wiki。

原始设计是三层：不可变原始资料、LLM 维护的 Wiki、约束 Agent 行为的 Schema；三个核心操作是 Ingest、Query、Lint。它不是“完全替代 RAG”的定理。文档数和页面数继续上升后，仍需要全文、树索引、向量或图检索；OpenKB 和桌面 LLM Wiki 实际上都补回了检索基础设施。

对课程的价值是把“临场回答”变成“可审阅、可引用、可版本控制的课程资产”。但 LLM 生成的 Wiki 仍是二手内容，不能自动升级为事实来源；原始教材、课程仓库、实验规范和教师审核状态必须保留。

## 3. DeepTutor：完整导师运行时

### 3.1 它真正做什么

DeepTutor 不是单个 RAG Demo。它用 `ChatOrchestrator` 把 CLI、WebSocket API 和应用入口路由到统一 Capability：

```text
CLI / Web / SDK
      -> ChatOrchestrator
      -> chat / mastery_path / deep_solve / deep_question /
         deep_research / visualize / math_animator
      -> Tool Registry + Capability Registry
      -> StreamBus 流式事件
```

它的工具包括 RAG、源文件读取、长期记忆、笔记、Web、GitHub、MCP、受限命令执行和代码执行。知识库可选 LlamaIndex、PageIndex、GraphRAG、LightRAG、外部 LightRAG Server，也可把一个 Markdown/Obsidian 目录作为“连接型知识库”直接读取和写入。

最值得关注的是 `mastery_path`：

- LLM 决定怎么教、怎么提问；
- 确定性引擎决定学生是否越过知识点 Gate；
- `memory/procedure` 用题目正确性和阈值；
- `concept/design` 用质性评估布尔 Gate；
- 有待答题、间隔复习、未掌握目标和完成四类下一步；
- 掌握度、复习队列和路径持久化到磁盘。

这比“每轮让模型自报 mastery=0.8”可靠，但仍不等于 OS 课程的真实达标。`concept/design` 的通过仍由 Tutor 判断；OpenCamp 必须继续让服务端小测、编译测试、QEMU/隐藏测试和教师复核产生正式证据。

### 3.2 哪些代码值得直接参考

| 源码位置 | 可复用价值 | 对 Dream Agent 的处理 |
|---|---|---|
| `deeptutor/runtime/orchestrator.py` | 统一入口和 capability 路由 | 对照现有 `lib/agents/router.ts`，不引入 Python 服务 |
| `deeptutor/learning/models.py` | 知识点、尝试、复习、进度数据契约 | 映射成 TS/Zod + Prisma 事件，不照搬存储 |
| `deeptutor/learning/mastery.py` | 可替换的掌握度计算 | 可移植算法并用真实题目数据校准 |
| `deeptutor/learning/policy.py` | per-type hard gate 和 next objective | 最值得移植到 `lib/progress/mastery.ts` |
| `deeptutor/learning/scheduler.py` | 间隔复习调度 | 可作为复习队列起点 |
| `deeptutor/capabilities/mastery/tools.py` | Tutor 与确定性引擎的工具契约 | 参考工具输入输出，不复制 Python runtime |
| `deeptutor/capabilities/obsidian/` | 对任意 Markdown Wiki 的无索引连接 | 可用于快速组合 POC |

### 3.3 能否直接用

**作为独立产品：能。** 官方给出 PyPI、源码、Docker、CLI 四条路径；要求 Python 3.11+，完整源码开发以 Node 22 为基线，配置 LLM 后即可启动。

**作为 Dream Agent 依赖：不建议。** 两者在前端、会话、认证、学生模型、知识库和工具系统上高度重叠。把 DeepTutor 作为第二个后端会产生两套用户状态、两套对话流和两套知识配置。

**作为实验 Judge：不能。** DeepTutor 的 `exec/code_execution` 面向 Agent 生成文件和本地工具，默认本机子进程沙箱是“信任决策”；它不是为多租户恶意学生代码设计的 OJ 隔离器。Dream Agent 已冻结的独立 Linux worker、容器资源限制和受保护 complete 通道必须保留。

### 3.4 主要坑

- 安装面很大：Python、Node、模型、Embedding、可选解析器/图引擎、前后端服务。
- 功能范围远超当前 OS 纵向切片，直接 fork 会承担大量无关维护。
- RAG 引擎配置复杂，GraphRAG/LightRAG 建索引成本高。
- 默认代码执行不能直接承担公网学生提交。
- Apache-2.0 便于借鉴和移植，但仍要保留版权和 NOTICE 义务。

## 4. llm-wiki-skills：操作规程，不是程序

### 4.1 它真正做什么

仓库只有 16 个受版本控制文件。核心 `SKILL.md` 规定四种 Agent 工作模式：

1. 首次创建或迁移知识库；
2. 从 inbox、对话或 URL 增量摄入；
3. 页面达到阈值后重组目录；
4. 检查孤儿页、断链、重复页、过期页和索引一致性。

它用 `_surface.md -> _index.md -> page` 两级索引控制 Agent 读取范围；结构调整必须先展示方案并获得确认，原始资料只归档不删除。

### 4.2 能否直接用

**能作为 Skill 文本直接采用，不能作为知识引擎直接采用。** 它没有：

- PDF/Office 解析器；
- 可执行 CLI/API；
- 原子写入、锁、崩溃恢复；
- 可重复的 lint 程序；
- 多用户权限、审核队列或检索服务；
- 自动化测试。

所谓“支持 URL/PDF”实际依赖承载它的 Agent 是否拥有网页抓取、PDF 读取和文件编辑工具。知识库大时，“读每个现有文件”和让 LLM 判断重复/过期，成本和稳定性都会迅速恶化。

### 4.3 需要修正的问题

- README 的安装示例写成 `ishicm/llm-wiki.git`，与实际仓库 `ishicm/llm-wiki-skills.git` 不一致。
- “零依赖、无限扩展”是产品表述，不是工程保证；它把依赖转移到了 Agent runtime 和模型上下文。
- 仅凭 `updated > 90 天` 不能判断 OS 知识是否过时，课程版本、来源版本和教师状态更重要。
- 相比之下，OpenKB 自带的只读 Skill 明确把 Wiki 内容视为不可信数据，并防止其中的提示注入和未经授权的写操作，生产安全边界更完整。

### 4.4 推荐用法

把它当作 MIT 许可的“规则种子”，抽取以下原则写入 Dream Agent 的内容生产说明：原始资料不可变、Wiki 可再生成、索引必须同步、结构变更需审批、所有条目可追溯。不要把这份 Skill 当成课程内容生产流水线本身。

## 5. OpenKB：教师侧知识编译器

### 5.1 它真正做什么

OpenKB 是 Python CLI，不是 Web 知识库服务。典型流程是：

```text
PDF/Word/PPT/Excel/HTML/URL
  -> markitdown / trafilatura
  -> 短文全文读取；20 页以上 PDF 用 PageIndex 树索引
  -> LLM 编译
  -> wiki/summaries + concepts + entities + sources
  -> index.md + log.md
  -> query/chat/lint/visualize/skill/deck
```

一份资料会生成摘要，并更新跨资料 concept/entity 页面。长 PDF 不直接把全文塞入上下文，而是让 PageIndex 生成层次树后按结构检索。它还支持：

- `add/remove/recompile/watch`；
- 有引用的单次查询和持久多轮 chat；
- 结构 lint 和 LLM 语义 lint；
- 生成可分发 Agent Skill；
- 生成 HTML 演示文稿和知识图谱；
- 原子写入、文件锁、运行状态和崩溃安全 mutation。

### 5.2 哪些代码值得直接用

| 源码位置 | 价值 | 建议 |
|---|---|---|
| `openkb/converter.py`、`url_ingest.py` | 多格式/URL 转 Markdown | 直接用 OpenKB CLI，不重写解析器 |
| `openkb/indexer.py` | PageIndex 长 PDF 处理 | 用于教材、规范、论文离线摄入 |
| `openkb/agent/compiler.py` | summary/concept/entity 编译 | 教师侧离线运行，结果必须审核 |
| `openkb/schema.py`、`frontmatter.py` | Wiki/OKF 数据契约 | 作为 Dream Agent 导入适配器的输入协议 |
| `openkb/locks.py`、`mutation.py` | 原子写和崩溃安全 | 保留在 sidecar 内，不必 TS 重写 |
| `openkb/lint.py`、`agent/linter.py` | 结构和语义健康检查 | 进入内容发布前质量门禁 |
| `skills/openkb/SKILL.md` | 只读 Agent 查询规则和注入防护 | 比通用 llm-wiki-skills 更适合生产查询 |

### 5.3 能否直接用

**作为教师离线工具：可以直接用。** v0.4.4 已提供 wheel 和 PyPI 安装，Python 3.10-3.13 + 模型配置后即可工作。

**作为学生在线知识 API：不能直接用。** 它当前是 CLI/本地文件系统，数据库存储和 Web UI 仍在 Roadmap；没有 OpenCamp 的多租户、课程发布版本、学生权限、审核状态和在线 SLA。

**作为 Dream Agent sidecar：最合适。** 教师或 CI 在独立工作目录运行 OpenKB，人工审核后把稳定条目导入 `data/knowledge`；学生请求不在 Web API 热路径调用 `openkb query`，这样避免 Python 服务耦合、额外 LLM 调用和内容被即时改写。

### 5.4 主要坑

- 项目自身标记 Alpha，API/目录结构仍可能变化。
- 依赖严格精确锁定是供应链优点，也是升级和平台兼容负担。
- PageIndex 的“vectorless/local”不等于不需要模型或没有成本；长文树构建和知识编译仍调用 LLM。
- 只把 Markdown 产物复制进 Dream Agent 不够，需要稳定 ID、来源版本、审核状态和课程版本映射。
- 模型改写 concept 页面可能覆盖人工编辑；发布流程必须基于 Git diff/PR，而不是自动直推公共知识。

## 6. nashsu/llm_wiki：完整桌面知识产品

### 6.1 它真正做什么

旧预研把它判断为“轻量脚本”是错误的。当前 v0.6.4 是完整跨平台桌面应用：

- Tauri v2 + Rust 后端；
- React 19 + TypeScript + Vite 前端；
- PDF/Office/EPUB/MOBI/网页剪藏解析；
- 两步摄入、可恢复队列、删除级联清理；
- Wikilink 图谱、四信号相关度、Louvain 社区检测；
- 关键词 + 可选 LanceDB 向量混合检索；
- Chat Agent、Agent Skills、审核队列、Deep Research；
- 本地 HTTP API `127.0.0.1:19828`，Token 鉴权；
- MCP Server，提供项目、文件、审核、搜索、聊天、图谱和 source rescan 工具。

它的优势是把 Karpathy 的抽象理念变成可视化、可操作的教师桌面工作台，而不是只提供一套目录规范。

### 6.2 能否直接用

**作为个人/教师应用：四者中最直接。** v0.6.4 发布了 Windows portable ZIP、EXE、MSI，以及 macOS/Linux 包，不需要本机编译 Rust。

**作为外部 Agent 的知识后端：可以松耦合使用。** 桌面 App 运行时，Dream Agent 或 Codex 可通过 Token API/MCP 执行只读搜索、读取和图谱查询。必须明确 App 进程在线、端口、Token 管理和故障降级。

**作为 OpenCamp 服务端核心：不建议。** 它是本机单用户桌面架构，不是 2000 人课程知识服务；让生产 Web 服务依赖某台教师电脑上的 Tauri 进程不可接受。

### 6.3 许可证影响

仓库 `LICENSE` 是 GPL-3.0，GitHub API未能自动识别。若直接复制/链接其实现到发布的软件，需要评估 GPL 对整个组合分发的义务。更稳妥的方式是：

- 把官方桌面程序作为独立教师工具；
- 通过公开 HTTP API/MCP 或导出的 Markdown/ZIP 交换数据；
- 不把 Rust/TS 源码直接搬进 Dream Agent，除非项目明确接受 GPL 兼容分发。

这不是法律意见，正式发布前应由项目负责人确认许可证策略。

### 6.4 本次发现的工程坑

- 提交的根 `package-lock.json` 与 `package.json` 不同步，`npm ci` 报缺少 `@emnapi/core`、`@emnapi/runtime`，且 `@emnapi/wasi-threads` 版本不匹配。
- 仓库 CI 使用 `npm install` 而不是 `npm ci`，能绕过严格锁校验，但降低构建可复现性。
- 从源码构建需要 Node 20+、Rust 和平台原生依赖，完整 Tauri/Rust 构建明显重于 OpenKB。
- 本地 API 虽只监听 loopback 且支持 Token，但开启“本机无认证”后，同机任意进程/网页都可能调用，应默认关闭。
- 文档、图谱、向量、研究、Agent、shell 审批均在一体化应用内，后续升级和数据迁移要先备份项目 ZIP。

## 7. 横向选型

| 维度 | DeepTutor | llm-wiki-skills | OpenKB | nashsu/llm_wiki |
|---|---|---|---|---|
| 面向学生教学 | 强 | 无 | 弱 | 中，偏知识问答 |
| 文档摄入 | 强，多 RAG 引擎 | 依赖 Agent | 强，CLI | 强，桌面 GUI |
| 持久 Wiki | 可连接/读写 Obsidian | 核心目录规约 | 核心产物 | 核心产物 |
| 掌握度/复习 | 强 | 无 | 无 | 无系统课程 Gate |
| 教师审核 | 通用工作区能力 | 结构变更确认 | 依赖 Git/人工流程 | 有审核队列 |
| 学生多租户 | 有一定 Web/多用户基础 | 无 | 无 | 无，单机桌面 |
| API/MCP | WebSocket/API/工具生态 | 无 | CLI + Skill | 本地 HTTP + MCP |
| OS 真实验/OJ | 无 | 无 | 无 | 无 |
| 最佳部署位置 | 独立 Tutor POC | Agent 指令层 | 教师/CI 离线 sidecar | 教师桌面 |
| 与 Dream Agent 主栈冲突 | 高 | 低 | 中 | 高 |

## 8. 两条组合路线

### 8.1 路线 A：一周内演示，不改源码

这是证明“知识会积累 + Tutor 会教学”的最低成本方案：

1. 用 OpenKB 或桌面 LLM Wiki 导入一个 OS 主题的可信资料，例如虚拟内存：教材章节、rCore 文档、实验说明、常见错误。
2. 人工检查生成的 summary/concept/source 引用。
3. 把生成的 `wiki/` 目录作为 Obsidian/Markdown vault 连接到 DeepTutor。
4. 在 DeepTutor 中运行 chat、deep_solve、mastery_path，确认回答能读取 Wiki，路径能生成知识点并推进复习。
5. OS 实验仍在 Dream Agent 提交，由现有 Judge 返回 CE/WA/TLE/RE/AC；不要经 DeepTutor 本机沙箱判分。

这条路线能验证体验，但会有三个割裂：DeepTutor 不认识 Dream Agent 学生 ID，AC 不会自动回写 mastery，教师有两套界面。它只能是 POC。

### 8.2 路线 B：OpenCamp 生产架构

```text
教师资料 / 课程仓库 / 实验规范
  -> OpenKB 离线编译（不在学生请求热路径）
  -> Git diff + lint + 教师审核
  -> Dream Agent 课程知识包（稳定 ID、来源、版本、审核状态）
  -> Dream Agent Tutor/Quiz/Plan
  -> 独立 Judge Worker / Docker / QEMU
  -> 确定性 Evidence + Gate
  -> mastery / weak points / review queue
```

职责冻结：

| 层 | 采用什么 | 不采用什么 |
|---|---|---|
| 知识生产 | OpenKB CLI + Git 审核；llm-wiki 规则作为补充 | 学生请求时自动改公共 Wiki |
| 学生入口 | Dream Agent Next.js/API | 再嵌一套 DeepTutor 或 Tauri UI |
| 教学策略 | 移植 DeepTutor mastery/policy/scheduler 思路 | LLM 自报掌握度 |
| 学习数据 | Dream Agent Prisma/事件证据 | 写入公共 Wiki |
| 实验判定 | Dream Agent 独立 Judge Worker | DeepTutor exec 或桌面 shell |
| 教师桌面 | nashsu/llm_wiki 可选；通过导出/API 松耦合 | 让它承担在线 SLA |

## 9. 最小数据协议

OpenKB 原生页面只有 summary/concept/entity 等知识语义；课程系统还需一层受控元数据。建议每个发布条目至少有：

```yaml
id: os.vm.address-translation
type: concept
course_version: 2026-summer-os
status: approved
source_refs:
  - rcore-tutorial-v3:ch4
prerequisites:
  - os.vm.virtual-address
misconceptions:
  - os.vm.page-offset-is-translated
question_ids:
  - q.vm.001
lab_gate_ids:
  - lab.vm.translate.01
reviewed_by: teacher-id
reviewed_at: 2026-07-17
```

OpenKB 负责生成候选知识正文和来源关系，Dream Agent 导入器负责校验 ID、课程关系和发布状态。未审核条目只能进入教师预览，不能被学生 Tutor 当作权威课程知识。

## 10. 建议的四周纵向切片

### 第 1 周：知识生产样板

- 固定 Python 3.12 环境和 OpenKB v0.4.4。
- 只选“虚拟内存/地址转换”一个主题，导入 3-8 份可信资料。
- 建立生成、lint、人工审核、Git 提交四步流程。
- 记录每次 ingest 的调用次数、时间、费用和人工修改量。

### 第 2 周：Dream Agent 导入与引用

- 写 OpenKB Wiki -> `data/knowledge` 的单向导入器。
- 校验 frontmatter、wikilink、来源存在性和稳定 ID。
- `/api/chat` 返回 `knowledgeEntryIds/sourceRefs`，UI 可展开引用。
- 不引入在线 Python 服务。

### 第 3 周：Mastery 与真证据打通

- 把 DeepTutor 的 per-type gate、next-objective 和复习调度移植到 TS。
- choice/short 题由服务端评分；concept 质性评估只作辅证。
- `LabGateProgress.passed` 仍只接受 Judge AC/教师复核等受保护证据。
- 失败类型映射到 misconception -> concept -> 微单元/复习题。

### 第 4 周：受控实验生成

- 从教师批准的实验模板生成参数化变体，不自由生成整仓实验。
- 每个候选实验必须通过 schema、基准解、隐藏测试、资源限制和人工抽检。
- 做 5-10 名学生灰度，比较“普通 RAG 答疑”和“Wiki + mastery + OJ”在完成率、提示次数、AC 时间和引用正确率上的差异。

## 11. Go / No-Go 标准

达到以下条件再扩大到整门 OS 课程：

- 95% 以上发布页面能追溯到存在的原始来源；
- 抽检关键事实没有未经来源支持的新增结论；
- 同一批资料重复编译的结构差异可解释、可审核；
- 学生答案引用能定位到具体课程条目和来源；
- 任何 LLM 输出都不能直接写 AC/Gate passed；
- Judge 结果能触发确定性 mastery 更新和下一步任务；
- 教师每新增一份资料的审核成本可接受；
- OpenKB/模型不可用时，已发布知识与 Judge 仍可服务学生。

如果做不到这些，不应继续增加 GraphRAG、多 Agent 或自动实验生成范围。

## 12. 本次实际验证

已完成：

- 四仓库默认分支源码成功克隆，HEAD 与 GitHub 一致；
- DeepTutor 和 OpenKB Python 源码在本机 Python 3.14 下通过 `compileall` 语法检查；
- 四个克隆仓库最终保持 clean，验证过程未改源码或锁文件；
- GitHub release、资产、许可证、依赖、CI、入口、测试文件和核心模块均已核对；
- 确认桌面 LLM Wiki v0.6.4 有 Windows portable/EXE/MSI 等预编译包；
- 确认 OpenKB v0.4.4 有 wheel/sdist；
- 确认 DeepTutor v1.5.1 通过 PyPI/Docker/源码发布，但 GitHub release 无二进制资产。

未完成及原因：

- 未跑 DeepTutor/OpenKB 全量测试：本机只有 Python 3.14，OpenKB 声明支持到 3.13，且当前未安装项目依赖/pytest；
- 未跑 nashsu/llm_wiki 的 Tauri/Rust 构建：本机无 Rust；
- `nashsu/llm_wiki npm ci` 已实际执行并因锁文件不同步失败；随后尝试不改锁文件安装依赖，但网络安装长时间无输出，已终止，仓库仍 clean；
- 未启动 DeepTutor Docker：Docker Desktop daemon 当前未运行。

因此，“源码结构和发布路径可用”已经确认；“四者在本机完整端到端运行”尚未确认。下一步应在固定 Python 3.12、Node 20/22、Rust stable 和已启动 Docker 的专用开发环境做可重复验收。

## 13. 对旧预研的修正

本报告取代 2026-07-16 文档中所有带“源码下载受阻/仓库待确认”的判断，尤其修正：

1. `nashsu/llm_wiki` 是重型桌面应用，不是轻量脚本；
2. OpenKB 是成熟度仍为 Alpha 的本地 CLI/知识编译器，不是现成多租户知识服务；
3. DeepTutor 的 mastery 已有确定性 per-type gate 和间隔复习实现，不只是抽象思想；
4. DeepTutor 能直接连接 Markdown/Obsidian Wiki，因而存在无需改源码的组合 POC；
5. `llm-wiki-skills` 可直接采用的是规程，不是代码运行能力；
6. 四者仍都不提供 OS 真实验生成、隔离判题和可信晋级证据，这部分必须由 OS 实验框架/Dream Agent Judge 承担。

## 14. 最终建议

**短期演示**：直接用 nashsu/llm_wiki portable 展示知识摄入与图谱；用 DeepTutor 独立实例展示 mastery 教学；用一个 Markdown Wiki 目录把两者串起来。

**产品开发**：Dream Agent 继续做唯一学生入口和证据系统；OpenKB v0.4.4 固定为教师侧离线知识编译 sidecar；吸收 DeepTutor 的 `learning/policy/scheduler`；保留现有独立 Judge；llm-wiki-skills 只提炼规则；桌面 LLM Wiki 通过导出/API/MCP 可选接入，不复制 GPL 源码。

**最重要的边界**：

> Wiki 负责“知识是否结构化、可追溯、可维护”；Tutor 负责“下一步怎么教”；Judge 负责“学生是否真的会做”；教师负责“什么可以公开发布”。四个职责不能让同一个 LLM 一票通过。
