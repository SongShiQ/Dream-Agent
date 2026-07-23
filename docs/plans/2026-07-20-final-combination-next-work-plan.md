# AgentOS 最终组合后的后续工作方案

**日期**：2026-07-20
**状态**：按前两个阶段聚焦，待按工程切片实施
**目标系统**：面向 OS 等课程的学生自学系统

## 2026-07-22 实施进展

- 阶段 1 的统一内容发布检查已经落地：CLI、受保护 API、统一 JSON、development/release 模式和测试均完成。
- 发布检查现已覆盖知识卡、实验模板、内容审核决策、OpenKB manifest/source contract，以及 Foundation 题库双题组覆盖。
- 修复 Foundation 小测在题量不足时跨主题补题的问题；现在只使用本单元、导学/基础阶段题目，题量不足明确阻断。
- 因课程启用失败后 alternate set，每个必修微单元的发布门槛按两套各 5 题计算；当前六个单元均达到至少 10 题。
- 阶段 1 之后的基础纵向切片最新完整证据：41 个测试文件、168 个测试通过，typecheck/build 通过。
- release 模式当前仍因 48 个知识卡/实验模板审核状态 blocker 失败；这是教师内容决策，不是工程故障，也没有被代码绕过。
- Foundation 小测已增加确定性题目蓝图、知识点错误归因、学生可见知识卡补弱建议，以及服务端 locked/题集漂移门禁。
- 临时学生真实流程已验证：locked -> 前置完成 -> 题集摘要 -> failed 诊断 -> ReviewSchedule due -> 临时数据清理。
- 最近一次 Foundation 诊断现可从 AnswerRecord 重建，刷新 Foundation/主 Dashboard 后仍保留；发布检查同时输出标签缺口和难度分布，三个细标签已通过既有题目元数据补齐，当前 0 个 uncovered tags、0 个 Foundation coverage blocker。
- 最新全量回归：41 个测试文件、169 个测试通过，typecheck/build 通过。
- 浏览器纵向验收发现并修复了空 weakPoints 导致的 Rust 错误推荐、取消复习残留提示和 390px 标题栏逐字换行；主任务现与 Foundation in_progress 状态一致。
- `LabGateProgress` 初始化改为复合唯一键 upsert；5 路真实 HTTP 并发 `/api/labs` 全部 200，最终 11 行唯一进度；该并发切片回归为 42 个测试文件、172 个测试通过。
- Foundation 双题组覆盖进一步收紧为每个目标标签至少 2 题；当前 6 个单元的 `uncoveredTags` 和 `undercoveredTags` 均为 0，`/ops` 已在 390×844 显示并通过无横向溢出验收；最新回归为 42 个测试文件、173 个测试通过，typecheck/build 通过。
- Foundation 发布检查新增题目标签到学生可见知识卡的补弱覆盖；现有 OS/Rust/工具链页面补齐结构化 `question_tags`，工具链页增加编译错误排查内容。当前 `foundationUncoveredRemediationTags=0`；OS 总览真实临时学生全错后返回 `[K:trap-syscall]` 与 `[K:os-theory-01-overview]`，临时数据清理为 0；最新回归为 42 个测试文件、174 个测试通过，typecheck/build 通过。
- 首个“OS 总览与中断”纵向主题包已完成工程验收：3 个学习目标、3 个典型误区、3 个真实题目标签、2 张学生可见补弱卡和下一任务均进入同一数据契约；统一 release check 显示 1 个主题包、0 个结构问题，学生 Dashboard 在桌面和 390×844 下显示 5/5 学习地图且无文档级横向溢出。最新全量回归为 43 个测试文件、177 个测试通过，typecheck/build 通过。
- 主题包知识卡阅读闭环已完成：主题地图和失败诊断中的稳定 `[K:id]` 可直接打开完整 Markdown、来源和待审核提示，并可返回原单元或启动原有 high-stakes 小测；单纯读卡前后不创建 attempt、不改变 mastery。390×844 下文档宽度为 390px，从弹层可正常生成 5 题小测；最新全量回归为 44 个测试文件、181 个测试通过，typecheck/build 通过。
- “进程与调度”第二主题包已完成工程验收：3 个学习目标、3 个典型误区、`process`/`pcb`/`scheduling` 三个真实标签、2 张学生可见补弱卡和“内存与虚存”下一任务全部通过 5/5 校验。两个连续 OS 主题包均为 `ready=true`，统一发布检查为 2 个主题包、0 个结构问题；锁定单元可读卡但不能绕过前置启动小测。最新完整基线仍为 44 个测试文件、181 项通过，typecheck/build 通过。

