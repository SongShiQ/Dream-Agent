# AgentOS 最终组合后续方案工作日志

**日期**：2026-07-20
**状态**：规划完成，并按用户意见聚焦前两个阶段；未进行业务代码改动

## 本次目标

- 基于四仓源码审计、教师汇报结论和 Dream Agent 当前落地状态，整理最终组合后的后续工程方案。
- 明确各开源项目在系统中的职责边界。
- 选出下一阶段最高价值工程切片。
- 按用户要求及时记录工作日志。

## 参考上下文

- `docs/research/2026-07-17-four-repos-source-audit.md`
- `docs/research/2026-07-17-teacher-briefing.md`
- `docs/research/2026-07-16-effect-priority-conclusion.md`
- `docs/日志/2026-07-20-four-repo-recheck-and-handoff.md`
- 当前 `package.json` 中已有 OpenKB 导入、内容决策应用、实验审计/生成、复习回填和 Judge smoke 命令。

## 新增文档

- `docs/plans/2026-07-20-final-combination-next-work-plan.md`

## 方案结论

系统继续采用分层组合：

- OpenKB / llm-wiki-skills / 可选 llm_wiki 负责教师侧知识生产与治理。
- DeepTutor 只吸收教学状态机、mastery、memory、scheduler 思路。
- Dream Agent 保持学生唯一入口、证据库、Dashboard、Judge 和运营后台。
- 自研 OS 实验框架继续承担真实隔离执行、隐藏测试和可信 AC。

## 推荐下一刀

下一步优先做统一内容治理 CI/PR 工具：

- 聚合知识卡、实验模板、content decisions、OpenKB manifest 审计。
- 区分开发模式和发布模式。
- 输出机器可读 JSON 摘要。
- 让 stale、unreviewed、audit-blocked、缺来源、发布状态不一致在 release 模式下失败。
- 不自动创建 PR，不发布当前 draft 实验，不改 mastery 规则。

完成后再进入第一个真实 OS/rCore 实验纵向样板。

## 用户意见修订

用户确认后续应先专注前两个阶段：

- 统一内容治理 CI/PR 工具；
- 第一个真实 OS/rCore 实验纵向样板。

原因是进入专业阶段的学生已有一定基础，不需要系统在早期投入太多精力做详尽导学、复杂教师工具组织和重运营看板。

据此已修订方案文档：

- 将原阶段 3-6 降级为“后置低投入配套”。
- 推荐实施顺序改为前两个阶段优先。
- 增加“两阶段交付定义”，明确第一阶段回答内容能否发布，第二阶段证明真实实验可信判分。

## 验证

- 本次只新增方案和日志文档，未修改业务代码、数据模型或脚本。
- 已通过本地目录与文档读取确认现有研究材料和计划日志存在。
- 未运行测试、typecheck 或 build；下一次进入代码实现切片时再做对应验证。

## 边界

- 当前官方实验模板仍保持 draft/pending/formative，不在本次方案中发布。
- nashsu/llm_wiki 仍按 GPL-3.0 边界作为外部教师工具处理。
- OpenKB 仍定位为离线编译工具，不进入学生请求热路径。

## Git 状态

- 本次新增 2 个文档文件。
- 未创建 Git commit。

## 下一步

实施 `content:release-check` / 内容治理 CI 聚合器，并同步更新实现计划、测试结果和工作日志。
