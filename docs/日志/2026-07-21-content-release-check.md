# 内容发布门禁与 Foundation 题库证据完整性工作日志

**日期**：2026-07-21  
**状态**：统一发布检查已完成；Foundation 小测跨主题补题漏洞已修复；全量回归通过

## 本次目标

- 收口 2026-07-20 计划中的统一 `content:release-check`，确认 CLI、API、测试和生产构建均可用。
- 继续优化不依赖陈老师排版或内容审批的导学/基础阶段工程能力。
- 检查 high-stakes Foundation quiz 是否真的只使用本微单元证据，并把题目覆盖纳入发布门禁。
- 保持教师审核边界：本次不批准知识卡、不发布实验模板、不改变 mastery 或 Lab Gate 规则。

## 开源项目建议的实际吸收

- `llm-wiki-skills` 的“来源、审核、lint、发布前阻断”原则已转为统一内容发布检查，而不是停留在文档规范。
- OpenKB 的离线知识编译边界已落实为 manifest/source contract 检查，OpenKB 仍不进入学生在线请求热路径。
- DeepTutor 的 mastery/policy 思路继续按确定性证据实现：Foundation mastery 只能来自本微单元的 high-stakes quiz，不能由无关题目或 Tutor 对话替代。
- nashsu/llm_wiki 仍只作为外部教师工具参考，本次没有复制其 GPL-3.0 源码。

## 统一内容发布检查

### 新增和接入

- `lib/content/release-check.ts`：聚合知识卡、实验模板、内容审核决策、OpenKB manifest 和 Foundation 题库覆盖。
- `scripts/content-release-check.ts`：默认 development，`--release` 切换发布模式，输出统一 JSON，并以退出码表达 pass/fail。
- `app/api/ops/content-release/route.ts`：`GET /api/ops/content-release?mode=development|release`，复用现有受保护 ops token 边界。
- `package.json`：新增 `npm run content:release-check`。
- `tests/content/release-check.test.ts`、`tests/api/content-release.test.ts`：覆盖模式差异、stale/pending 决策、OpenKB 来源和 API 鉴权。

### 模式合同

- development：draft、pending review、未应用决策和题库覆盖不足以 warning 暴露，不阻断开发；结构性 audit error 仍失败。
- release：draft、pending review、stale/pending decision、audit error、OpenKB 来源错误和 Foundation 题库不足都阻断。
- 输出包含 `decision`、`summary`、`issues[]`、稳定 `code`、目标类型、目标 ID、来源路径和严重级别，可供 CI、教师后台和归档复用。
- 默认只读，不自动修改 Git 内容文件，不自动批准或发布。

## Foundation 证据完整性修复

### 发现的问题

原 `pickFoundationQuestions` 在本微单元匹配题不足时，会从全题库补入任意题目。这样可能出现“用 Rust/进程题通过内存与虚存 mastery”的情况，违反 high-stakes 证据必须对应目标能力的边界。

此外，课程策略启用了 `alternateSetRequiredAfterFailure=true`。因此每个微单元不只需要首轮 5 题，还需要至少 10 道合格题，才能在首次失败后提供一套不重复的 5 题重测。

### 修复内容

- `lib/foundation/units.ts`
  - 新增纯函数 `selectFoundationQuestionSet`。
  - 只按当前微单元 `quizTags` 选题，彻底移除跨主题 fallback。
  - 只允许导学/基础题阶段：`pre_study_theory`、`pre_study_rust`、`pre_study_tools`、`basic`、`B1`、`B2`；排除 `professional`。
  - 匹配题少于 5 道时返回 `QUESTION_SET_INSUFFICIENT`，不创建不可信 attempt。
- `app/api/foundation/route.ts`：题量不足返回 422，并提供 `available` / `required`。
- `components/FoundationUnitPanel.tsx`：向学生明确显示题量不足，不把内容缺口伪装成网络错误。
- `lib/foundation/coverage.ts`：统一审计每个微单元的合格题数。
- `lib/content/release-check.ts`：根据 alternate-set 策略，以每单元 10 题作为发布门槛。
- `data/questions/foundation-topic-pack.json`：补充 10 道工具链、Cargo、Git 和编译错误定位基础题。
- `tests/foundation/question-coverage.test.ts`：从课程和题目权威源读取数据，保证六个微单元都达到双题组覆盖。
- `tests/foundation/units.test.ts`：证明无关题不会进入当前微单元，排除题不会被 fallback 绕过。

## 实际题库结果

本地运行数据库通过现有幂等 `content:import` 导入 10 道新增题。按基础允许阶段统计：

| 微单元 | 合格题数 | 双题组门槛 |
|---|---:|---:|
| OS 总览与中断 | 26 | 10 |
| 进程与调度 | 30 | 10 |
| 内存与虚存 | 21 | 10 |
| Rust 基础 | 52 | 10 |
| 所有权与错误处理 | 28 | 10 |
| 工具链与读代码 | 10 | 10 |

工具链单元从 0 道严格匹配题提升到 10 道；其余单元没有因排除 professional 题而跌破门槛。

## 验证结果

- `npm run content:import`：新增 10 道题，重复运行保持幂等。
- development release check：`pass`，0 error、49 warning、0 foundation coverage issue。
- release check：按预期 `fail`，48 个 blocker；目标类型只包括 `knowledge_card` 和 `experiment_template`，没有 Foundation 覆盖 blocker。
- 针对性回归：4 个测试文件、12 个测试通过；追加双题组门槛后 3 个测试文件、11 个测试通过。
- 全量 Vitest：40 个测试文件、162 个测试通过。
- `npm run typecheck`：通过。
- `npm run build`：通过；`/api/ops/content-release` 和 `/api/foundation` 均为动态路由。

## 当前真实阻塞

- release 模式的 48 个 blocker 来自既有知识卡/实验模板的 pending review、published pending 或 draft 状态，需要教师内容判断，不能由工程代码代批。
- development 模式剩余 49 个 warning，其中包含知识卡待审、实验模板待审/未发布，以及 1 个缺少检索标签的内容 warning。
- 当前没有 foundation 题库覆盖 blocker，没有 pending/stale content decision。
- 本次没有改变任何内容的 reviewer、reviewed_at 或 publication status。

## 边界与风险

- 题量达标只能证明“可组成两套同主题测验”，不能证明题目教学质量已经由教师认可。
- 当前题目数据仍按 content 幂等导入，尚未像知识卡一样具备独立 reviewer/provenance 字段；教师题目治理可后续单独设计，不在本次扩面。
- 选题当前按难度降序和稳定 ID 排序，可重复但还没有做难度分层配比；下一步可在不改变 mastery 证据边界的前提下加入蓝图抽样。
- 工作树仍包含此前各切片的大量未提交改动，本次未创建 commit，也未回滚用户已有修改。

## 下一步

优先继续不依赖教师审批的基础阶段工程优化：

1. 为 Foundation quiz 增加可机器检查的“题目蓝图”，限制每套题的知识点和难度分布，避免只抽同一标签下最难的 5 题。
2. 在提交结果中返回按知识点聚合的错误摘要，稳定映射到知识卡和补弱任务；不让 LLM 自由决定 mastery。
3. 用虚拟内存/地址空间做一次真实浏览器纵向验收：问题引用 -> 微单元小测 -> 失败补弱或通过 -> ReviewSchedule -> Dashboard 下一任务。
4. 继续保持 release 模式对教师待审内容的诚实阻断，不自行批准 48 个现有 blocker。