下一工程切片继续服务导学/基础阶段：先审计“内存与虚存”的真实题目、误区、补弱卡和课程关系，证据满足后再形成第三个纵向学习地图；同时开始做基础题目质量抽检样板，不把题量达标等同于教学质量达标。真实 OS/QEMU 实验仍按当前意见暂缓。

## 组合定位

最终组合不采用“四个开源项目整仓拼接”，而采用分层复用：

| 层 | 主责任 | 采用来源 | Dream Agent 中的定位 |
|---|---|---|---|
| 知识生产 | 多格式资料摄入、Wiki 化、来源追踪、lint | OpenKB、llm-wiki-skills、可选 llm_wiki | 教师/CI 离线内容工具 |
| 教学运行 | 诊断、讲解、记忆、掌握度、下一任务 | DeepTutor 思路 | 学生唯一入口和学习状态机 |
| 实验判分 | OS 实验生成、隔离执行、隐藏测试、AC 证据 | 自研 OS 实验框架 | 可信能力证据 |
| 治理发布 | 教师审核、哈希防漂移、发布门禁、审计记录 | llm-wiki-skills 治理原则 + 当前实现 | 课程内容运营后台 |

关键边界保持不变：

- Wiki 或 Tutor 输出不能授予 mastery。
- Foundation mastery 只能来自 high-stakes quiz 证据。
- Lab Gate 只能来自受保护 Judge 的 `AC`。
- OpenKB 不进入学生在线请求热路径。
- nashsu/llm_wiki 只做教师桌面工具或导出来源，不复制 GPL-3.0 源码进 Dream Agent。
- Git 内容文件仍是课程内容权威源。

## 总体路线

```text
课程资料 / 教师经验 / 实验文档
  -> OpenKB / LLM Wiki 离线编译
  -> Git 内容包
  -> 内容审计 + 教师审核 + 发布门禁
  -> Tutor 引用式教学
  -> 诊断 / Foundation / 间隔复习
  -> 受控形成性实验
  -> 真实 OS Judge / QEMU / Hidden Tests
  -> AC 证据
  -> Mastery / Lab Gate / Dashboard 下一任务
```

这条路线的验收重点是“学生是否能被可靠地带到下一步”，而不是聊天体验本身。

## 阶段 1：统一内容治理 CI/PR 工具

**目的**：让知识卡、OpenKB 导入内容、实验模板在发布前有统一、可机器读取、可阻断 CI 的审计结果。

要做：

- 新增统一内容发布检查脚本，例如 `content:release-check`。
- 聚合知识卡 audit、实验模板 audit、pending content decisions、OpenKB manifest/source 检查。
- 区分开发模式与发布模式：开发允许 warning，发布阻断 stale、unreviewed、audit error、未注明来源、发布状态不一致。
- 输出 JSON 摘要，供 CI、PR 注释、教师后台和 release archive 复用。
- 保持 dry-run 为默认，不自动修改 Git 文件。

验收：

- 有 pending 决策时 release check 失败并指出文件和 action。
- draft/pending 内容在 release 模式下失败，在开发模式下只报警。
- reviewed 但缺 reviewer/time 的内容失败。
- OpenKB 导入内容缺 source 或引用孤儿失败。
- Vitest 覆盖主要失败类型。
- `npm run test`、`npm run typecheck`、`npm run build` 通过。

## 阶段 2：第一个真实 OS/rCore 实验纵向样板

**目的**：把“形成性预实验”推进到“真实代码提交 -> 隔离执行 -> Judge AC -> Lab Gate”的完整样板。

建议主题：虚拟内存 / 地址空间。理由是当前已有 `vm-address-translation-v1` 知识和预实验基础，便于从概念、练习、真实验连起来。

要做：

- 固定一个 baseline repository 或最小 rCore lab scaffold。
- 定义学生可见任务说明、public tests、hidden tests、参考实现哈希和测试契约。
- 新增 `integration_oj` worker 路径，支持 QEMU 或本地可复现实验命令。
- 实现 CPU、内存、时间、网络、文件访问策略的执行边界。
- 对 hidden tests 做签名或哈希登记，公开摘要，不泄露内容。
- Judge worker 使用独立 token 租约和最终 verdict 写入。
- 只有 `verdict=AC` 且 job 来源可信时更新 `LabGateProgress`。
- Dashboard 将失败日志映射到知识点和下一步补弱任务。

