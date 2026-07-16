# 2026-07-14 M5 readiness audit 覆盖范围优化

## 背景

继续按计划顺序执行，仍停留在 M5 收口阶段，不提前进入 M6。前序新增了外部验收交接单和 `ops:m5-readiness`，本次将这些最新材料纳入 readiness audit，避免最终审计遗漏交接文档或审计命令本身。

## 变更

1. 更新 `scripts/audit-m5-readiness.ts`
   - 必备文件检查新增：
     - `docs/operations/2026-07-14-m5-external-validation-handoff.md`
     - `scripts/audit-m5-readiness.ts`
   - npm script 检查新增：
     - `ops:m5-readiness`
   - pass 项不再显示无意义的“下一步”，只有 warn/fail 项展示后续动作。

## 验证

- `npm run ops:m5-readiness -- --cohortId=2026-summer-os-main`：按预期返回 `NOT_READY`。
  - pass=15
  - warn=1
  - fail=2
  - fail 原因仍是外部事实未满足：
    1. 默认 cohort 只有 7 人；
    2. 未传入 `--docker-verified`。
  - warn 原因：
    - 尚无真实 release review 归档。
- `npm run typecheck`：通过。
- `npm test`：通过，24 files / 100 tests。
- `npm run judge:smoke`：通过，五个 unit gate 全部 AC，`lab1-batch` 解锁。
- `npm run ops:release-rehearsal`：通过。
- `npm run ops:release-archive -- --cohortId=2026-summer-os-main --target=foundation_200 --dry-run --allow-small`：通过。
- `npx prisma validate`：通过。
- `npm run judge:unit`：通过，无 queued job。
- 清理确认：`rehearsal students: 0`。
- `git diff --check`：通过；仅出现 Windows LF/CRLF 提示。

## 当前判断

M5 的本地实现、演练、归档、交接与 readiness audit 都已能互相指向并自检。当前不能进入 M6 的原因没有变化：需要真实 Linux Docker judge host smoke 和真实 30 人 cohort 归档。

