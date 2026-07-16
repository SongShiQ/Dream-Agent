# 工作日志 · 方案内容复核

**日期**：2026-07-14  
**任务**：复核倒金字塔训练营、OJ Phase A/B 与详细工作方案的内容一致性和可执行性。

## 完成内容

- 复核 `2026-07-14-funnel-oj-phase-ab-design.md`、`2026-07-14-funnel-oj-detailed-work-plan.md`、`2026-07-14-lab-gates-oj-first.md`、`2026-07-14-lab-gates-ide-first.md`。
- 确认主方案方向成立：导学约 2,000 人、项目约 60 人的倒金字塔结构应以“低成本导学分流 + 可信证据 + unit OJ + 灰度运营”为主线。
- 修正 `lab-gates-oj-first` 中“Phase A 已落地”的口径：当前只能视为骨架已出现，仍缺 migration、可信身份、JudgeJob/JudgeRun、受保护 complete 通道和跨端个人进度。
- 修正 `lab-gates-ide-first` 中历史遗留的“清单/自报/静态分过关”表述，明确 IDE-first 只保留专业阶段编辑分工，过关标准以后以 OJ AC 或教师复核为准。
- 在详细工作方案 M0 中加入“文档口径冻结表”，明确各方案文档的优先级和用途，避免后续执行时误读历史草案。

## 复核结论

- 方案总体可执行，但必须先完成 M0/M1，不能直接进入 Docker OJ 或专业 integration OJ。
- 最重要的执行风险是“证据可信度”：`viewed`、`personal_done`、`mastered` 必须在数据和 UI 上分开。
- OJ 的交付口径应保持刚性：静态分析、AI 练习、页面打开和个人勾选都不能写入 passed。
- 旧 IDE-first 文档仍有价值，但只能作为“专业阶段不用网页多文件 IDE”的产品判断，不再作为过关规则来源。

## 验证

- 使用 `rg` 检查计划文档中与 Phase A、静态分、自报、localStorage、studentId、SQLite/PostgreSQL、Docker 和人数规模相关的表述。
- 使用 `git status --short` 确认本次只改动方案文档和新增日志，未触碰实现代码。

## 下一步

1. 先让教学/产品负责人确认 M0 参数：导学必修单元、五个基础 gate、cohort 节奏、项目候选人工复核规则、Linux Docker worker 可用性。
2. 确认后进入 M1-A：补齐并验证 Prisma migration，同时保留现有未提交代码改动。
3. M1-B/M1-C 紧随其后：从 session 推导 student、建立统一证据聚合与跨端 `DailyTaskProgress`。
