# 2026-07-14 M5 阻塞审计

## 背景

继续按计划顺序执行。当前计划要求 M5 完成后才能进入 M6；M5 的本地实现、演练、归档、交接与 readiness audit 已经多轮收口。本次再次复核当前状态，确认剩余缺口不再是本地编码或文档能替代的工作，而是外部事实验收。

## 当前审计结果

执行：

```bash
npm run ops:m5-readiness -- --cohortId=2026-summer-os-main
```

结果按预期为 `NOT_READY`：

- pass=16
- warn=1
- fail=2

fail 项：

1. `真实内测 cohort 至少 30 人`
   - 当前默认 cohort：`2026-summer-os-main`
   - 当前人数：7 人
   - 需要真实 30 人内测 cohort。
2. `Linux Docker judge host 已实机验收`
   - 当前未传入 `--docker-verified`
   - 需要在真实 Linux judge host 上运行 `npm run judge:docker-smoke`。

warn 项：

- `真实 cohort 放量快照已归档`
  - 当前没有真实 release review 归档。
  - 需要真实 cohort 执行 `npm run ops:release-archive -- --cohortId=<真实 cohortId> --target=foundation_200 --docker-verified`。

## 已具备的本地证据

- M5 证据索引：`docs/operations/2026-07-14-m5-evidence-index.md`
- M5 外部验收交接单：`docs/operations/2026-07-14-m5-external-validation-handoff.md`
- readiness audit：`scripts/audit-m5-readiness.ts`
- Docker host smoke 脚本：`scripts/smoke-docker-unit-oj.ts`
- 真实 cohort 归档脚本：`scripts/archive-release-snapshot.ts`
- 30 人演练脚本：`scripts/rehearse-release-snapshot.ts`

## 阻塞判断

同一阻塞条件已经连续多轮出现：

1. 缺真实 Linux Docker judge host smoke；
2. 缺真实 30 人 cohort 归档；
3. readiness audit 因上述外部事实输出 `NOT_READY`。

这些事项需要外部环境或真实运营数据，不能通过继续本地编码真实完成。继续本地新增文档或脚本只会重复包装同一阻塞，不应提前进入 M6。

## 恢复条件

恢复推进时执行：

```bash
npm run judge:docker-smoke
npm run ops:release-archive -- --cohortId=<真实 cohortId> --target=foundation_200 --docker-verified
npm run ops:m5-readiness -- --cohortId=<真实 cohortId> --docker-verified --require-archive
```

第三条输出 `READY_FOR_M6_PLANNING` 后，才进入 M6 专业 integration OJ 规划。

