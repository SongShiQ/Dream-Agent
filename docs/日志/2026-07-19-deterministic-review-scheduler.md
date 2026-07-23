# Deterministic Review Scheduler 工作日志

**日期**：2026-07-19  
**状态**：已实现，待真实学生灰度校准

## 完成内容

- 新增 `ReviewSchedule` Prisma 模型和迁移 `20260719170000_add_review_schedules`。
- 新增固定间隔调度：1/3/7/14/30 天；失败立即到期。
- Foundation 小测提交和 Judge AC 写入复习证据；调度失败不会回滚正式小测/Judge 结果。
- Dashboard 在 Foundation 全部达标后才把到期复习作为主任务；未完成必修单元仍优先。
- 复习小测使用 practice 模式，前端不再把 practice passed 显示成 mastered。

## 验证

- Prisma generate、migration deploy/status：通过。
- 全量测试：30 个文件、126 个测试通过。
- TypeScript 类型检查：通过。
- 固定间隔、跨月日期、失败重置、Foundation/OJ 优先级和 practice 不晋级均有测试。
- 数据库实测 `recordReviewEvidence`：通过生成 `repetition=1/due=2026-07-20`，随后失败重置为 `repetition=0/state=due/due=2026-07-19`；验收记录已清理。
- 浏览器实测学生 Dashboard：未完成 Foundation 仍是唯一主任务，同时显示“到期复习 1 项”；点击后打开 practice 小测并显示“不替代 mastered 证据”。临时 schedule 和 in-progress attempt 已清理。

## 限制

当前没有为已有历史答题自动回填复习计划，也没有真实学生复习灰度数据；下一步需要做一次显式 backfill/reconciliation，并在小规模 cohort 中校准间隔。
