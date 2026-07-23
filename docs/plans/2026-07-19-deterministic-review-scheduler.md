# Deterministic Review Scheduler 方案

**日期**：2026-07-19  
**状态**：本轮实现完成并通过验证  
**来源思路**：吸收 DeepTutor 的 spaced repetition/policy，但保留 Dream Agent 的正式证据边界

## 目标

把 Foundation 小测和 OJ AC 变成可审计的复习证据事件，生成可持久化的到期任务，并将到期复习接入 Dashboard。

## 规则

- 失败证据：`repetition=0`、`dueDate=today`，立即复习。
- 连续通过：间隔 `1/3/7/14/30` 天，超过 30 天后保持 30 天上限。
- Foundation `practice` 通过只更新复习调度，不改变 `mastered`。
- Foundation `high_stakes` 通过才会影响正式微单元状态。
- OJ `AC` 创建/推进 Gate 复习任务；非 AC 不得创建 passed 或 mastered。
- 必修 Foundation 未全部 mastered 时，任何到期复习都不能抢占可执行的必修单元。

## 数据与接口

- Prisma `ReviewSchedule`：目标类型、证据类型/ID、重复次数、间隔、到期日和最后证据。
- `lib/progress/review-scheduler.ts`：纯调度算法、证据 upsert、到期读取。
- `buildStudentDashboard` 返回 `reviewQueue`，主任务策略识别 `review:<targetType>:<targetId>`。
- `FoundationUnitPanel` 的复习小测使用 `highStakes=false`，界面明确“不改变 mastered”。

## 非目标

- 不让 LLM 直接写复习日期或掌握度。
- 不把到期复习完成态伪装成 OJ AC/课程晋级证据。
- 本轮不接入复杂 FSRS 参数拟合；先用可解释的固定间隔，后续用真实数据校准。

## 后续

1. 为复习完成、跳过和 snooze 增加显式事件记录。
2. 将复习队列纳入教师运营指标，区分 overdue、completion 和 re-failure。
3. 用 5-10 名学生灰度数据校准间隔和不同题型的复习策略。
