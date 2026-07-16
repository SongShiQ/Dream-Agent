# 2026-07-14 M5 证据索引

## 背景

继续按计划顺序执行，仍处于 M5 收口阶段。M5 的运行文档、脚本和日志已经较多，本次新增统一证据索引，区分“本地演练证据”和“生产完成证据”，避免后续误把 rehearsal / dry-run 当作真实灰度验收。

## 变更

1. 新增 `docs/operations/2026-07-14-m5-evidence-index.md`
   - 汇总 M5 当前状态；
   - 列出核心运行材料；
   - 列出关键命令及其是否属于生产证据；
   - 列出已有 M5 工作日志；
   - 明确进入 M6 前必须补齐的三条命令：
     1. `npm run judge:docker-smoke`
     2. `npm run ops:release-archive -- --cohortId=<真实 cohortId> --target=foundation_200 --docker-verified`
     3. `npm run ops:m5-readiness -- --cohortId=<真实 cohortId> --docker-verified --require-archive`

2. 更新文档入口
   - `docs/operations/2026-07-14-m5-grey-release-runbook.md` 增加证据索引链接。
   - `docs/operations/2026-07-14-m5-release-acceptance-checklist.md` 增加证据索引链接。

3. 更新 readiness audit
   - `scripts/audit-m5-readiness.ts` 将证据索引纳入必备文件检查。

## 验证

- `npm run ops:m5-readiness -- --cohortId=2026-summer-os-main`：按预期返回 `NOT_READY`。
  - pass=16
  - warn=1
  - fail=2
  - fail 仍是外部事实未满足：
    1. 当前默认 cohort 不足 30 人；
    2. 未传入 `--docker-verified`。
- `npm run typecheck`：通过。
- `npm test`：通过，24 files / 100 tests。
- `npm run judge:smoke`：通过，五个 unit gate 全部 AC，`lab1-batch` 解锁。
- `npm run ops:release-rehearsal`：通过。
- `npm run ops:release-archive -- --cohortId=2026-summer-os-main --target=foundation_200 --dry-run --allow-small`：通过；仅为调试，不算真实归档。
- `npx prisma validate`：通过。
- `npm run judge:unit`：通过，无 queued job。
- 清理确认：`rehearsal students: 0`。
- `git diff --check`：通过；仅出现 Windows LF/CRLF 提示。

## 当前判断

M5 本地证据已经整理完成；readiness audit 继续正确显示当前不能进入 M6。剩余事项仍是：

1. 真实 Linux Docker judge host smoke；
2. 真实 30 人 cohort 归档；
3. 最终 readiness audit 输出 `READY_FOR_M6_PLANNING`。

