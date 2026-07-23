# ReviewSchedule 历史回填方案

**日期**：2026-07-19  
**状态**：dry-run/apply 工具已实现并验收

## 目标

让在 ReviewSchedule 上线前已经完成过 high-stakes Foundation 小测或 OJ AC 的学生，也能获得初始复习计划；回填不能把 practice、STATIC、WA 或普通提交当成正式证据。

## 规则

- Foundation 只读取 `mode=high_stakes` 且已提交的 `passed/failed` attempt。
- Gate 只读取 `verdict=AC` 的 CodeSubmission。
- 每个学员、课程版本、目标类型和目标 ID 只保留最新证据。
- 已有 ReviewSchedule 的目标跳过，避免重复增加 repetition 或延长日期。
- 默认 dry-run；`--apply` 逐条二次检查后写入。

## CLI

```bash
npm run review:backfill
npm run review:backfill -- --cohort 2026-summer-os-main --apply
```

## 后续

- 把回填报告纳入发布前检查。
- 为历史证据增加 checksum/审计批次号，便于重放和回滚。
- 对超大 cohort 增加分页和批量 upsert。
