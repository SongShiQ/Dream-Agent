# M5 证据索引

**日期**：2026-07-14  
**范围**：M5 灰度、容量与运营验收；不包含 M6 专业 integration OJ。  
**当前结论**：M5 本地工具链、演练与交接材料已基本闭环；生产完成证据仍缺真实 Linux Docker judge host smoke 与真实 30 人 cohort 归档。

## 1. 当前状态

| 类别 | 状态 | 证据 |
|---|---|---|
| 本地 unit OJ 垂直链路 | 已验证 | `npm run judge:smoke` 通过，五个 unit gate AC 并解锁 `lab1-batch` |
| Docker 容器契约 | 已实现，待实机 | `scripts/smoke-docker-unit-oj.ts` 与 `docker/unit-judge/README.md` |
| 运营风险队列 | 已实现 | `/api/ops/risk`、`/ops`、风险状态与 CSV/JSON 导出 |
| 灰度快照 | 已实现 | `/api/ops/release`、`ops:release-archive` |
| 30 人演练 | 已验证 | `npm run ops:release-rehearsal` 通过，且 rehearsal 数据清理为 0 |
| readiness audit | 已实现 | `npm run ops:m5-readiness` 当前正确输出 `NOT_READY` |
| 真实 Docker host smoke | 缺失 | 需在 Linux judge host 执行 `npm run judge:docker-smoke` |
| 真实 30 人 cohort 归档 | 缺失 | 需执行 `npm run ops:release-archive -- --cohortId=<真实 cohortId> --target=foundation_200 --docker-verified` |

## 2. 核心运行材料

| 文档 | 用途 |
|---|---|
| [M5 灰度、容量与运营运行手册](./2026-07-14-m5-grey-release-runbook.md) | 日常运营、风险处理、事故处理 |
| [M5 灰度放量验收清单](./2026-07-14-m5-release-acceptance-checklist.md) | 放量前命令与门槛 |
| [M5 每周漏斗复盘模板](./2026-07-14-m5-weekly-funnel-review-template.md) | 每周复盘结构 |
| [M5 外部验收交接单](./2026-07-14-m5-external-validation-handoff.md) | 交给技术/运营执行真实验收 |
| [M5 证据索引](./2026-07-14-m5-evidence-index.md) | 当前证据总览 |

## 3. 关键命令

| 命令 | 用途 | 是否生产证据 |
|---|---|---|
| `npm run judge:smoke` | 本地 `local-rules` unit OJ 端到端 smoke | 否，证明本地链路 |
| `npm run judge:docker-smoke` | Linux Docker judge host 生产 smoke | 是，必须在 Linux judge host |
| `npm run ops:release-rehearsal` | 临时 30 人 cohort 演练 | 否，证明流程可跑通 |
| `npm run ops:release-archive -- --cohortId=<真实 cohortId> --target=foundation_200 --docker-verified` | 真实 cohort 快照归档 | 是 |
| `npm run ops:m5-readiness -- --cohortId=<真实 cohortId> --docker-verified --require-archive` | M5 最终 readiness audit | 是，必须输出 `READY_FOR_M6_PLANNING` |

## 4. 已有工作日志

| 日志 | 主题 |
|---|---|
| `docs/日志/2026-07-14-m5-judge-health-metrics.md` | judge health 与指标 |
| `docs/日志/2026-07-14-m5-grey-runbook-risk-queue.md` | runbook 与风险队列 |
| `docs/日志/2026-07-14-m5-ops-dashboard.md` | 运营面板 |
| `docs/日志/2026-07-14-m5-risk-resolution.md` | 风险处理状态 |
| `docs/日志/2026-07-14-m5-cohort-export-review.md` | cohort 筛选、风险导出、周复盘 |
| `docs/日志/2026-07-14-m5-release-snapshot.md` | 灰度验收快照 |
| `docs/日志/2026-07-14-m5-release-rehearsal.md` | 30 人演练 |
| `docs/日志/2026-07-14-m5-docker-host-smoke-script.md` | Docker judge 主机 smoke 脚本 |
| `docs/日志/2026-07-14-m5-release-archive.md` | 真实 cohort 归档工具 |
| `docs/日志/2026-07-14-m5-readiness-audit.md` | readiness audit |
| `docs/日志/2026-07-14-m5-external-validation-handoff.md` | 外部验收交接 |
| `docs/日志/2026-07-14-m5-readiness-audit-polish.md` | readiness audit 覆盖优化 |

## 5. 进入 M6 前必须补齐

1. Linux judge host：

   ```bash
   npm run judge:docker-smoke
   ```

2. 真实 30 人 cohort：

   ```bash
   npm run ops:release-archive -- --cohortId=<真实 cohortId> --target=foundation_200 --docker-verified
   ```

3. 最终 readiness：

   ```bash
   npm run ops:m5-readiness -- --cohortId=<真实 cohortId> --docker-verified --require-archive
   ```

只有第 3 条输出 `READY_FOR_M6_PLANNING`，才进入 M6。

