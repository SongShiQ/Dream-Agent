# ReviewSchedule 历史回填工作日志

**日期**：2026-07-19  
**状态**：已实现并完成 dry-run 验收

## 完成内容

- 新增 `selectLatestHistoricalEvidence`，过滤 practice、非 AC 和重复旧证据。
- 新增 `review:backfill` CLI，默认 dry-run，可按 cohort 过滤，apply 时再次检查数据库避免竞态重复写入。
- 复用现有 `recordReviewEvidence`，保持固定间隔和失败立即到期规则一致。

## 验收

- 全量测试：33 个文件、133 个测试通过。
- `npx tsc --noEmit`：通过。
- 本地 `npm run review:backfill`：成功，当前数据库没有待回填证据，未产生写入。
- 已记录 source、experiment 和 review 调度方案日志，临时验收数据均已清理。
