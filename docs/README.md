# Dream Agent 文档导航

本目录保存项目的决策依据、实施计划、教师汇报材料和工程证据。根目录 [README](../README.md) 面向首次访问者，本页面向需要继续核查设计与实现的读者。

## 建议阅读顺序

1. [最新教师汇报作战手册](reports/宋红-AgentOS导学与基础阶段进展汇报作战手册-2026-07-21.md)：项目定位、当前进展、开源项目吸收情况、卡点和下周计划。
2. [四个开源项目源码审计](research/2026-07-17-four-repos-source-audit.md)：DeepTutor、llm-wiki-skills、OpenKB 和 llm_wiki 的源码级结论。
3. [最终组合后的工作方案](plans/2026-07-20-final-combination-next-work-plan.md)：分层组合、工程阶段、验收标准和风险控制。
4. [工作日志](日志/2026-07-23-workspace-github-sync.md)：最近一次代码、测试和发布整理记录。

## 目录说明

| 目录 | 内容 | 适合谁阅读 |
|---|---|---|
| `reports/` | 面向教师和组会的正式汇报材料 | 指导教师、项目负责人 |
| `research/` | 开源项目、复用方式和技术路线调研 | 教师、研发人员 |
| `plans/` | 分阶段实施方案和验收条件 | 项目负责人、研发人员 |
| `adr/` | 关键架构决策记录 | 研发人员 |
| `operations/` | 部署、发布、外部验收和运行说明 | 运维与研发人员 |
| `examples/` | OpenKB 等数据契约的示例文件 | 内容维护人员 |
| `日志/` | 按日期记录的工程变更和验证证据 | 需要追溯过程的读者 |

## 关键专题

### 开源项目吸收

- [四项目源码审计](research/2026-07-17-four-repos-source-audit.md)
- [教师 5 分钟汇报提纲](research/2026-07-17-teacher-briefing.md)
- [参考项目复用评估](research/2026-07-16-refs-reuse-assessment.md)

### 导学与基础阶段

- [最终组合后的工作方案](plans/2026-07-20-final-combination-next-work-plan.md)
- [OS 总览与中断主题包日志](日志/2026-07-21-os-overview-topic-pack.md)
- [进程与调度主题包日志](日志/2026-07-22-process-scheduling-topic-pack.md)
- [知识卡阅读闭环日志](日志/2026-07-21-knowledge-card-reader-flow.md)

### 内容治理

- [OpenKB 导入与发布门禁计划](plans/2026-07-19-openkb-import-release-gate.md)
- [内容审核决策工作流](plans/2026-07-20-content-review-decision-workflow.md)
- [统一内容发布检查日志](日志/2026-07-21-content-release-check.md)

### 后续实验

- [受控 OS 实验生成计划](plans/2026-07-19-controlled-os-experiment-generation.md)
- [学生形成性实验流程](plans/2026-07-19-student-formative-experiment-flow.md)

实验文档记录的是框架和后续接口，不代表真实 OS/QEMU Judge 已进入当前交付范围。

## 文档维护规则

- 正式对外汇报放入 `reports/`。
- 源码调研和技术比较放入 `research/`。
- 尚未实施或正在实施的方案放入 `plans/`，并明确状态。
- 每个完成的工程切片在 `日志/` 记录范围、验证结果、已知边界和下一步。
- 不在文档中记录真实 API 密钥、数据库凭据或学生隐私数据。