验收：

- 正确提交得到 `AC`，错误提交得到 `WA/TLE/RE/CE` 中合理 verdict。
- 学生 API 不能伪造 AC、judgeKind、gateId 或 hidden result。
- Lab Gate 只在受保护 Judge AC 后通过。
- QEMU/worker 日志只返回公开安全片段。
- 资源超限可稳定终止。
- 至少覆盖一个成功路径、三个失败路径和一个越权提交测试。

## 后置低投入配套

后续 OpenKB 生产流水线、DeepTutor 式教学细化、教师桌面 LLM Wiki 接入和运营看板都不作为近期主战场。原因是能进入专业阶段的学生已有基础，系统不需要在早期投入过多精力做细密导学和教师工具编排。

近期只保留这些低投入边界：

- OpenKB / LLM Wiki 只要能通过 manifest 或 Markdown/JSON 导入，不追求完整教师工作台。
- Tutor 只要求引用知识卡、承认资料不足、遵守 mastery 边界，不急着做复杂情感陪伴或全量个性化教案。
- Dashboard 只突出下一任务、Gate 状态和失败后的补弱入口，不急着做复杂运营分析。
- `/ops` 只服务内容审核、发布检查和 Judge readiness，不扩展成完整教务系统。
- nashsu/llm_wiki 保持外部教师工具定位，后续有真实教师使用需求时再补导出适配。

这些能力只有在不阻塞前两个阶段时才做，且每次只以“补足主线验收”为准。

## 推荐实施顺序

1. 统一内容治理 CI/PR 工具。
2. 真实 OS/rCore 实验纵向样板。
3. 只做必要的轻量配套：导入格式、Tutor 引用、Dashboard 下一任务、`/ops` 发布状态。

优先级理由：内容治理是后续所有知识和实验进入系统的闸门；真实 OS 实验是系统可信度的核心。专业阶段学生已经具备一定基础，系统应优先提供可信材料、可信判分和清晰下一步，而不是过早追求复杂导学和教师工具生态。

## 最近一个工程切片

下一刀建议只做“统一内容治理 CI/PR 工具”，不要同时开 QEMU worker。

范围：

- 新增 release check 聚合器和 CLI。
- 输出机器可读 JSON。
- 给知识卡、实验模板、content decisions、OpenKB manifest 做统一状态汇总。
- 增加测试。
- 更新日志。

不做：

- 不自动创建 PR。
- 不发布当前 draft 实验。
- 不引入新外部服务。
- 不改学生 mastery 规则。

完成后立刻进入真实 OS/rCore 实验样板。

## 两阶段交付定义

第一阶段交付完成时，系统应能回答：

- 当前课程内容是否能发布？
- 哪些知识卡或实验模板阻塞发布？
- 阻塞原因是 stale、pending、缺来源、审计 error，还是仍有未应用决策？
- CI 或教师后台能否读取同一份 JSON 摘要？

第二阶段交付完成时，系统应能证明：

- 学生提交的代码确实在受控环境运行过。
- hidden tests 没有泄露给学生。
- 资源限制和超时能工作。
- 只有受保护 Judge 写入的 `AC` 能让 Lab Gate 通过。
- 失败 verdict 能给出最小可用的补弱入口。

做到这两点后，AgentOS 对专业阶段就已经有核心价值：资料不乱、判分可信、路径不迷路。

## 风险与控制

| 风险 | 控制方式 |
|---|---|
| LLM 生成内容幻觉 | source refs、教师审核、release check、pending-review 标识 |
| 教师 UI 与 Git 权威冲突 | UI 只写决策，CLI/CI 通过 hash 应用 |
| 学生伪造学习证据 | mastery 只接受 high-stakes quiz 和受保护 Judge AC |
| hidden tests 泄露 | 只公开摘要，worker 侧读取真实测试 |
| OpenKB 输出格式变化 | 固定 manifest adapter，锁定版本，导入前 dry-run |
| llm_wiki 许可风险 | 只做外部工具和导出，不复制源码 |
| 工程面铺太大 | 每个阶段都做一个可验证纵向样板 |

## 工作日志纪律

后续每个实施切片都同步写入 `docs/日志/`，至少包含：

- 目标和范围；
- 修改文件和数据合同；
- API、CLI、测试、浏览器验证；
- 临时数据清理；
- 已知边界和风险；
- 下一步；
- Git commit 状态。
